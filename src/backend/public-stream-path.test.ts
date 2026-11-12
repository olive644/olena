import { describe, expect, it, vi } from "vitest";
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

  it("cadernos nunca dividem o mesmo caminho", async () => {
    const notebooks = notebookHarness();
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const notebook = (await (
        await notebooks.post("create", { notebookId: `n${i}`, displayName: "Alice" })
      ).json()) as { streamUrl: string };
      ids.add(notebook.streamUrl);
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
