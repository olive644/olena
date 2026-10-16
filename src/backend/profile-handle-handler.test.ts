import { expect, it } from "vitest";
import {
  createProfileHandleHandler,
  type HandleIdentity,
  type HandleRegistry,
} from "./profile-handle-handler";

function setup() {
  let value: HandleRegistry = {};
  let version = 0;
  const handler = createProfileHandleHandler({
    allowedOrigins: ["https://app.test"],
    ownerEmail: "owner@example.test",
    identify: async (request) => {
      const uid = request.headers.get("authorization");
      if (!uid) return undefined;
      return {
        uid,
        anonymous: uid === "guest",
        email:
          uid === "owner" || uid === "unverified" ? "owner@example.test" : "other@example.test",
        emailVerified: uid !== "unverified",
      } satisfies HandleIdentity;
    },
    consume: async () => true,
    store: {
      async read() {
        return { value: structuredClone(value), version: String(version) };
      },
      async write(next, expected) {
        if (String(version) !== expected) return false;
        value = structuredClone(next);
        version++;
        return true;
      },
    },
  });
  const call = (uid: string, username?: string, method = username === undefined ? "GET" : "POST") =>
    handler(
      new Request("https://app.test/api/profile-handle", {
        method,
        headers: {
          origin: "https://app.test",
          authorization: uid,
          "content-type": "application/json",
        },
        ...(method === "POST"
          ? { body: JSON.stringify({ username, creks: true, uid: "owner" }) }
          : {}),
      }),
    );
  return { call, handler };
}

it("reserva concorrente tem um único vencedor e repetição pelo dono é idempotente", async () => {
  const { call } = setup();
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, index) => call(`user${index}`, "aluno")),
  );
  expect(results.filter((value) => value.status === 200)).toHaveLength(1);
  expect(results.filter((value) => value.status === 409)).toHaveLength(7);
  const winner = results.findIndex((value) => value.status === 200);
  expect((await call(`user${winner}`, "aluno")).status).toBe(200);
});
it("troca libera o antigo atomicamente; conflito preserva o nome anterior", async () => {
  const { call } = setup();
  await call("a", "primeiro");
  await call("b", "segundo");
  expect((await call("a", "segundo")).status).toBe(409);
  expect(await (await call("a")).json()).toMatchObject({ username: "primeiro" });
  expect((await call("a", "terceiro")).status).toBe(200);
  expect((await call("b", "primeiro")).status).toBe(200);
});
it("CREKS exige identidade verificada e reserva protegida; campos enviados não concedem selo", async () => {
  const { call } = setup();
  expect((await call("other", "oliver644")).status).toBe(409);
  expect((await call("unverified", "oliver644")).status).toBe(409);
  expect(await (await call("other", "outro")).json()).toEqual({ username: "outro", creks: false });
  expect(await (await call("owner", "oliver644")).json()).toEqual({
    username: "oliver644",
    creks: true,
  });
});
it("não aceita guests, ausência de login, nomes inválidos ou origem externa", async () => {
  const { call, handler } = setup();
  expect((await call("guest", "nome")).status).toBe(401);
  expect((await call("", "nome")).status).toBe(401);
  for (const name of ["Nome", "a/b", "ç", "a".repeat(31)])
    expect((await call("a", name)).status).toBe(400);
  expect(
    (
      await handler(
        new Request("https://app.test/api/profile-handle", {
          method: "POST",
          headers: { origin: "https://evil.test" },
        }),
      )
    ).status,
  ).toBe(403);
});
it("exclusão remove somente a reserva autenticada e permite reutilização", async () => {
  const { call } = setup();
  await call("a", "a");
  await call("b", "b");
  expect((await call("a", undefined, "DELETE")).status).toBe(200);
  expect(await (await call("b")).json()).toMatchObject({ username: "b" });
  expect((await call("c", "a")).status).toBe(200);
});
it("falha de armazenamento não confirma nome nem selo", async () => {
  const handler = createProfileHandleHandler({
    allowedOrigins: ["https://app.test"],
    ownerEmail: "",
    identify: async () => ({ uid: "a", emailVerified: false, anonymous: false }),
    consume: async () => true,
    store: {
      read: async () => {
        throw new Error("offline");
      },
      write: async () => false,
    },
  });
  expect(
    (
      await handler(
        new Request("https://app.test/api/profile-handle", {
          headers: { origin: "https://app.test" },
        }),
      )
    ).status,
  ).toBe(503);
});
it("GET same-origin funciona sem Origin, como fetch do navegador", async () => {
  const { handler } = setup();
  const response = await handler(
    new Request("https://app.test/api/profile-handle", {
      headers: { authorization: "a", "sec-fetch-site": "same-origin" },
    }),
  );
  expect(response.status).toBe(200);
  expect(
    (
      await handler(
        new Request("https://app.test/api/profile-handle", {
          headers: { authorization: "a", "sec-fetch-site": "cross-site" },
        }),
      )
    ).status,
  ).toBe(403);
});
