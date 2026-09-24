import { describe, expect, it } from "vitest";
import { createMemoryRoomStore } from "./room-transaction";
import { createNotebookCollabHandler } from "./notebook-collab-handler";

function request(action: string, body: Record<string, unknown>) {
  return new Request(`https://helena.example/api/notebook-collab?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://helena.example" },
    body: JSON.stringify(body),
  });
}

describe("notebook collaboration handler", () => {
  it("saves the initial sheet before making the invitation available", async () => {
    const published: unknown[] = [];
    const handler = createNotebookCollabHandler({
      store: createMemoryRoomStore(),
      publish: async (_code, state) => void published.push(state),
      streamUrl: () => "https://stream.example/room",
    });
    const document = { version: 1, paper: "ruled", strokes: [], pageText: "Folha do dono" };
    const invalid = await handler(
      request("create", {
        notebookId: "sheet",
        displayName: "Alice",
        document: { invalid: true },
      }),
    );
    expect(invalid.status).toBe(400);
    const response = await handler(
      request("create", {
        notebookId: "sheet",
        displayName: "Alice",
        document,
      }),
    );
    expect(response.status).toBe(201);
    const { code } = (await response.json()) as { code: string };
    expect(published[0]).toMatchObject({ document });
    const joined = await handler(request("join", { code, displayName: "Bob" }));
    expect(joined.status).toBe(200);
    expect(await joined.json()).toMatchObject({ state: { document } });
  });
  it("cria leitura isolada, recusa conteúdo ativo e não concede edição pelo token", async () => {
    const handler = createNotebookCollabHandler({
      store: createMemoryRoomStore(),
      publish: async () => {},
      streamUrl: () => "",
    });
    const invalid = await handler(
      request("view-create", { pages: [{ title: "X", image: "data:image/svg+xml,<svg/>" }] }),
    );
    expect(invalid.status).toBe(400);
    const created = await handler(
      request("view-create", {
        pages: [{ title: "Questão", image: "data:image/png;base64,aGVsbG8=" }],
      }),
    );
    expect(created.status).toBe(201);
    const { token } = (await created.json()) as { token: string };
    const read = await handler(request("view-read", { token }));
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ pages: [{ title: "Questão" }] });
    expect(
      (
        await handler(
          request("update", {
            code: token,
            credential: token,
            document: { version: 1, paper: "ruled", strokes: [] },
          }),
        )
      ).status,
    ).toBe(400);
    expect((await handler(request("view-read", { token: "missing" }))).status).toBe(404);
  });
  it("creates, joins and broadcasts a document", async () => {
    const store = createMemoryRoomStore();
    const published: unknown[] = [];
    const handler = createNotebookCollabHandler({
      store,
      randomCode: () => "ABCDE",
      randomId: (() => {
        let index = 0;
        return () => `id-${++index}`;
      })(),
      publish: async (_code, state) => void published.push(state),
      streamUrl: (code) => `https://stream.example/${code}`,
    });
    const created = await handler(
      request("create", { displayName: "Alice", notebookId: "asset-1", requestId: "create-1" }),
    );
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as {
      code: string;
      hostToken: string;
      participantId: string;
      state: { participants: unknown[] };
    };
    expect(createdBody.state.participants).toHaveLength(1);

    const resumed = await handler(
      request("resume", {
        code: createdBody.code,
        credential: createdBody.hostToken,
      }),
    );
    expect(resumed.status).toBe(200);
    expect((await resumed.json()) as { participantId: string }).toMatchObject({
      participantId: createdBody.participantId,
    });

    const joined = await handler(
      request("join", { code: createdBody.code, displayName: "Bob", requestId: "join-1" }),
    );
    expect(joined.status).toBe(200);
    const joinedBody = (await joined.json()) as { participantToken: string; participantId: string };
    const updated = await handler(
      request("update", {
        code: createdBody.code,
        credential: joinedBody.participantToken,
        document: { version: 1, paper: "ruled", strokes: [] },
        label: "resolveu a questão",
      }),
    );
    expect(updated.status).toBe(200);
    const updatedBody = (await updated.json()) as {
      state: { document?: unknown; actions: { displayName: string }[] };
    };
    expect(updatedBody.state.document).toEqual({ version: 1, paper: "ruled", strokes: [] });
    expect(updatedBody.state.actions.at(-1)?.displayName).toBe("Bob");
    expect(published.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects the fifth active participant", async () => {
    const store = createMemoryRoomStore();
    const handler = createNotebookCollabHandler({
      store,
      randomCode: () => "ABCDE",
      randomId: (() => {
        let index = 0;
        return () => `id-${++index}`;
      })(),
      publish: async () => {},
      streamUrl: (code) => code,
    });
    const created = await handler(request("create", { displayName: "P0", notebookId: "asset-1" }));
    const { code } = (await created.json()) as { code: string };
    for (const name of ["P1", "P2", "P3"]) {
      expect((await handler(request("join", { code, displayName: name }))).status).toBe(200);
    }
    expect((await handler(request("join", { code, displayName: "P4" }))).status).toBe(409);
  });
});
