import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";
import { createRoomRecordingHandler } from "./room-recording-handler";
import {
  MAX_ROOM_PARTICIPANTS,
  ROOM_START_COUNTDOWN_MS,
  type PublicLocalRoomState,
} from "../domain/local-room";
import { READY_LISTENING_DECK, READY_LISTENING_SOURCE } from "../domain/ready-listening-words";
import { createRoomGuard } from "./room-guard";

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
let store = createMemoryRoomStore(() => currentTime);

beforeEach(() => {
  codeCounter = 0;
  idCounter = 0;
  currentTime = 1_000;
  store = createMemoryRoomStore(() => currentTime);
  publish = vi.fn().mockResolvedValue(undefined);
  handler = createLocalRoomHandler({
    store,
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
  it("permite o criador na escuta somente com a seleção da Helena", async () => {
    const { code, hostToken } = await createRoomViaApi();
    expect((await handler(post("host-player", { code, hostToken, active: true }))).status).toBe(
      409,
    );
    for (const helenaWordCount of [4, 51, 5.5, "10"]) {
      expect(
        (
          await handler(
            post("settings", { code, hostToken, settings: { helenaWords: true, helenaWordCount } }),
          )
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await handler(
          post("settings", {
            code,
            hostToken,
            settings: { helenaWords: true, helenaWordCount: 50 },
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (await handler(post("host-player", { code, hostToken, active: true, displayName: "Ana" })))
        .status,
    ).toBe(200);
    expect(
      (await handler(post("settings", { code, hostToken, settings: { helenaWords: false } })))
        .status,
    ).toBe(409);
    const started = await (await handler(post("start", { code, hostToken }))).json();
    expect(started.state.totalQuestions).toBe(50);
    expect(started.state.content.preview).toEqual([]);
    expect(
      (await handler(post("settings", { code, hostToken, settings: { helenaWordCount: 5 } })))
        .status,
    ).toBe(409);
  });
  it("recusa sorteio da Helena no bingo e fonte própria misturada ao sorteio", async () => {
    expect(
      (
        await handler(
          post("create", {
            settings: {
              difficulty: "mixed",
              questionCount: 5,
              roundSeconds: 15,
              activity: "bingo",
              helenaWords: true,
            },
          }),
        )
      ).status,
    ).toBe(400);
    const { code, hostToken } = await createRoomViaApi();
    expect(
      (
        await handler(
          post("settings", {
            code,
            hostToken,
            settings: { helenaWords: true },
            sourceDeck: [{ id: "x", front: "x", back: "y" }],
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("guard consegue ler heartbeat sem reutilizar um corpo já consumido", async () => {
    handler = createLocalRoomHandler({
      store,
      publish: async () => {},
      streamUrl: () => "https://example.com/stream",
      guard: createRoomGuard(store, "project", "app", false),
      now: () => currentTime,
    });
    const { code, hostToken } = await createRoomViaApi();
    const response = await handler(
      post("heartbeat", { code, role: "host", credential: hostToken }),
    );
    expect(response.status).toBe(200);
  });
  it("organizador participa com credencial própria, sem expor tokens públicos", async () => {
    const { code, hostToken } = await createRoomViaApi();
    await handler(post("settings", { code, hostToken, settings: { helenaWords: true } }));
    const forbidden = await handler(
      post("host-player", { code, hostToken: "outro", active: true }),
    );
    expect(forbidden.status).toBe(403);
    const player = await (
      await handler(post("host-player", { code, hostToken, active: true, displayName: "Oli" }))
    ).json();
    expect(player.participantToken).toBeTruthy();
    expect(player.participantToken).not.toBe(hostToken);
    expect(player.state.participants).toHaveLength(1);
    expect(player.state).not.toHaveProperty("hostParticipantId");
    expect(player.state.participants[0]).not.toHaveProperty("token");
    const duplicate = await (
      await handler(post("host-player", { code, hostToken, active: true, displayName: "Oli" }))
    ).json();
    expect(duplicate.participantId).toBe(player.participantId);
    expect(duplicate.state.participants).toHaveLength(1);
    currentTime += 90_000;
    const resumed = await (
      await handler(post("resume", { code, role: "host", credential: hostToken }))
    ).json();
    expect(resumed.participantToken).toBe(player.participantToken);
    expect(resumed.state.participants[0].online).toBe(true);
    const guest = await (await handler(post("join", { code, displayName: "Ana" }))).json();
    const guestResume = await (
      await handler(
        post("resume", { code, role: "participant", credential: guest.participantToken }),
      )
    ).json();
    expect(guestResume).not.toHaveProperty("participantToken");
    const removed = await (
      await handler(post("host-player", { code, hostToken, active: false }))
    ).json();
    expect(removed.state.participants).toHaveLength(1);
    expect(removed.state.participants[0].id).toBe(guest.participantId);
  });

  it("áudio dos participantes é opt-in validado e só o organizador configura", async () => {
    const { code, hostToken } = await createRoomViaApi();
    const initial = await (
      await handler(post("resume", { code, role: "host", credential: hostToken }))
    ).json();
    expect(initial.state.settings.participantAudio === true).toBe(false);
    expect(
      (await handler(post("settings", { code, hostToken, settings: { participantAudio: "sim" } })))
        .status,
    ).toBe(400);
    const enabled = await (
      await handler(post("settings", { code, hostToken, settings: { participantAudio: true } }))
    ).json();
    expect(enabled.state.settings.participantAudio).toBe(true);
    expect(
      (
        await handler(
          post("settings", { code, hostToken: "outro", settings: { participantAudio: false } }),
        )
      ).status,
    ).toBe(403);
  });

  it("organizador responde como participante e não troca de modo durante a rodada", async () => {
    const { code, hostToken } = await createRoomViaApi();
    await handler(
      post("settings", {
        code,
        hostToken,
        settings: { helenaWords: true, helenaWordCount: 5 },
      }),
    );
    const player = await (
      await handler(post("host-player", { code, hostToken, active: true, displayName: "Oli" }))
    ).json();
    const started = await handler(post("start", { code, hostToken }));
    expect(started.status).toBe(200);
    const startedBody = await started.json();
    const word = READY_LISTENING_DECK.find(
      (card) => card.id === startedBody.state.currentQuestion.id,
    )!;
    expect((await handler(post("host-player", { code, hostToken, active: false }))).status).toBe(
      400,
    );
    currentTime += ROOM_START_COUNTDOWN_MS;
    const answer = await (
      await handler(
        post("answer", {
          code,
          participantId: player.participantId,
          participantToken: player.participantToken,
          questionIndex: 0,
          answer: word.back,
        }),
      )
    ).json();
    expect(answer.correct).toBe(true);
    expect(answer.pointsChange).toBe(100);
  });

  it("ignora pontos e XP enviados pelo cliente e usa tempo do servidor", async () => {
    const { code, hostToken } = await createRoomViaApi(30);
    await handler(
      post("settings", {
        code,
        hostToken,
        settings: { questionCount: "all", shuffle: false },
        sourceDeck: [{ id: "book", front: "book", back: "livro" }],
      }),
    );
    const first = await (await handler(post("join", { code, displayName: "Ana" }))).json();
    const second = await (await handler(post("join", { code, displayName: "Bia" }))).json();
    await handler(post("start", { code, hostToken }));
    currentTime += ROOM_START_COUNTDOWN_MS;
    const fast = await (
      await handler(
        post("answer", {
          code,
          participantId: first.participantId,
          participantToken: first.participantToken,
          questionIndex: 0,
          answer: "livro",
          points: 9999,
          xp: 9999,
          elapsedMs: 0,
        }),
      )
    ).json();
    expect(fast.pointsChange).toBe(100);
    expect(fast.state.participants.every((p: { reward?: unknown }) => !p.reward)).toBe(true);
    currentTime += 15000;
    const slow = await (
      await handler(
        post("answer", {
          code,
          participantId: second.participantId,
          participantToken: second.participantToken,
          questionIndex: 0,
          answer: "livro",
          points: 9999,
          elapsedMs: 0,
        }),
      )
    ).json();
    expect(slow.pointsChange).toBe(60);
    currentTime += 3000;
    const result = await (await handler(post("next", { code, hostToken }))).json();
    expect(result.state.participants.map((p: { reward: { xp: number } }) => p.reward.xp)).toEqual([
      50, 30,
    ]);
    const again = await (await handler(post("next", { code, hostToken }))).json();
    expect(again.state.participants).toEqual(result.state.participants);
  });
  it("valida escolha própria, controle do anfitrião e bloqueio após começar", async () => {
    const { code, hostToken } = await createRoomViaApi();
    await handler(post("settings", { code, hostToken, settings: { teams: true } }));
    const ana = (await (await handler(post("join", { code, displayName: "Ana" }))).json()) as {
      participantId: string;
      participantToken: string;
    };
    const bia = (await (await handler(post("join", { code, displayName: "Bia" }))).json()) as {
      participantId: string;
      participantToken: string;
    };
    expect(
      (
        await handler(
          post("team", {
            code,
            participantId: bia.participantId,
            participantToken: ana.participantToken,
            team: "Roxo",
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handler(
          post("team", {
            code,
            participantId: ana.participantId,
            participantToken: ana.participantToken,
            team: "Azul",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handler(
          post("team", {
            code,
            participantId: ana.participantId,
            participantToken: ana.participantToken,
            team: "Amarelo",
          }),
        )
      ).status,
    ).toBe(200);
    const moved = await handler(
      post("team", { code, participantId: bia.participantId, hostToken, team: "Roxo" }),
    );
    const movedPayload = (await moved.json()) as { state: PublicLocalRoomState };
    expect(movedPayload.state.participants.map((p) => p.team)).toEqual(["Amarelo", "Roxo"]);
    const started = (await (await handler(post("start", { code, hostToken }))).json()) as {
      state: PublicLocalRoomState;
    };
    expect(started.state.participants.map((p) => p.team)).toEqual(["Amarelo", "Roxo"]);
    expect(
      (
        await handler(
          post("team", {
            code,
            participantId: ana.participantId,
            participantToken: ana.participantToken,
            team: "Roxo",
          }),
        )
      ).status,
    ).toBe(409);
  });
  it("inicia uma rodada de palavras prontas sem gravação e ignora material antigo", async () => {
    const response = await handler(
      post("create", {
        settings: {
          difficulty: "mixed",
          questionCount: 10,
          roundSeconds: 30,
          activity: "listening",
          recordedAudioRequired: true,
        },
      }),
    );
    const { code, hostToken } = (await response.json()) as { code: string; hostToken: string };
    await handler(post("join", { code, displayName: "Ana" }));
    const changed = await handler(
      post("settings", {
        code,
        hostToken,
        settings: { subjectName: READY_LISTENING_SOURCE },
        sourceDeck: [{ id: "manual-1", front: "wrong", back: "errado" }],
      }),
    );
    expect(changed.status).toBe(200);
    const changedPayload = (await changed.json()) as {
      sourceDeck: unknown[];
      state: PublicLocalRoomState;
    };
    expect(changedPayload.sourceDeck).toEqual([]);
    expect(changedPayload.state.content?.count).toBe(100);
    const started = await handler(post("start", { code, hostToken }));
    expect(started.status).toBe(200);
    const startedPayload = (await started.json()) as { state: PublicLocalRoomState };
    expect(startedPayload.state.totalQuestions).toBe(10);
    expect(startedPayload.state.currentQuestion?.id).toMatch(/^ready-/);
    expect(startedPayload.state.currentQuestion?.front).not.toBe("wrong");
  });

  it("aplica apenas palavras escolhidas e exige quantidade suficiente", async () => {
    const { code, hostToken } = await createRoomViaApi();
    await handler(post("join", { code, displayName: "Ana" }));
    const selected = ["ready-bus", "ready-book", "ready-cat", "ready-dog", "ready-hello"];
    const response = await handler(
      post("settings", {
        code,
        hostToken,
        settings: { subjectName: READY_LISTENING_SOURCE, readyWordIds: selected },
      }),
    );
    expect(response.status).toBe(200);
    expect(((await response.json()) as { state: PublicLocalRoomState }).state.content?.count).toBe(
      5,
    );
    const start = await handler(post("start", { code, hostToken }));
    expect(start.status).toBe(200);
    expect(selected).toContain(
      ((await start.json()) as { state: PublicLocalRoomState }).state.currentQuestion?.id,
    );
  });

  it("recusa IDs do catálogo inválidos e bloqueia novas entradas após iniciar", async () => {
    const { code, hostToken } = await createRoomViaApi();
    const invalid = await handler(
      post("settings", { code, hostToken, settings: { readyWordIds: ["ready-internal"] } }),
    );
    expect(invalid.status).toBe(400);
    await handler(post("join", { code, displayName: "Ana" }));
    await handler(post("start", { code, hostToken }));
    expect((await handler(post("join", { code, displayName: "Bia" }))).status).toBe(409);
  });

  it("exige gravação do professor antes de iniciar a escuta e não publica o áudio", async () => {
    const response = await handler(
      post("create", {
        settings: {
          difficulty: "mixed",
          questionCount: "all",
          roundSeconds: 30,
          recordedAudioRequired: true,
        },
      }),
    );
    const { code, hostToken } = (await response.json()) as { code: string; hostToken: string };
    await handler(post("join", { code, displayName: "Ana" }));
    const missing = await handler(post("start", { code, hostToken }));
    expect(missing.status).toBe(409);
    const recordings = createRoomRecordingHandler({
      store,
      now: () => currentTime,
      randomId: () => "audio-123456",
    });
    const upload = await recordings(
      post("upload", {
        code,
        credential: hostToken,
        contentType: "audio/webm",
        audio: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x42]).toString("base64"),
      }),
    );
    expect(upload.status).toBe(201);
    const { audioId } = (await upload.json()) as { audioId: string };
    const foreign = await handler(
      post("settings", {
        code,
        hostToken,
        settings: {},
        sourceDeck: [{ id: "a", front: "school", back: "escola", audioId: "foreign-123" }],
      }),
    );
    expect(foreign.status).toBe(400);
    const saved = await handler(
      post("settings", {
        code,
        hostToken,
        settings: {},
        sourceDeck: [{ id: "a", front: "school", back: "escola", audioId }],
      }),
    );
    expect(saved.status).toBe(200);
    const savedPayload = (await saved.json()) as {
      state: PublicLocalRoomState;
      sourceDeck: { audioId: string }[];
    };
    expect(savedPayload.sourceDeck[0]?.audioId).toBe(audioId);
    expect(JSON.stringify(savedPayload.state)).not.toContain(audioId);
    expect((await handler(post("start", { code, hostToken }))).status).toBe(200);
  });
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
    expect(Number(response.headers.get("X-Room-Server-Time"))).toBeGreaterThan(0);
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
      post("create", { settings: { difficulty: "easy", questionCount: 10, roundSeconds: 7 } }),
    );
    expect(invalidRound.status).toBe(400);
    const invalidAudio = await handler(
      post("create", {
        settings: { difficulty: "easy", questionCount: 5, audioRepetitions: 0 },
      }),
    );
    expect(invalidAudio.status).toBe(400);
    const oldSpeedControl = await handler(
      post("create", { settings: { difficulty: "easy", questionCount: 5, audioRate: 0.75 } }),
    );
    expect(oldSpeedControl.status).toBe(400);
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

  it("aceita os novos passos de perguntas e tempo", async () => {
    const response = await handler(
      post("create", { settings: { questionCount: 20, roundSeconds: 5 } }),
    );
    expect(response.status).toBe(201);
    const payload = (await response.json()) as { state: PublicLocalRoomState };
    expect(payload.state.settings.questionCount).toBe(20);
    expect(payload.state.settings.roundSeconds).toBe(5);
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

    const tooEarly = await handler(
      post("answer", { code, participantId, participantToken, questionIndex: 0, answer: "cedo" }),
    );
    expect(tooEarly.status).toBe(409);
    currentTime += ROOM_START_COUNTDOWN_MS;

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
      pointsChange: number;
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
    currentTime += ROOM_START_COUNTDOWN_MS;

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
    currentTime += ROOM_START_COUNTDOWN_MS;
    await handler(
      post("answer", { code, participantId, participantToken, questionIndex: 0, answer: "livro" }),
    );
    const tooSoon = await handler(post("next", { code, hostToken, questionIndex: 0 }));
    expect(tooSoon.status).toBe(200);
    expect((await tooSoon.json()).state).toEqual(
      expect.objectContaining({ phase: "playing", questionIndex: 0 }),
    );
    currentTime += 3_000;
    const resultResponse = await handler(post("next", { code, hostToken, questionIndex: 0 }));
    expect((await resultResponse.json()).state.phase).toBe("results");

    const repeatResponse = await handler(post("repeat", { code, hostToken }));
    expect((await repeatResponse.json()).state).toEqual(
      expect.objectContaining({ code, phase: "playing", questionIndex: 0 }),
    );
  });

  it("recusa repetir após saída ou expiração de presença e aceita após reconectar", async () => {
    const { code, hostToken } = await createRoomViaApi();
    const joined = await (await handler(post("join", { code, displayName: "Ana" }))).json();
    await handler(
      post("settings", {
        code,
        hostToken,
        settings: { questionCount: "all", shuffle: false },
        sourceDeck: [{ id: "one", front: "book", back: "livro" }],
      }),
    );
    await handler(post("start", { code, hostToken }));
    currentTime += ROOM_START_COUNTDOWN_MS;
    await handler(
      post("answer", {
        code,
        participantId: joined.participantId,
        participantToken: joined.participantToken,
        questionIndex: 0,
        answer: "livro",
      }),
    );
    currentTime += 3000;
    await handler(post("next", { code, hostToken, questionIndex: 0 }));
    await handler(
      post("leave", { code, role: "participant", credential: joined.participantToken }),
    );
    expect((await handler(post("repeat", { code, hostToken }))).status).toBe(409);
    await handler(
      post("resume", { code, role: "participant", credential: joined.participantToken }),
    );
    currentTime += 60000;
    await handler(post("heartbeat", { code, role: "host", credential: hostToken }));
    currentTime += 60001;
    expect((await handler(post("repeat", { code, hostToken }))).status).toBe(409);
    await handler(post("resume", { code, role: "host", credential: hostToken }));
    await handler(
      post("resume", { code, role: "participant", credential: joined.participantToken }),
    );
    expect((await handler(post("repeat", { code, hostToken }))).status).toBe(200);
  });

  it("mantém a pergunta sem erro antes do tempo, e avança quando o tempo acaba", async () => {
    const { code, hostToken } = await createRoomViaApi(15);
    await handler(post("join", { code, displayName: "Ana" }));
    await handler(post("join", { code, displayName: "Bia" }));
    await handler(post("start", { code, hostToken }));

    const tooEarly = await handler(post("next", { code, hostToken }));
    expect(tooEarly.status).toBe(200);
    expect((await tooEarly.json()).state.questionIndex).toBe(0);

    currentTime += ROOM_START_COUNTDOWN_MS + 15_000;
    const onTime = await handler(post("next", { code, hostToken }));
    expect(onTime.status).toBe(200);
    const payload = (await onTime.json()) as { state: { questionIndex: number } };
    expect(payload.state.questionIndex).toBe(1);
  });

  it("não pula o feedback ao reconectar após o fim do tempo da pergunta", async () => {
    const { code, hostToken } = await createRoomViaApi(15);
    const joined = await handler(post("join", { code, displayName: "Ana" }));
    const { participantId, participantToken } = (await joined.json()) as {
      participantId: string;
      participantToken: string;
    };
    await handler(post("start", { code, hostToken }));
    currentTime += ROOM_START_COUNTDOWN_MS;
    currentTime += 14_500;
    await handler(
      post("answer", { code, participantId, participantToken, questionIndex: 0, answer: "livro" }),
    );

    currentTime += 500;
    const duringFeedback = await handler(
      post("resume", { code, role: "host", credential: hostToken }),
    );
    expect((await duringFeedback.json()).state.questionIndex).toBe(0);

    currentTime += 2_500;
    const afterFeedback = await handler(
      post("resume", { code, role: "host", credential: hostToken }),
    );
    expect((await afterFeedback.json()).state.questionIndex).toBe(1);
  });

  it("encerra a sala a pedido do host", async () => {
    const { code, hostToken } = await createRoomViaApi();
    await handler(post("join", { code, displayName: "Ana" }));
    const response = await handler(post("end", { code, hostToken }));
    const payload = (await response.json()) as { state: { phase: string } };
    expect(payload.state.phase).toBe("finished");
  });
});

describe("exclusividade de sala por conta logada", () => {
  let authenticatedHandler: (request: Request) => Promise<Response>;

  function postAs(action: string, body: Record<string, unknown>, uid?: string): Request {
    return new Request(`${origin}/api/local-room?action=${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    codeCounter = 0;
    idCounter = 0;
    currentTime = 1_000;
    store = createMemoryRoomStore(() => currentTime);
    publish = vi.fn().mockResolvedValue(undefined);
    authenticatedHandler = createLocalRoomHandler({
      store,
      publish: publish as (code: string, publicState: PublicLocalRoomState) => Promise<void>,
      streamUrl: (code) => `https://helenastudy-rtdb.firebaseio.com/rooms/${code}.json`,
      now: () => currentTime,
      randomCode: () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[codeCounter++]!.repeat(5),
      randomId: () => `id-${idCounter++}`,
      // Fake de teste: o "token" é o próprio UID, sem assinatura de verdade (a verificação
      // real do ID token do Firebase mora em firebase-account-identity.ts).
      authenticate: async (request) => {
        const uid = request.headers.get("authorization")?.replace("Bearer ", "");
        return uid ? { uid, name: uid } : undefined;
      },
    });
  });

  it("recusa a mesma conta entrar de novo enquanto já está na sala por outro dispositivo", async () => {
    const created = await authenticatedHandler(
      postAs("create", { settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 15 } }),
    );
    const { code } = (await created.json()) as { code: string };
    await authenticatedHandler(postAs("join", { code, displayName: "Ana" }, "conta-ana"));

    const secondDevice = await authenticatedHandler(
      postAs("join", { code, displayName: "Ana do celular" }, "conta-ana"),
    );
    expect(secondDevice.status).toBe(409);
    expect((await secondDevice.json()) as { code: string }).toMatchObject({
      code: "already_in_room",
    });
  });

  it("recusa a conta do anfitrião entrar como participante por outro dispositivo", async () => {
    const created = await authenticatedHandler(
      postAs(
        "create",
        { settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 15 } },
        "conta-host",
      ),
    );
    const { code } = (await created.json()) as { code: string };

    const secondDevice = await authenticatedHandler(
      postAs("join", { code, displayName: "Também eu" }, "conta-host"),
    );
    expect(secondDevice.status).toBe(409);
  });

  it("permite contas diferentes entrarem normalmente na mesma sala", async () => {
    const created = await authenticatedHandler(
      postAs("create", { settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 15 } }),
    );
    const { code } = (await created.json()) as { code: string };
    await authenticatedHandler(postAs("join", { code, displayName: "Ana" }, "conta-ana"));

    const other = await authenticatedHandler(
      postAs("join", { code, displayName: "Bia" }, "conta-bia"),
    );
    expect(other.status).toBe(200);
  });

  it("depois que a conta sai da sala, ela pode entrar de novo por outro dispositivo", async () => {
    const created = await authenticatedHandler(
      postAs("create", { settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 15 } }),
    );
    const { code } = (await created.json()) as { code: string };
    const joined = await authenticatedHandler(
      postAs("join", { code, displayName: "Ana" }, "conta-ana"),
    );
    const { participantToken } = (await joined.json()) as { participantToken: string };

    await authenticatedHandler(
      postAs("leave", { code, role: "participant", credential: participantToken }, "conta-ana"),
    );

    const secondDevice = await authenticatedHandler(
      postAs("join", { code, displayName: "Ana do celular" }, "conta-ana"),
    );
    expect(secondDevice.status).toBe(200);
  });

  it("não restringe quem entra sem estar logado (convidado)", async () => {
    const created = await authenticatedHandler(
      postAs("create", { settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 15 } }),
    );
    const { code } = (await created.json()) as { code: string };
    await authenticatedHandler(postAs("join", { code, displayName: "Visitante 1" }));
    const second = await authenticatedHandler(postAs("join", { code, displayName: "Visitante 2" }));
    expect(second.status).toBe(200);
  });

  it("a sala pública nunca expõe o UID da conta", async () => {
    const created = await authenticatedHandler(
      postAs("create", { settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 15 } }),
    );
    const { code } = (await created.json()) as { code: string };
    const joined = await authenticatedHandler(
      postAs("join", { code, displayName: "Ana" }, "conta-ana"),
    );
    const payload = (await joined.json()) as { state: PublicLocalRoomState };
    expect(JSON.stringify(payload.state)).not.toContain("conta-ana");
  });
});
