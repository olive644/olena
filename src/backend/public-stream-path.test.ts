import { describe, expect, it, vi } from "vitest";
import { createRoom, localRoomStorageKey, type PublicLocalRoomState } from "../domain/local-room";
import { createLocalRoomHandler } from "./local-room-handler";
import { createNotebookCollabHandler } from "./notebook-collab-handler";
import { createMemoryRoomStore } from "./room-transaction";
import {
  createFirebaseCursorPublisher,
  createFirebasePublicRoomPublisher,
  firebasePublicStreamUrl,
  type FirebaseRealtimeConfig,
} from "./firebase-realtime-store";
import type { PublicNotebookCollabState } from "../domain/notebook-collab";

const SECRET = /^[a-f0-9]{32}$/;

function roomHarness() {
  const published: { id: string; state: PublicLocalRoomState }[] = [];
  const store = createMemoryRoomStore(() => 1_000);
  let counter = 0;
  const handler = createLocalRoomHandler({
    store,
    now: () => 1_000,
    randomId: () => `id-${counter++}`,
    publish: async (id, state) => void published.push({ id, state }),
    streamUrl: (id) => `https://rtdb.example/rooms/${id}.json`,
  });
  const post = (action: string, body: object) =>
    handler(
      new Request(`https://helena.example/api/local-room?action=${action}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  return { published, store, post };
}

describe("caminho público secreto das salas", () => {
  it("publica cada sala nova num identificador próprio, que não é o código", async () => {
    const { published, post } = roomHarness();
    const a = (await (await post("create", { settings: {} })).json()) as {
      code: string;
      streamUrl: string;
    };
    const b = (await (await post("create", { settings: {} })).json()) as {
      code: string;
      streamUrl: string;
    };
    const idA = /rooms\/(.+)\.json/.exec(a.streamUrl)?.[1] ?? "";
    const idB = /rooms\/(.+)\.json/.exec(b.streamUrl)?.[1] ?? "";
    expect(idA).toMatch(SECRET);
    expect(idB).toMatch(SECRET);
    expect(idA).not.toBe(idB);
    expect(a.streamUrl).not.toContain(a.code);
    expect(published.every((item) => item.id !== item.state.code)).toBe(true);
  });

  it("não deixa o identificador secreto dentro do estado público nem das respostas de estado", async () => {
    const { published, post } = roomHarness();
    const created = (await (await post("create", { settings: {} })).json()) as {
      code: string;
      streamUrl: string;
      state: object;
    };
    const publicId = /rooms\/(.+)\.json/.exec(created.streamUrl)?.[1] ?? "";
    expect(JSON.stringify(created.state)).not.toContain(publicId);
    expect(created.state).not.toHaveProperty("publicId");
    for (const item of published) expect(JSON.stringify(item.state)).not.toContain(publicId);
  });

  it("entrar, retomar e repetir a criação devolvem sempre o mesmo caminho", async () => {
    const { post } = roomHarness();
    const requestId = "11111111-1111-4111-8111-111111111111";
    const created = (await (await post("create", { settings: {}, requestId })).json()) as {
      code: string;
      hostToken: string;
      streamUrl: string;
    };
    const again = (await (await post("create", { settings: {}, requestId })).json()) as {
      streamUrl: string;
    };
    const joined = (await (
      await post("join", { code: created.code, displayName: "Ana" })
    ).json()) as { streamUrl: string; participantToken: string };
    const resumed = (await (
      await post("resume", { code: created.code, role: "host", credential: created.hostToken })
    ).json()) as { streamUrl: string };
    expect(again.streamUrl).toBe(created.streamUrl);
    expect(joined.streamUrl).toBe(created.streamUrl);
    expect(resumed.streamUrl).toBe(created.streamUrl);
  });

  it("uma sala criada antes da mudança, sem identificador, continua publicada pelo código", async () => {
    const { published, store, post } = roomHarness();
    const legacy = createRoom(
      { difficulty: "mixed", questionCount: 5, roundSeconds: 15 },
      {
        code: "ABCDE",
        hostToken: "host-token",
        now: 1_000,
      },
    );
    await store.set(localRoomStorageKey("ABCDE"), JSON.stringify(legacy), 3600);
    const joined = (await (await post("join", { code: "ABCDE", displayName: "Ana" })).json()) as {
      streamUrl: string;
    };
    expect(joined.streamUrl).toBe("https://rtdb.example/rooms/ABCDE.json");
    expect(published.at(-1)?.id).toBe("ABCDE");
  });
});

describe("caminho público secreto dos cadernos compartilhados", () => {
  function notebookHarness() {
    const published: { id: string; state: PublicNotebookCollabState }[] = [];
    const handler = createNotebookCollabHandler({
      store: createMemoryRoomStore(() => 1_000),
      now: () => 1_000,
      publish: async (id, state) => void published.push({ id, state }),
      streamUrl: (id) => `https://rtdb.example/rooms/${id}.json`,
    });
    const post = (action: string, body: object) =>
      handler(
        new Request(`https://helena.example/api/notebook-collab?action=${action}`, {
          method: "POST",
          headers: { origin: "https://helena.example" },
          body: JSON.stringify(body),
        }),
      );
    return { published, post };
  }

  it("publica o caderno num identificador próprio, que não é o código, e sem vazá-lo no estado", async () => {
    const { published, post } = notebookHarness();
    const created = (await (
      await post("create", { notebookId: "caderno", displayName: "Alice" })
    ).json()) as { code: string; streamUrl: string; state: object };
    const publicId = /rooms\/(.+)\.json/.exec(created.streamUrl)?.[1] ?? "";
    expect(publicId).toMatch(SECRET);
    expect(created.streamUrl).not.toContain(created.code);
    expect(published.at(-1)?.id).toBe(publicId);
    expect(created.state).not.toHaveProperty("publicId");
    expect(JSON.stringify(published.at(-1)?.state)).not.toContain(publicId);
  });

  it("quem entra recebe o mesmo caminho do caderno", async () => {
    const { post } = notebookHarness();
    const created = (await (
      await post("create", { notebookId: "caderno", displayName: "Alice" })
    ).json()) as { code: string; streamUrl: string };
    const joined = (await (
      await post("join", { code: created.code, displayName: "Bia" })
    ).json()) as { streamUrl: string };
    expect(joined.streamUrl).toBe(created.streamUrl);
  });

  it("dois cadernos e uma sala nunca dividem o mesmo caminho", async () => {
    const notebooks = notebookHarness();
    const rooms = roomHarness();
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const notebook = (await (
        await notebooks.post("create", { notebookId: `n${i}`, displayName: "Alice" })
      ).json()) as { streamUrl: string };
      const room = (await (await rooms.post("create", { settings: {} })).json()) as {
        streamUrl: string;
      };
      ids.add(notebook.streamUrl);
      ids.add(room.streamUrl);
    }
    expect(ids.size).toBe(10);
  });
});

describe("publicador do Firebase", () => {
  const config: FirebaseRealtimeConfig = {
    databaseUrl: "https://rtdb.example",
    serviceAccount: { clientEmail: "x@y.z", privateKey: "k" },
  };

  it("só aceita identificador no formato conhecido e nunca monta caminho com outra coisa", async () => {
    const fetchImpl = vi.fn();
    const publish = createFirebasePublicRoomPublisher(
      config,
      fetchImpl,
      () => 0,
      async () => "t",
    );
    for (const bad of ["../private-rooms/ABCDE", "abc/cursors", "", "x".repeat(40), "ab cde"])
      await expect(publish(bad, { revision: 1 })).rejects.toThrow("Identificador público inválido");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(() => firebasePublicStreamUrl(config, "../private-rooms/ABCDE")).toThrow();
    expect(firebasePublicStreamUrl(config, "a".repeat(32))).toBe(
      `https://rtdb.example/rooms/${"a".repeat(32)}.json`,
    );
  });

  it("o cursor vai para o caminho do identificador e escapa o id do participante", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "t" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("null", { status: 200 }));
    const { generateKeyPairSync } = await import("node:crypto");
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const publishCursor = createFirebaseCursorPublisher(
      { ...config, serviceAccount: { clientEmail: "x@y.z", privateKey } },
      fetchImpl,
      () => 0,
    );
    const id = "b".repeat(32);
    await publishCursor(id, "p/../1", { x: 1, y: 2, at: 3 });
    const url = String(fetchImpl.mock.calls[1]?.[0]);
    expect(url).toBe(`https://rtdb.example/rooms/${id}/cursors/p%2F..%2F1.json`);
    await expect(publishCursor("../x", "p1", null)).rejects.toThrow();
  });
});
