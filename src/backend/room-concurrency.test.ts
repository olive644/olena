import { describe, it, expect } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";
import {
  ROOM_PRESENCE_GRACE_MS,
  ROOM_START_COUNTDOWN_MS,
  type PublicLocalRoomState,
} from "../domain/local-room";

function harness() {
  let now = 1000;
  const store = createMemoryRoomStore(() => now);
  let state: PublicLocalRoomState | undefined;
  const handler = createLocalRoomHandler({
    store,
    now: () => now,
    publish: async (_code, next) => {
      if ((next.revision ?? 0) >= (state?.revision ?? 0)) state = next;
    },
    streamUrl: (code) => `/rooms/${code}`,
  });
  const post = (action: string, body: object) =>
    handler(
      new Request(`https://helena.example/api/local-room?action=${action}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  return {
    post,
    state: () => state!,
    time: (value: number) => {
      now = value;
    },
  };
}

describe("sala concorrente", () => {
  it("sincroniza o bingo e valida a cartela no servidor", async () => {
    const h = harness();
    const room = await (
      await h.post("create", { settings: { activity: "bingo", questionCount: 5, shuffle: false } })
    ).json();
    const user = await (await h.post("join", { code: room.code, displayName: "Ana" })).json();
    await h.post("start", room);
    h.time(1000 + ROOM_START_COUNTDOWN_MS);
    for (let questionIndex = 0; questionIndex < 5; questionIndex++) {
      const answer = h.state().currentQuestion!.id;
      expect(h.state().participants[0]!.bingoCard).toContain(answer);
      const response = await h.post("answer", {
        code: room.code,
        participantId: user.participantId,
        participantToken: user.participantToken,
        questionIndex,
        answer,
      });
      expect(response.status).toBe(200);
    }
    expect(h.state().phase).toBe("results");
    expect(h.state().participants[0]!.bingoMarks).toHaveLength(5);
    expect(h.state().participants[0]!.score).toBe(500);
  });

  it("aceita material pessoal validado e preserva o verso privado no quiz", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: {} })).json();
    const response = await h.post("settings", {
      ...room,
      settings: { subjectName: "Biologia", difficulty: "mixed" },
      sourceDeck: [{ id: "cell", front: "Unidade da vida", back: "célula" }],
    });
    expect(response.status).toBe(200);
    expect(h.state().content).toEqual({
      count: 1,
      preview: ["Unidade da vida"],
      difficultyCounts: { mixed: 1, easy: 0, medium: 1, hard: 0 },
    });
    expect(JSON.stringify(h.state())).not.toContain("célula");
    await h.post("join", { code: room.code, displayName: "Ana" });
    await h.post("start", room);
    expect(h.state().totalQuestions).toBe(1);
  });

  it("bloqueia entrada tardia e rejeita sala expirada", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: { teams: true } })).json();
    await h.post("join", { code: room.code, displayName: "Ana" });
    await h.post("start", room);
    expect((await h.post("join", { code: room.code, displayName: "Bia" })).status).toBe(409);
    expect(h.state().participants.map((p) => p.team)).toEqual(["Roxo"]);
    h.time(4 * 60 * 60 * 1000 + 2000);
    expect((await h.post("join", { code: room.code, displayName: "Cris" })).status).toBe(404);
  });
  it("preserva 30 entradas e 30 respostas simultâneas, sem vazar credenciais", async () => {
    const h = harness();
    const room = (await (await h.post("create", { settings: {} })).json()) as {
      code: string;
      hostToken: string;
    };
    const users = await Promise.all(
      Array.from({ length: 30 }, async (_, i) => {
        const response = await h.post("join", { code: room.code, displayName: `Aluno ${i}` });
        expect(response.status).toBe(200);
        return (await response.json()) as { participantId: string; participantToken: string };
      }),
    );
    expect(h.state().participants).toHaveLength(30);
    expect(JSON.stringify(h.state())).not.toContain(users[0]!.participantToken);
    const starts = await Promise.all([h.post("start", room), h.post("start", room)]);
    expect(starts.map((r) => r.status)).toEqual([200, 200]);
    h.time(1000 + ROOM_START_COUNTDOWN_MS);
    const answers = await Promise.all(
      users.map((user) =>
        h.post("answer", {
          code: room.code,
          ...user,
          questionIndex: 0,
          answer: h.state().currentQuestion!.front,
        }),
      ),
    );
    expect(answers.every((r) => r.status === 200)).toBe(true);
    expect(h.state().participants.every((p) => p.score === 100)).toBe(true);
    expect(h.state().questionIndex).toBe(0);
    await h.post("answer", { code: room.code, ...users[0], questionIndex: 0, answer: "again" });
    expect(h.state().participants[0]!.score).toBe(100);
  });

  it("rejeita o uso de um id público como credencial e respostas atrasadas", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: {} })).json();
    const user = await (await h.post("join", { code: room.code, displayName: "Ana" })).json();
    await h.post("start", room);
    expect(
      (
        await h.post("answer", {
          code: room.code,
          participantId: user.participantId,
          questionIndex: 0,
          answer: "hello",
        })
      ).status,
    ).toBe(403);
    h.time(1000 + ROOM_START_COUNTDOWN_MS + 30_000);
    expect(
      (
        await h.post("answer", {
          code: room.code,
          participantId: user.participantId,
          participantToken: user.participantToken,
          questionIndex: 0,
          answer: "hello",
        })
      ).status,
    ).toBe(409);
  });

  it("retoma a mesma identidade e encerra após queda prolongada do anfitrião", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: {} })).json();
    const user = await (await h.post("join", { code: room.code, displayName: "Ana" })).json();
    await h.post("start", room);
    h.time(30000);
    const resumed = await h.post("resume", {
      code: room.code,
      role: "participant",
      credential: user.participantToken,
    });
    expect(resumed.status).toBe(200);
    expect(h.state().participants).toHaveLength(1);
    h.time(ROOM_PRESENCE_GRACE_MS + 2000);
    await h.post("heartbeat", {
      code: room.code,
      role: "participant",
      credential: user.participantToken,
    });
    expect(h.state().phase).toBe("finished");
  });

  it.each(["resume", "heartbeat"])(
    "anfitrião do bingo retorna por %s sem encerrar a própria sala",
    async (action) => {
      const h = harness();
      const room = await (
        await h.post("create", { settings: { activity: "bingo", bingoMode: "corners" } })
      ).json();
      h.time(ROOM_PRESENCE_GRACE_MS + 2000);
      expect(
        (await h.post(action, { code: room.code, role: "host", credential: room.hostToken }))
          .status,
      ).toBe(200);
      expect(h.state().phase).toBe("lobby");
    },
  );
  it.each(["resume", "heartbeat"])(
    "o anfitrião que volta depois da tolerância (%s) não encerra a própria sala",
    async (action) => {
      const h = harness();
      const room = await (await h.post("create", { settings: {} })).json();
      // Sem ninguém conectado para notar a ausência, a tela do professor ficou bloqueada.
      h.time(ROOM_PRESENCE_GRACE_MS + 2000);
      const response = await h.post(action, {
        code: room.code,
        role: "host",
        credential: room.hostToken,
      });
      expect(response.status).toBe(200);
      expect(h.state().phase).toBe("lobby");
    },
  );

  it("o anfitrião que sai de propósito ainda encerra a sala", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: {} })).json();
    await h.post("leave", { code: room.code, role: "host", credential: room.hostToken });
    expect(h.state().phase).toBe("finished");
  });

  it("mantém criação e entrada idempotentes ao repetir o pedido", async () => {
    const h = harness();
    const create = { settings: {}, requestId: crypto.randomUUID() };
    const [a, b] = await Promise.all([h.post("create", create), h.post("create", create)]);
    const first = await a.json();
    const second = await b.json();
    expect(first.hostToken).toBe(second.hostToken);
    const join = { code: first.code, displayName: "Ana", requestId: crypto.randomUUID() };
    const [one, two] = await Promise.all([h.post("join", join), h.post("join", join)]);
    expect((await one.json()).participantToken).toBe((await two.json()).participantToken);
    expect(h.state().participants).toHaveLength(1);
    await h.post("start", first);
    h.time(1000 + ROOM_START_COUNTDOWN_MS);
    const retriedJoin = await h.post("join", join);
    expect(retriedJoin.status).toBe(200);
    const user = await retriedJoin.json();
    const answer = {
      code: first.code,
      participantId: user.participantId,
      participantToken: user.participantToken,
      questionIndex: 0,
      answer: h.state().currentQuestion!.front,
    };
    expect((await h.post("answer", answer)).status).toBe(200);
    h.time(90000);
    expect((await h.post("answer", answer)).status).toBe(200);
    expect(h.state().participants[0]!.score).toBe(100);
  });
});
