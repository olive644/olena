import { describe, expect, it } from "vitest";
import {
  addLocalParticipant,
  advanceRoomQuestion,
  createRoom,
  finishNumberBingo,
  reviewNumberBingo,
  startRoom,
  submitRoomAnswer,
  toPublicRoomState,
} from "./local-room";
import { BINGO_MODES, bingoPatterns } from "./number-bingo";

function round(physical: boolean, mode: (typeof BINGO_MODES)[number] = "corners") {
  let state = createRoom(
    {
      activity: "bingo",
      bingoMode: mode,
      bingoPhysical: physical,
      difficulty: "mixed",
      questionCount: 5,
      roundSeconds: 5,
    },
    { code: "ABCDE", hostToken: "host", now: 0 },
  );
  for (const id of ["Ana", "Bia", "Caio", "Duda", "Eva"])
    state = addLocalParticipant(state, { id, displayName: id, score: 0 }, 1);
  return startRoom(state, { now: 2, random: () => 0 });
}

describe("Bingo presencial e ganhadores", () => {
  it("não disponibiliza cartelas nem aceita marcação digital e exige sorteio antes do anúncio", () => {
    const state = round(true);
    expect(toPublicRoomState(state).participants.every((p) => p.bingoCard?.length === 0)).toBe(
      true,
    );
    expect(
      submitRoomAnswer(state, { participantId: "Ana", questionIndex: 0, answer: "bingo", now: 3 })
        .correct,
    ).toBe(false);
    const drawn = advanceRoomQuestion(state, 4);
    expect(
      submitRoomAnswer(drawn, { participantId: "Ana", questionIndex: 0, answer: "1", now: 5 })
        .correct,
    ).toBe(false);
    const claim = submitRoomAnswer(drawn, {
      participantId: "Ana",
      questionIndex: 0,
      answer: "bingo",
      now: 6,
    }).state;
    expect(claim.bingoClaim?.participantId).toBe("Ana");
    const rejected = reviewNumberBingo(claim, claim.bingoClaim!.id, "reject", 7);
    expect(rejected.bingoWinnerIds).toEqual([]);
    expect(finishNumberBingo(rejected, 8)).toBe(rejected);
  });
  it.each(BINGO_MODES)("finaliza %s com quatro ganhadores, mesmo XP e recibos estáveis", (mode) => {
    let state = round(false, mode);
    for (let i = 0; i < 75; i++) state = advanceRoomQuestion(state, 3 + i);
    for (const id of ["Ana", "Bia", "Caio", "Duda"]) {
      const card = state.participants.find((p) => p.id === id)!.bingoCard!;
      for (const index of bingoPatterns(mode)[0]!)
        if (index !== 12)
          state = submitRoomAnswer(state, {
            participantId: id,
            questionIndex: 74,
            answer: card[index]!,
            now: 100,
          }).state;
      state = submitRoomAnswer(state, {
        participantId: id,
        questionIndex: 74,
        answer: "bingo",
        now: 101,
      }).state;
      expect(state.bingoClaim?.participantId).toBe(id);
      state = reviewNumberBingo(
        state,
        state.bingoClaim!.id,
        id === "Duda" ? "finish" : "continue",
        102,
      );
    }
    expect(state.phase).toBe("results");
    expect(state.bingoWinnerIds).toEqual(["Ana", "Bia", "Caio", "Duda"]);
    expect(state.participants.slice(0, 4).map((p) => p.reward?.xp)).toEqual([100, 100, 100, 100]);
    expect(new Set(state.participants.slice(0, 4).map((p) => p.reward?.id)).size).toBe(4);
    expect(state.participants[4]!.reward).toBeUndefined();
    expect(finishNumberBingo(state, 200)).toBe(state);
  });
  it("confirma cartela de papel e recomeça sem números usados ou XP antigo", () => {
    let state = advanceRoomQuestion(round(true), 3);
    state = submitRoomAnswer(state, {
      participantId: "Ana",
      questionIndex: 0,
      answer: "bingo",
      now: 4,
    }).state;
    state = reviewNumberBingo(state, state.bingoClaim!.id, "continue", 5);
    state = finishNumberBingo(state, 6);
    expect(state.participants[0]!.reward?.xp).toBe(100);
    const fresh = startRoom({ ...state, phase: "lobby" }, { now: 7 });
    expect(toPublicRoomState(fresh).drawnIds).toEqual([]);
    expect(fresh.bingoWinnerIds).toEqual([]);
    expect(fresh.participants.every((p) => !p.reward && !p.bingoCard?.length)).toBe(true);
  });
});
