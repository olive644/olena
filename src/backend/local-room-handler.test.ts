import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";
import { MAX_ROOM_PARTICIPANTS, type PublicLocalRoomState } from "../domain/local-room";

const origin = "https://helena.example";

function post(action: string, body: unknown): Request {
  return new Request(`${origin}/api/local-room?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

let handler: (request: Request) => Promise<Response>;
let publish: ReturnType<typeof vi.fn>;
let codeCounter = 0;
let idCounter = 0;
let currentTime = 1_000;

beforeEach(() => {
  codeCounter = 0;
  idCounter = 0;
  currentTime = 1_000;
  publish = vi.fn().mockResolvedValue(undefined);
  handler = createLocalRoomHandler({
    store: createMemoryRoomStore(() => currentTime),
    publish: publish as (code: string, publicState: PublicLocalRoomState) => Promise<void>,
    streamUrl: (code) => `https://helenastudy-rtdb.firebaseio.com/rooms/${code}.json`,
    now: () => currentTime,
    randomCode: () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[codeCounter++]!.repeat(5),
    randomId: () => `id-${idCounter++}`,
  });
});

async function createRoomViaApi(roundSeconds: 15 | 30 | 45 | 60 = 15) {
  const response = await handler(
    post("create", { settings: { difficulty: "mixed", questionCount: 5, roundSeconds } }),
  );
  return (await response.json()) as { code: string; hostToken: string; streamUrl: string };
}

describe("handler da sala local", () => {
  it.each([
    ["/profile-avatars/oliver.webp", "/profile-avatars/oliver.webp"],
    ["https://lh3.googleusercontent.com/avatar", "https://lh3.googleusercontent.com/avatar"],
    ["https://example.com/tracker.png", undefined],
    ["javascript:alert(1)", undefined],
  ])("valida o avatar do participante: %s", async (avatarUrl, expected) => {
    const { code } = await createRoomViaApi();
    const response = await handler(post("join", { code, displayName: "Ana", avatarUrl }));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { state: PublicLocalRoomState };
    expect(payload.state.participants[0]?.avatarUrl).toBe(expected);
  });

  it("cria uma sala, devolve o token do host e a URL de streaming público", async () => {
    const response = await handler(
      post("create", { settings: { difficulty: "easy", questionCount: 10, roundSeconds: 30 } }),
    );
    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      code: string;
      hostToken: string;
      state: object;
      streamUrl: string;
    };
    expect(payload.code).toBeTruthy();
    expect(payload.hostToken).toBeTruthy();
    expect(payload.state).not.toHaveProperty("hostToken");
    expect(payload.streamUrl).toContain(payload.code);
    expect(publish).toHaveBeenCalledWith(payload.code, expect.objectContaining({ phase: "lobby" }));
  });

  it("recusa configurações inválidas na criação", async () => {
    const invalidDifficulty = await handler(
      post("create", { settings: { difficulty: "muito-dificil", questionCount: 10 } }),
    );
    expect(invalidDifficulty.status).toBe(400);
    const invalidRound = await handler(
      post("create", { settings: { difficulty: "easy", questionCount: 10, roundSeconds: 5 } }),
    );
    expect(invalidRound.status).toBe(400);
    const invalidAudio = await handler(
      post("create", {
        settings: { difficulty: "easy", questionCount: 5, audioRepetitions: 0 },
      }),
    );
    expect(invalidAudio.status).toBe(400);
    const invalidTypoTolerance = await handler(
      post("create", {
        settings: { difficulty: "easy", questionCount: 5, acceptMinorTypos: "sim" },
      }),
    );
    expect(invalidTypoTolerance.status).toBe(400);
  });

  it("aplica 30s como tempo padrão da rodada quando não informado", async () => {
    const response = await handler(post("create", { settings: { difficulty: "mixed" } }));
    const payload = (await response.json()) as { state: { settings: { roundSeconds: number } } };
    expect(payload.state.settings.roundSeconds).toBe(30);
  });

  it("permite participante entrar e recebe a URL de streaming", async () => {
    const { code } = await createRoomViaApi();
    const joinResponse = await handler(post("join", { code, displayName: "Ana" }));
    expect(joinResponse.status).toBe(200);
    const joinPayload = (await joinResponse.json()) as {
      participantId: string;
      state: { participants: unknown[] };
      streamUrl: string;
    };
    expect(joinPayload.participantId).toBeTruthy();
    expect(joinPayload.state.participants).toHaveLength(1);
    expect(joinPayload.streamUrl).toContain(code);
  });

  it("retoma a sessão do host e do participante depois de recarregar", async () => {
    const { code, hostToken } = await createRoomViaApi();
    const joinResponse = await handler(post("join", { code, displayName: "Ana" }));
    const { participantToken } = (await joinResponse.json()) as { participantToken: string };
    await handler(post("start", { code, hostToken }));

    const resumedHost = await handler(
      post("resume", { code, role: "host", credential: hostToken }),
    );
    expect(resumedHost.status).toBe(200);
    expect(await resumedHost.json()).toEqual(
      expect.objectContaining({
        state: expect.objectContaining({ phase: "playing" }),
        streamUrl: expect.stringContaining(code),
      }),
    );

    const resumedParticipant = await handler(
      post("resume", { code, role: "participant", credential: participantToken }),
    );
    expect(resumedParticipant.status).toBe(200);
    expect(await resumedParticipant.json()).toEqual(
      expect.objectContaining({ state: expect.objectContaining({ phase: "playing" }) }),
    );
  });

  it("recusa reconexão com uma credencial desconhecida", async () => {
    const { code } = await createRoomViaApi();
    const response = await handler(
      post("resume", { code, role: "participant", credential: "participante-ausente" }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Não foi possível confirmar sua participação nesta sala.",
      code: "invalid_session",
    });
  });

  it("normaliza o código e recusa nome duplicado", async () => {
    const { code } = await createRoomViaApi();
    expect(
      (
        await handler(
          post("join", { code: `${code.slice(0, 2)}-${code.slice(2)}`, displayName: "Ana" }),
        )
      ).status,
    ).toBe(200);

    const duplicate = await handler(post("join", { code, displayName: "ana" }));
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual({ error: "Esse nome já está em uso nesta sala." });
  });

  it("recusa entrada quando a sala atinge o limite", async () => {
    const { code } = await createRoomViaApi();
    for (let index = 0; index < MAX_ROOM_PARTICIPANTS; index += 1) {
      expect((await handler(post("join", { code, displayName: `Pessoa ${index}` }))).status).toBe(
        200,
      );
    }

    const full = await handler(post("join", { code, displayName: "Pessoa extra" }));
    expect(full.status).toBe(409);
    expect(await full.json()).toEqual({
      error: "Esta sala atingiu o limite de participantes.",
    });
  });

  it("recusa entrada em sala inexistente ou já iniciada", async () => {
    const missing = await handler(post("join", { code: "ZZZZZ", displayName: "Ana" }));
    expect(missing.status).toBe(404);

    const { code, hostToken } = await createRoomViaApi();
    await handler(post("join", { code, displayName: "Ana" }));
    await handler(post("start", { code, hostToken }));
    const late = await handler(post("join", { code, displayName: "Bia" }));
    expect(late.status).toBe(409);
  });

  it("só o host pode mudar configurações, iniciar, avançar e encerrar", async () => {
    const { code, hostToken } = await createRoomViaApi();
    await handler(post("join", { code, displayName: "Ana" }));

    expect(
      (await handler(post("settings", { code, hostToken: "errado", settings: {} }))).status,
    ).toBe(403);
    expect((await handler(post("start", { code, hostToken: "errado" }))).status).toBe(403);

    const settingsResponse = await handler(
      post("settings", { code, hostToken, settings: { difficulty: "easy" } }),
    );
    expect(settingsResponse.status).toBe(200);

    const startResponse = await handler(post("start", { code, hostToken }));
    expect(startResponse.status).toBe(200);
    const startPayload = (await startResponse.json()) as {
      state: { phase: string; totalQuestions: number; currentQuestion?: { front: string } };
    };
    expect(startPayload.state.phase).toBe("playing");
    expect(startPayload.state.currentQuestion?.front).toBeTruthy();
  });

  it("não inicia sem nenhum participante", async () => {
    const { code, hostToken } = await createRoomViaApi();
    const response = await handler(post("start", { code, hostToken }));
    expect(response.status).toBe(409);
  });

  it("dá feedback e mantém a pergunta por alguns segundos", async () => {
    const { code, hostToken } = await createRoomViaApi();
    const joinResponse = await handler(post("join", { code, displayName: "Ana" }));
    const { participantId, participantToken } = (await joinResponse.json()) as {
      participantId: string;
      participantToken: string;
    };
    await handler(post("start", { code, hostToken }));

    const answerResponse = await handler(
      post("answer", {
        code,
        participantId,
        participantToken,
        questionIndex: 0,
        answer: "qualquer coisa",
      }),
    );
    expect(answerResponse.status).toBe(200);
    const answerPayload = (await answerResponse.json()) as {
      correct: boolean;
      xpChange: number;
      question: { front: string; back: string };
      state: { questionIndex: number };
    };
    expect(typeof answerPayload.correct).toBe("boolean");
    expect(answerPayload.state.questionIndex).toBe(0);
    expect(answerPayload.question.front).toBeTruthy();
    expect(answerPayload.question.back).toBeTruthy();
  });

  it("preserva respostas equivalentes no material manual", async () => {
    const { code, hostToken } = await createRoomViaApi();
    const joinResponse = await handler(post("join", { code, displayName: "Ana" }));
    const { participantId, participantToken } = (await joinResponse.json()) as {
      participantId: string;
      participantToken: string;
    };
    const settingsResponse = await handler(
      post("settings", {
        code,
        hostToken,
        settings: { questionCount: "all", shuffle: false },
        sourceDeck: [
          {
            id: "manual-1",
            front: "bus",
            back: "ônibus",
            acceptedAnswers: ["autocarro"],
          },
        ],
      }),
    );
    expect(settingsResponse.status).toBe(200);
    await handler(post("start", { code, hostToken }));

    const answerResponse = await handler(
      post("answer", {
        code,
        participantId,
        participantToken,
        questionIndex: 0,
        answer: "autocarro",
      }),
    );
    expect(answerResponse.status).toBe(200);
    expect(await answerResponse.json()).toEqual(expect.objectContaining({ correct: true }));
  });

  it("repete ou troca a atividade mantendo a mesma sala", async () => {
    const { code, hostToken } = await createRoomViaApi();
    const joinResponse = await handler(post("join", { code, displayName: "Ana" }));
    const { participantId, participantToken } = (await joinResponse.json()) as {
      participantId: string;
      participantToken: string;
    };
    await handler(
      post("settings", {
        code,
        hostToken,
        settings: { questionCount: "all", shuffle: false },
        sourceDeck: [{ id: "manual-1", front: "book", back: "livro" }],
      }),
    );
    await handler(post("start", { code, hostToken }));
    await handler(
      post("answer", { code, participantId, participantToken, questionIndex: 0, answer: "livro" }),
    );
    const resultResponse = await handler(post("next", { code, hostToken, questionIndex: 0 }));
    expect((await resultResponse.json()).state.phase).toBe("results");

    const repeatResponse = await handler(post("repeat", { code, hostToken }));
    expect((await repeatResponse.json()).state).toEqual(
      expect.objectContaining({ code, phase: "playing", questionIndex: 0 }),
    );
  });

  it("recusa avançar manualmente antes do tempo, e aceita depois que o tempo acaba", async () => {
    const { code, hostToken } = await createRoomViaApi(15);
    await handler(post("join", { code, displayName: "Ana" }));
    await handler(post("join", { code, displayName: "Bia" }));
    await handler(post("start", { code, hostToken }));

    const tooEarly = await handler(post("next", { code, hostToken }));
    expect(tooEarly.status).toBe(409);

    currentTime += 15_000;
    const onTime = await handler(post("next", { code, hostToken }));
    expect(onTime.status).toBe(200);
    const payload = (await onTime.json()) as { state: { questionIndex: number } };
    expect(payload.state.questionIndex).toBe(1);
  });

  it("encerra a sala a pedido do host", async () => {
    const { code, hostToken } = await createRoomViaApi();
    await handler(post("join", { code, displayName: "Ana" }));
    const response = await handler(post("end", { code, hostToken }));
    const payload = (await response.json()) as { state: { phase: string } };
    expect(payload.state.phase).toBe("finished");
  });
});
