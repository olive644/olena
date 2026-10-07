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
import { BINGO_OBJECTIVE_POINTS, roomEffortXp } from "./local-room";

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
  it("XP cresce com esforço e escuta converte mais que bingo", () => {
    expect(roomEffortXp(200, "listening")).toBe(100);
    expect(roomEffortXp(600, "listening")).toBe(300);
    expect(roomEffortXp(600, "bingo")).toBe(210);
    expect(roomEffortXp(0, "listening")).toBe(0);
  });
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
  it.each(BINGO_MODES)("finaliza %s com três ganhadores em ordem e XP por esforço", (mode) => {
    let state = round(false, mode);
    for (let i = 0; i < 75; i++) state = advanceRoomQuestion(state, 3 + i);
    for (const id of ["Caio", "Bia", "Ana"]) {
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
      state = reviewNumberBingo(state, state.bingoClaim!.id, "continue", 102);
    }
    expect(state.phase).toBe("results");
    expect(state.bingoWinnerIds).toEqual(["Caio", "Bia", "Ana"]);
    expect(state.participants.slice(0, 3).map((p) => p.reward?.place)).toEqual([3, 2, 1]);
    const marks = bingoPatterns(mode)[0]!.filter((index) => index !== 12).length;
    const xp = roomEffortXp(marks * 2 + BINGO_OBJECTIVE_POINTS[mode], "bingo");
    expect(state.participants.slice(0, 3).map((p) => p.reward?.xp)).toEqual([xp, xp, xp]);
    expect(new Set(state.participants.slice(0, 3).map((p) => p.reward?.id)).size).toBe(3);
    expect(state.participants[3]!.reward).toBeUndefined();
    expect(
      submitRoomAnswer(state, {
        participantId: "Duda",
        questionIndex: 74,
        answer: "bingo",
        now: 103,
      }).correct,
    ).toBe(false);
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
    expect(state.participants[0]!.reward?.xp).toBe(11);
    const fresh = startRoom({ ...state, phase: "lobby" }, { now: 7 });
    expect(toPublicRoomState(fresh).drawnIds).toEqual([]);
    expect(fresh.bingoWinnerIds).toEqual([]);
    expect(fresh.participants.every((p) => !p.reward && !p.bingoCard?.length)).toBe(true);
  });
});
