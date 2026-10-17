import { expect, it, vi } from "vitest";
import { createProfileSocialEvents } from "./profile-social-events";
import { createFirebaseSocialWatcher } from "./firebase-social-events";
import { createHash } from "node:crypto";

const request = (query = "stream=1", token = "b") =>
  new Request(`https://app.test/api/profile-social?${query}`, {
    headers: { Origin: "https://app.test", Authorization: token },
  });
it("autentica, limita e nunca aceita selecionar a caixa de outra conta", async () => {
  const watch = vi.fn<(uid: string, signal: AbortSignal) => AsyncGenerator<void>>(
    async function* () {
      yield;
    },
  );
  const handler = createProfileSocialEvents({
    allowedOrigins: ["https://app.test"],
    identify: async (r) =>
      r.headers.get("authorization") === "b"
        ? { uid: "b", anonymous: false, emailVerified: true }
        : undefined,
    consume: async () => true,
    watch,
  });
  expect((await handler(request("stream=1&uid=a"))).status).toBe(400);
  expect((await handler(request("stream=1", "bad"))).status).toBe(401);
  expect(watch).not.toHaveBeenCalled();
  const response = await handler(request());
  const reader = response.body!.getReader();
  expect(new TextDecoder().decode((await reader.read()).value)).toContain('"ready"');
  expect(new TextDecoder().decode((await reader.read()).value)).toContain('"changed"');
  expect(watch.mock.calls[0]?.[0]).toBe("b");
  await reader.cancel();
});
it("recusa origem externa, anônimo e cota esgotada", async () => {
  const make = (anonymous: boolean, allowed: boolean) =>
    createProfileSocialEvents({
      allowedOrigins: ["https://app.test"],
      identify: async () => ({ uid: "b", anonymous, emailVerified: true }),
      consume: async () => allowed,
      watch: async function* () {
        yield;
      },
    });
  expect((await make(true, true)(request())).status).toBe(401);
  expect((await make(false, false)(request())).status).toBe(429);
  expect(
    (
      await make(
        false,
        true,
      )(
        new Request("https://app.test/api/profile-social?stream=1", {
          headers: { Origin: "https://evil.test" },
        }),
      )
    ).status,
  ).toBe(403);
});
it("observa somente notices do UID confirmado, ignora duplicatas e não expõe payload", async () => {
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response(
        'event: put\ndata: {"path":"/","data":null}\n\nevent: put\ndata: {"path":"/","data":null}\n\nevent: patch\ndata: {"path":"/","data":{"actor":{"at":123,"read":false}}}\n\n',
        { headers: { "Content-Type": "text/event-stream" } },
      ),
  );
  const watch = createFirebaseSocialWatcher({
    databaseUrl: "https://project.firebaseio.com",
    token: async () => "server-only",
    fetcher,
  });
  const events: unknown[] = [];
  for await (const event of watch("b", new AbortController().signal)) events.push(event);
  expect(events).toEqual([undefined, undefined]);
  const [url, init] = fetcher.mock.calls[0]!;
  expect(String(url)).toBe(
    `https://project.firebaseio.com/privateProfileSocial/accounts/${createHash("sha256").update("b").digest("hex")}/notices.json`,
  );
  expect(String(url)).not.toContain("server-only");
  expect(init?.headers).toMatchObject({ Authorization: "Bearer server-only" });
});
it("só segue redirecionamento Firebase para o mesmo namespace/caminho", async () => {
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response(null, { status: 307, headers: { Location: "https://evil.test/stolen" } }),
  );
  const watch = createFirebaseSocialWatcher({
    databaseUrl: "https://project.firebaseio.com",
    token: async () => "server-only",
    fetcher,
  });
  await expect(watch("b", new AbortController().signal).next()).rejects.toThrow("social-redirect");
  expect(fetcher).toHaveBeenCalledOnce();
});

it("preserva autenticação no shard Firebase do mesmo namespace", async () => {
  const path = `/privateProfileSocial/accounts/${createHash("sha256").update("b").digest("hex")}/notices.json`;
  const fetcher = vi.fn<typeof fetch>();
  fetcher.mockResolvedValueOnce(
    new Response(null, {
      status: 307,
      headers: { Location: `https://s-shard.firebaseio.com${path}?ns=project` },
    }),
  );
  fetcher.mockResolvedValueOnce(
    new Response('event: put\ndata: {"path":"/","data":null}\n\n', {
      headers: { "Content-Type": "text/event-stream" },
    }),
  );
  const watch = createFirebaseSocialWatcher({
    databaseUrl: "https://project.firebaseio.com",
    token: async () => "server-only",
    fetcher,
  });
  const iterator = watch("b", new AbortController().signal);
  expect((await iterator.next()).done).toBe(false);
  expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({
    Authorization: "Bearer server-only",
  });
  await iterator.return(undefined);
});
