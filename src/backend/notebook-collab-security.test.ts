import { describe, expect, it } from "vitest";
import { createMemoryRoomStore } from "./room-transaction";
import { createNotebookCollabHandler } from "./notebook-collab-handler";

const png = `data:image/png;base64,${Buffer.from("89504e470d0a1a0a0000000d", "hex").toString("base64")}`;

function call(action: string, body: Record<string, unknown>, authorization?: string) {
  return new Request(`https://helena.example/api/notebook-collab?action=${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://helena.example",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  });
}

// O cabeçalho "Bearer ana" identifica a conta "ana" (o mesmo para "bia"); "Bearer anon" é anônima.
function handlerWith(store = createMemoryRoomStore(), extra = {}) {
  return createNotebookCollabHandler({
    store,
    publish: async () => {},
    streamUrl: () => "",
    authenticate: async (input) => {
      const value = input.headers.get("authorization")?.replace("Bearer ", "");
      if (!value) return undefined;
      return { uid: value, name: value, anonymous: value === "anon" };
    },
    ...extra,
  });
}

async function createLink(handler: ReturnType<typeof handlerWith>, as = "Bearer ana") {
  const response = await handler(call("view-create", { pages: [{ title: "X", image: png }] }, as));
  expect(response.status).toBe(201);
  return ((await response.json()) as { token: string }).token;
}

describe("revogar link de leitura", () => {
  it("quem criou revoga e o link deixa de abrir na hora", async () => {
    const handler = handlerWith();
    const token = await createLink(handler);
    expect((await handler(call("view-read", { token }))).status).toBe(200);
    const revoked = await handler(call("view-revoke", { token }, "Bearer ana"));
    expect(revoked.status).toBe(200);
    expect(await revoked.json()).toEqual({ revoked: true });
    expect((await handler(call("view-read", { token }))).status).toBe(404);
  });

  it("outra conta não revoga o link de quem criou", async () => {
    const handler = handlerWith();
    const token = await createLink(handler);
    expect((await handler(call("view-revoke", { token }, "Bearer bia"))).status).toBe(403);
    expect((await handler(call("view-read", { token }))).status).toBe(200);
  });

  it("exige conta e recusa anônimo", async () => {
    const handler = handlerWith();
    const token = await createLink(handler);
    expect((await handler(call("view-revoke", { token }))).status).toBe(401);
    expect((await handler(call("view-revoke", { token }, "Bearer anon"))).status).toBe(401);
    expect((await handler(call("view-read", { token }))).status).toBe(200);
  });

  it("link antigo, sem dono gravado, não pode ser revogado por ninguém", async () => {
    const store = createMemoryRoomStore();
    const token = "11111111-1111-4111-8111-111111111111";
    await store.set(
      `notebook-views/${token}`,
      JSON.stringify({ pages: [], expiresAt: Date.now() + 60_000 }),
      60,
    );
    const handler = handlerWith(store);
    expect((await handler(call("view-revoke", { token }, "Bearer ana"))).status).toBe(403);
  });

  it("token inválido ou já revogado dá 404 sem revelar nada", async () => {
    const handler = handlerWith();
    expect((await handler(call("view-revoke", { token: "missing" }, "Bearer ana"))).status).toBe(
      404,
    );
    const token = await createLink(handler);
    await handler(call("view-revoke", { token }, "Bearer ana"));
    expect((await handler(call("view-revoke", { token }, "Bearer ana"))).status).toBe(404);
  });
});

describe("código errado ao entrar", () => {
  it("passa a responder 429 quando o limite de códigos errados acaba", async () => {
    let misses = 0;
    const handler = handlerWith(createMemoryRoomStore(), {
      consumeJoinMiss: async () => ++misses <= 2,
    });
    const miss = () => handler(call("join", { code: "ZZZZZ", displayName: "Bob" }, "Bearer bia"));
    expect((await miss()).status).toBe(404);
    expect((await miss()).status).toBe(404);
    expect((await miss()).status).toBe(429);
  });

  it("entrar com código certo não gasta o limite", async () => {
    let misses = 0;
    const handler = handlerWith(createMemoryRoomStore(), {
      randomCode: () => "ABCDE",
      consumeJoinMiss: async () => {
        misses += 1;
        return true;
      },
    });
    await handler(call("create", { notebookId: "folha", displayName: "Ana" }, "Bearer ana"));
    const joined = await handler(call("join", { code: "ABCDE", displayName: "Bia" }, "Bearer bia"));
    expect(joined.status).toBe(200);
    expect(misses).toBe(0);
  });
});
