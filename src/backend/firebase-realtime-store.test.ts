import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createFirebaseCursorPublisher,
  createFirebasePublicRoomPublisher,
  createFirebaseRealtimeStore,
  firebasePublicStreamUrl,
  type FirebaseRealtimeConfig,
} from "./firebase-realtime-store";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const config: FirebaseRealtimeConfig = {
  databaseUrl: "https://helenastudy-default-rtdb.firebaseio.com",
  serviceAccount: { clientEmail: "sala@helenastudy.iam.gserviceaccount.com", privateKey },
};

function tokenResponse(): Response {
  return new Response(JSON.stringify({ access_token: "access-1" }), { status: 200 });
}

describe("armazenamento no Firebase Realtime Database", () => {
  it("usa ETags na leitura e rejeita gravação concorrente sem sobrescrever", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: "old", expiresAt: 5000 }), {
          headers: { etag: '"v2"' },
        }),
      )
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response(null, { status: 412 }));
    const store = createFirebaseRealtimeStore(config, fetchImpl, () => 1000);
    expect(await store.readVersion!("private-rooms/ABCDE")).toEqual({
      value: "old",
      version: '"v2"',
    });
    expect(await store.compareAndSet!("private-rooms/ABCDE", "new", 60, '"v2"')).toBe(false);
    expect(fetchImpl.mock.calls[3]![1].headers["if-match"]).toBe('"v2"');
  });

  it("não publica uma revisão antiga após conflito na projeção pública", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ revision: 1, generation: "1000" }), {
          headers: { etag: '"v1"' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 412 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ revision: 3, generation: "1000" }), {
          headers: { etag: '"v3"' },
        }),
      );
    await createFirebasePublicRoomPublisher(
      config,
      fetchImpl,
      () => 1000,
    )("ABCDE", { revision: 2, generation: "1000" });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });
  it("lê um valor não vencido e devolve só o conteúdo", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: "conteudo-1", expiresAt: 5_000 }), { status: 200 }),
      );
    const store = createFirebaseRealtimeStore(config, fetchImpl, () => 1_000);
    await expect(store.get("private-rooms/ABCDE")).resolves.toBe("conteudo-1");
    const [url] = fetchImpl.mock.calls[1] as [string];
    expect(url).toBe(`${config.databaseUrl}/private-rooms/ABCDE.json`);
  });

  it("apaga e devolve undefined quando o valor já venceu", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: "velho", expiresAt: 1_000 }), { status: 200 }),
      )
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const store = createFirebaseRealtimeStore(config, fetchImpl, () => 5_000);
    await expect(store.get("private-rooms/ABCDE")).resolves.toBeUndefined();
    const [, deleteInit] = fetchImpl.mock.calls[3] as [string, RequestInit];
    expect(deleteInit.method).toBe("DELETE");
  });

  it("devolve undefined quando a chave não existe", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response("null", { status: 200 }));
    const store = createFirebaseRealtimeStore(config, fetchImpl, () => 1_000);
    await expect(store.get("private-rooms/ausente")).resolves.toBeUndefined();
  });

  it("grava com o envelope de expiração calculado a partir do TTL", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const store = createFirebaseRealtimeStore(config, fetchImpl, () => 1_000);
    await store.set("private-rooms/ABCDE", "conteudo-1", 3600);
    const [url, init] = fetchImpl.mock.calls[1] as [string, RequestInit];
    expect(url).toBe(`${config.databaseUrl}/private-rooms/ABCDE.json`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ value: "conteudo-1", expiresAt: 3_601_000 });
  });

  it("publica a projeção pública da sala em /rooms/<code>", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response("null", { status: 200, headers: { etag: '"v1"' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const publish = createFirebasePublicRoomPublisher(config, fetchImpl, () => 1_000);
    await publish("ABCDE", { phase: "lobby" });
    const [url, init] = fetchImpl.mock.calls[2] as [string, RequestInit];
    expect(url).toBe(`${config.databaseUrl}/rooms/ABCDE.json`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ phase: "lobby" });
  });

  it("monta a URL de streaming público sem autenticação embutida", () => {
    expect(firebasePublicStreamUrl(config, "ABCDE")).toBe(`${config.databaseUrl}/rooms/ABCDE.json`);
  });
});

describe("cursor no Firebase", () => {
  it("escreve só o cursor do participante e apaga com null", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) =>
      String(input).includes("oauth2") || String(input).includes("token")
        ? tokenResponse()
        : new Response(null, { status: 200 }),
    );
    const publishCursor = createFirebaseCursorPublisher(config, fetchImpl, () => 1_000);
    await publishCursor("ABCDE", "p1", { x: 10, y: 20, at: 1000 });
    await publishCursor("ABCDE", "p1", null);
    const writes = fetchImpl.mock.calls.filter(([input]) => String(input).includes("/rooms/"));
    expect(String(writes[0]![0])).toBe(`${config.databaseUrl}/rooms/ABCDE/cursors/p1.json`);
    expect(writes[0]![1]?.method).toBe("PUT");
    expect(JSON.parse(writes[0]![1]?.body as string)).toEqual({ x: 10, y: 20, at: 1000 });
    expect(writes[1]![1]?.method).toBe("DELETE");
  });

  it("regravar a folha preserva os cursores que já estavam publicados", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ revision: 1, cursors: { p1: { x: 1, y: 2, at: 3 } } }), {
          status: 200,
          headers: { etag: '"v1"' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    await createFirebasePublicRoomPublisher(
      config,
      fetchImpl,
      () => 1000,
    )("ABCDE", {
      revision: 2,
    });
    const [, init] = fetchImpl.mock.calls[2] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      revision: 2,
      cursors: { p1: { x: 1, y: 2, at: 3 } },
    });
  });
});
