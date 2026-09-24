import { describe, expect, it, vi } from "vitest";
import {
  addLocalParticipant,
  advanceRoomQuestion,
  buildLocalRoomJoinUrl,
  canAdvanceRoomQuestion,
  CORRECT_ANSWER_XP,
  createLocalRoomCode,
  createRoom,
  endRoom,
  isValidLocalRoomCode,
  LEADER_WRONG_ANSWER_PENALTY_XP,
  normalizeLocalRoomCode,
  rankLocalRoomParticipants,
  repeatRoom,
  readLocalRoomCodeFromUrl,
  returnRoomToLobby,
  roomSecondsLeft,
  sanitizeDisplayName,
  startRoom,
  submitRoomAnswer,
  toPublicRoomState,
  updateRoomSettings,
  type LocalRoomSettings,
} from "./local-room";

const settings: LocalRoomSettings = { difficulty: "mixed", questionCount: 5, roundSeconds: 30 };

function room() {
  return createRoom(settings, { code: "ABCDE", hostToken: "secret", now: 1 });
}

function participant(id = "p1", displayName = "Ana") {
  return { id, displayName, score: 0 };
}

function startedWithTwo() {
  const withTwo = addLocalParticipant(
    addLocalParticipant(room(), participant("p1", "Ana"), 2),
    participant("p2", "Bia"),
    2,
  );
  return startRoom(withTwo, { now: 3, random: () => 0 });
}

describe("sala local", () => {
  it("gera e valida um código curto sem caracteres ambíguos", () => {
    const code = createLocalRoomCode(() => 0);
    expect(code).toBe("AAAAA");
    expect(isValidLocalRoomCode(code)).toBe(true);
    expect(isValidLocalRoomCode("O0I1")).toBe(false);
    expect(normalizeLocalRoomCode(" ab-c d ")).toBe("ABCD");
    expect(isValidLocalRoomCode(" ab-c de ")).toBe(true);
  });

  it("sorteia o código com fonte criptográfica, sem Math.random", () => {
    const mathRandom = vi.spyOn(Math, "random");
    const getRandomValues = vi.spyOn(globalThis.crypto, "getRandomValues");
    const codes = Array.from({ length: 200 }, () => createLocalRoomCode());
    expect(mathRandom).not.toHaveBeenCalled();
    expect(getRandomValues).toHaveBeenCalledTimes(200);
    expect(codes.every((code) => isValidLocalRoomCode(code))).toBe(true);
    // 1000 sorteios em 32 símbolos: um gerador quebrado ficaria bem abaixo disso.
    expect(new Set(codes.join("")).size).toBeGreaterThan(24);
    mathRandom.mockRestore();
    getRandomValues.mockRestore();
  });

  it("mapeia cada byte sorteado para um símbolo do alfabeto de 32 letras", () => {
    const bytes = [0, 1, 31, 32, 255];
    const getRandomValues = vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(((
      array: Uint8Array,
    ) => {
      array.set(bytes);
      return array;
    }) as typeof globalThis.crypto.getRandomValues);
    // 0 -> A, 1 -> B, 31 -> 9, 32 -> A (volta ao início), 255 -> 9
    expect(createLocalRoomCode()).toBe("AB9A9");
    getRandomValues.mockRestore();
  });

  it("filtra e limita o nome temporário", () => {
    expect(sanitizeDisplayName(" <Ana>   estudante com um nome enorme ")).toBe(
      "Ana estudante com um nom",
    );
  });

  it("não duplica participante e bloqueia entrada após o início", () => {
    const joined = addLocalParticipant(room(), participant(), 2);
    expect(addLocalParticipant(joined, participant(), 3).participants).toHaveLength(1);
    const started = startRoom(joined, { now: 4, random: () => 0 });
    expect(addLocalParticipant(started, participant("p2", "Bia"), 5).participants).toHaveLength(1);
  });

  it("só deixa alterar configurações no lobby", () => {
    const updated = updateRoomSettings(room(), { difficulty: "easy" }, 2);
    expect(updated.settings.difficulty).toBe("easy");
    const started = startRoom(addLocalParticipant(updated, participant(), 3), {
      now: 4,
      random: () => 0,
    });
    expect(updateRoomSettings(started, { difficulty: "hard" }, 5).settings.difficulty).toBe("easy");
  });

  it("não inicia sem participantes e monta o baralho com o tamanho pedido", () => {
    expect(startRoom(room(), { now: 2, random: () => 0 }).phase).toBe("lobby");
    const withParticipant = addLocalParticipant(room(), participant(), 2);
    const started = startRoom(withParticipant, { now: 3, random: () => 0 });
    expect(started.phase).toBe("playing");
    expect(started.deck).toHaveLength(5);
    expect(started.participants[0]?.score).toBe(0);
    expect(started.questionStartedAt).toBe(3);
  });

  it("dá XP ao acertar e nada ao errar sem estar liderando", () => {
    const started = startedWithTwo();
    const card = started.deck[0]!;
    const first = submitRoomAnswer(started, {
      participantId: "p1",
      questionIndex: 0,
      answer: card.back,
      now: 4,
    });
    expect(first.correct).toBe(true);
    expect(first.xpChange).toBe(CORRECT_ANSWER_XP);
    expect(first.state.participants.find((item) => item.id === "p1")?.score).toBe(
      CORRECT_ANSWER_XP,
    );
    expect(first.state.answeredParticipantIds).toEqual(["p1"]);

    const second = submitRoomAnswer(first.state, {
      participantId: "p2",
      questionIndex: 0,
      answer: "resposta errada",
      now: 5,
    });
    expect(second.correct).toBe(false);
    expect(second.xpChange).toBe(0);
    expect(second.state.participants.find((item) => item.id === "p2")?.score).toBe(0);
  });

  it("recusa uma segunda resposta do mesmo participante", () => {
    const started = startedWithTwo();
    const card = started.deck[0]!;
    const first = submitRoomAnswer(started, {
      participantId: "p1",
      questionIndex: 0,
      answer: card.back,
      now: 4,
    });
    const again = submitRoomAnswer(first.state, {
      participantId: "p1",
      questionIndex: 0,
      answer: card.back,
      now: 5,
    });
    expect(again.correct).toBe(false);
    expect(again.state).toBe(first.state);
  });

  it("tira XP de quem está liderando se errar, e trava em zero", () => {
    const started = startedWithTwo();
    const card = started.deck[0]!;
    const leading = submitRoomAnswer(started, {
      participantId: "p1",
      questionIndex: 0,
      answer: card.back,
      now: 4,
    });
    expect(leading.state.participants.find((item) => item.id === "p1")?.score).toBe(
      CORRECT_ANSWER_XP,
    );

    const stillTwoAnswered = submitRoomAnswer(leading.state, {
      participantId: "p2",
      questionIndex: leading.state.questionIndex,
      answer: "errada",
      now: 5,
    });
    // p2 não lidera (0 contra CORRECT_ANSWER_XP de p1), então não perde nada.
    expect(stillTwoAnswered.xpChange).toBe(0);

    const nextState = advanceRoomQuestion(stillTwoAnswered.state, 6);
    const nextCard = nextState.deck[nextState.questionIndex]!;
    const p1Wrong = submitRoomAnswer(nextState, {
      participantId: "p1",
      questionIndex: nextState.questionIndex,
      answer: "errada",
      now: 7,
    });
    expect(p1Wrong.xpChange).toBe(-LEADER_WRONG_ANSWER_PENALTY_XP);
    expect(p1Wrong.state.participants.find((item) => item.id === "p1")?.score).toBe(
      Math.max(0, CORRECT_ANSWER_XP - LEADER_WRONG_ANSWER_PENALTY_XP),
    );
    expect(nextCard).toBeTruthy();
  });

  it("mantém a pergunta para mostrar feedback quando todo mundo responde", () => {
    const started = startedWithTwo();
    const card = started.deck[0]!;
    const first = submitRoomAnswer(started, {
      participantId: "p1",
      questionIndex: 0,
      answer: card.back,
      now: 4,
    });
    expect(first.state.questionIndex).toBe(0);
    const second = submitRoomAnswer(first.state, {
      participantId: "p2",
      questionIndex: 0,
      answer: card.back,
      now: 5,
    });
    expect(second.state.questionIndex).toBe(0);
    expect(second.state.answeredParticipantIds).toEqual(["p1", "p2"]);
    expect(second.question).toEqual({ front: card.front, back: card.back });
  });

  it("aplica a tolerância de digitação escolhida pelo professor", () => {
    const started = startedWithTwo();
    const card = started.deck[0]!;
    const typo = card.back.slice(0, -1);
    const strict = submitRoomAnswer(started, {
      participantId: "p1",
      questionIndex: 0,
      answer: typo,
      now: 4,
    });
    expect(strict.correct).toBe(false);
    const tolerant = submitRoomAnswer(
      { ...started, settings: { ...started.settings, acceptMinorTypos: true } },
      { participantId: "p1", questionIndex: 0, answer: typo, now: 4 },
    );
    expect(tolerant.correct).toBe(true);
  });

  it("recusa resposta de participante desconhecido ou de pergunta errada", () => {
    const started = startedWithTwo();
    const card = started.deck[0]!;
    const stranger = submitRoomAnswer(started, {
      participantId: "ghost",
      questionIndex: 0,
      answer: card.back,
      now: 4,
    });
    expect(stranger.state).toBe(started);
    const wrongIndex = submitRoomAnswer(started, {
      participantId: "p1",
      questionIndex: 1,
      answer: card.back,
      now: 4,
    });
    expect(wrongIndex.state).toBe(started);
  });

  it("só deixa avançar manualmente se o tempo acabou ou todo mundo respondeu", () => {
    const started = startedWithTwo();
    expect(canAdvanceRoomQuestion(started, 4)).toBe(false);
    expect(canAdvanceRoomQuestion(started, started.questionStartedAt + 30_000)).toBe(true);

    const card = started.deck[0]!;
    const oneAnswered = submitRoomAnswer(started, {
      participantId: "p1",
      questionIndex: 0,
      answer: card.back,
      now: 4,
    }).state;
    expect(canAdvanceRoomQuestion(oneAnswered, 5)).toBe(false);
    expect(
      canAdvanceRoomQuestion(
        {
          ...oneAnswered,
          participants: oneAnswered.participants.map((participant) =>
            participant.id === "p2" ? { ...participant, online: false } : participant,
          ),
        },
        5,
      ),
    ).toBe(true);
  });

  it("avança perguntas e mostra o resultado no fim do baralho", () => {
    let state = startedWithTwo();
    for (let index = 0; index < 5; index += 1) {
      expect(state.phase).toBe("playing");
      state = advanceRoomQuestion(state, 4 + index);
    }
    expect(state.phase).toBe("results");
  });

  it("repete a atividade ou volta ao lobby sem recriar a sala", () => {
    let results = startedWithTwo();
    for (let index = 0; index < 5; index += 1) results = advanceRoomQuestion(results, 4 + index);
    const lobby = returnRoomToLobby(results, 20);
    expect(lobby.phase).toBe("lobby");
    expect(lobby.participants).toHaveLength(2);
    const repeated = repeatRoom(results, { now: 21, random: () => 0 });
    expect(repeated.phase).toBe("playing");
    expect(repeated.participants.every((item) => item.score === 0)).toBe(true);
  });

  it("permite encerrar a sala a qualquer momento", () => {
    expect(endRoom(room(), 2).phase).toBe("finished");
  });

  it("monta o link de convite com o código em maiúsculas", () => {
    expect(buildLocalRoomJoinUrl("https://olenastudy.vercel.app/", "abcde")).toBe(
      "https://olenastudy.vercel.app/?sala=ABCDE",
    );
  });

  it("lê o código de convite da URL só quando é válido", () => {
    expect(readLocalRoomCodeFromUrl("https://olenastudy.vercel.app/?sala=abcde")).toBe("ABCDE");
    expect(readLocalRoomCodeFromUrl("https://olenastudy.vercel.app/")).toBeUndefined();
    expect(readLocalRoomCodeFromUrl("https://olenastudy.vercel.app/?sala=xx")).toBeUndefined();
  });

  it("classifica os participantes do maior pro menor placar", () => {
    const ranked = rankLocalRoomParticipants([
      { id: "p1", displayName: "Ana", score: 10 },
      { id: "p2", displayName: "Bia", score: 30 },
      { id: "p3", displayName: "Caio", score: 20 },
    ]);
    expect(ranked.map((item) => item.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("nunca expõe o baralho completo nem o token do host no estado público", () => {
    const started = startedWithTwo();
    const publicState = toPublicRoomState(started);
    expect(publicState).not.toHaveProperty("deck");
    expect(publicState).not.toHaveProperty("hostToken");
    expect(publicState.currentQuestion).toEqual({
      id: started.deck[0]!.id,
      front: started.deck[0]!.front,
    });
    expect(publicState.totalQuestions).toBe(5);
    expect(publicState.questionStartedAt).toBe(started.questionStartedAt);
  });

  it("limita o cronômetro ao tempo configurado mesmo com relógio adiantado", () => {
    const state = toPublicRoomState(startedWithTwo());
    expect(roomSecondsLeft(state, state.questionStartedAt - 500)).toBe(30);
    expect(roomSecondsLeft(state, state.questionStartedAt + 1)).toBe(30);
    expect(roomSecondsLeft(state, state.questionStartedAt + 30_000)).toBe(0);
  });
});
