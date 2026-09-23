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
