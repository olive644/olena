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
  it("mantém desconectados na equipe e remove somente quem sai explicitamente", async () => {
    let clock = 1000;
    const handler = createNotebookCollabHandler({
      store: createMemoryRoomStore(),
      now: () => clock,
      publish: async () => {},
      streamUrl: () => "",
    });
    const created = await handler(request("create", { notebookId: "sheet", displayName: "Alice" }));
    const { code, hostToken } = (await created.json()) as { code: string; hostToken: string };
    const joined = await handler(request("join", { code, displayName: "Bob" }));
    const { participantToken } = (await joined.json()) as { participantToken: string };
    clock += 46_000;
    const beat = await handler(request("heartbeat", { code, credential: hostToken }));
    expect(await beat.json()).toMatchObject({
      state: {
        participants: [
          { displayName: "Alice", online: true },
          { displayName: "Bob", online: false },
        ],
      },
    });
    const left = await handler(request("leave", { code, credential: participantToken }));
    const body = (await left.json()) as { state: { participants: unknown[] } };
    expect(body.state.participants).toHaveLength(1);
  });
  it("usa a identidade autenticada e vincula cada credencial à conta", async () => {
    const handler = createNotebookCollabHandler({
      store: createMemoryRoomStore(),
      publish: async () => {},
      streamUrl: () => "https://stream.example/room",
      authenticate: async (input) => {
        const uid = input.headers.get("authorization")?.replace("Bearer ", "");
        return uid
          ? { uid, name: uid === "owner" ? "Conta da dona" : "Conta convidada" }
          : undefined;
      },
    });
    const asUser = (action: string, body: Record<string, unknown>, uid: string) =>
      new Request(`https://helena.example/api/notebook-collab?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${uid}` },
        body: JSON.stringify(body),
      });
    expect((await handler(request("create", { notebookId: "sheet" }))).status).toBe(401);
    const created = await handler(
      asUser(
        "create",
        {
          notebookId: "sheet",
          displayName: "Nome inventado",
          avatarUrl: "/profile-avatars/moguel-porquinho.svg",
        },
        "owner",
      ),
    );
    expect(created.status).toBe(201);
    const room = (await created.json()) as {
      code: string;
      hostToken: string;
      state: { participants: { displayName: string; avatarUrl?: string }[] };
    };
    expect(room.state.participants[0]).toMatchObject({
      displayName: "Conta da dona",
      avatarUrl: "/profile-avatars/moguel-porquinho.svg",
    });
    const heartbeat = await handler(
      asUser(
        "heartbeat",
        {
          code: room.code,
          credential: room.hostToken,
          avatarUrl: "/profile-avatars/anonha-panda.svg",
        },
        "owner",
      ),
    );
    expect(heartbeat.status).toBe(200);
    expect(
      (await heartbeat.json()) as { state: { participants: { avatarUrl?: string }[] } },
    ).toMatchObject({
      state: { participants: [{ avatarUrl: "/profile-avatars/anonha-panda.svg" }] },
    });
    expect(
      (await handler(asUser("resume", { code: room.code, credential: room.hostToken }, "visitor")))
        .status,
    ).toBe(403);
    const secondDevice = await handler(
      asUser("join", { code: room.code, avatarUrl: "/profile-avatars/helena.webp" }, "owner"),
    );
    const joined = (await secondDevice.json()) as {
      participantToken: string;
      state: { participants: { avatarUrl: string }[] };
    };
    expect(joined.state.participants).toHaveLength(1);
    expect(joined.participantToken).toBe(room.hostToken);
    expect(joined.state.participants[0]?.avatarUrl).toBe("/profile-avatars/anonha-panda.svg");
    const left = await handler(
      asUser("leave", { code: room.code, credential: room.hostToken }, "owner"),
    );
    expect(await left.json()).toMatchObject({ state: { participants: [] } });
    expect(
      (await handler(asUser("heartbeat", { code: room.code, credential: room.hostToken }, "owner")))
        .status,
    ).toBe(403);
  });
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

describe("cursor ao vivo", () => {
  async function room() {
    const published: { code: string; participantId: string; cursor: unknown }[] = [];
    const handler = createNotebookCollabHandler({
      store: createMemoryRoomStore(),
      now: () => 5000,
      publish: async () => {},
      publishCursor: async (code, participantId, cursor) => {
        published.push({ code, participantId, cursor });
      },
      streamUrl: () => "",
    });
    const created = await handler(request("create", { notebookId: "sheet", displayName: "Alice" }));
    const { code, hostToken, participantId } = (await created.json()) as {
      code: string;
      hostToken: string;
      participantId: string;
    };
    return { handler, published, code, hostToken, participantId };
  }

  it("publica só a posição do participante autenticado, com a hora do servidor", async () => {
    const { handler, published, code, hostToken, participantId } = await room();
    const answer = await handler(
      request("cursor", { code, credential: hostToken, x: 120.6, y: 300 }),
    );
    expect(answer.status).toBe(200);
    expect(published).toEqual([{ code, participantId, cursor: { x: 121, y: 300, at: 5000 } }]);
  });

  it("limita a posição à folha e recusa valores que não são números", async () => {
    const { handler, published, code, hostToken } = await room();
    await handler(request("cursor", { code, credential: hostToken, x: -50, y: 99999 }));
    expect(published[0]!.cursor).toMatchObject({ x: 0, y: 4000 });
    for (const body of [{ x: "1", y: 2 }, { x: 1 }, { x: Infinity, y: 1 }]) {
      const answer = await handler(request("cursor", { code, credential: hostToken, ...body }));
      expect(answer.status).toBe(400);
    }
    expect(published).toHaveLength(1);
  });

  it("recusa credencial inválida e não escreve nada", async () => {
    const { handler, published, code } = await room();
    const answer = await handler(request("cursor", { code, credential: "errada", x: 1, y: 1 }));
    expect(answer.status).toBe(403);
    expect(published).toHaveLength(0);
  });

  it("uma falha do canal de cursor não derruba o pedido", async () => {
    const handler = createNotebookCollabHandler({
      store: createMemoryRoomStore(),
      publish: async () => {},
      publishCursor: async () => {
        throw new Error("rede");
      },
      streamUrl: () => "",
    });
    const created = await handler(request("create", { notebookId: "sheet", displayName: "Alice" }));
    const { code, hostToken } = (await created.json()) as { code: string; hostToken: string };
    const answer = await handler(request("cursor", { code, credential: hostToken, x: 1, y: 1 }));
    expect(answer.status).toBe(200);
  });

  it("sair da sala apaga o cursor", async () => {
    const { handler, published, code, hostToken, participantId } = await room();
    await handler(request("leave", { code, credential: hostToken }));
    expect(published.at(-1)).toEqual({ code, participantId, cursor: null });
  });
});
