import { describe, expect, it } from "vitest";
import {
  BINGO_FREE,
  BINGO_MODES,
  bingoPatterns,
  createNumberBingoCard,
  hasNumberBingo,
} from "./number-bingo";
import {
  addLocalParticipant,
  advanceRoomQuestion,
  canAdvanceRoomQuestion,
  createRoom,
  startRoom,
  submitRoomAnswer,
  toPublicRoomState,
  reviewNumberBingo,
} from "./local-room";

function started() {
  return startRoom(
    addLocalParticipant(
      createRoom(
        {
          activity: "bingo",
          bingoMode: "line",
          difficulty: "mixed",
          questionCount: 5,
          roundSeconds: 5,
        },
        { code: "ABCDE", hostToken: "host", now: 0 },
      ),
      { id: "p", displayName: "Ana", score: 0 },
      1,
    ),
    { now: 2, random: () => 0 },
  );
}

describe("number bingo", () => {
  it("creates a 5x5 card with unique numbers in the BINGO ranges and a free center", () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const card = createNumberBingoCard();
      expect(card).toHaveLength(25);
      expect(card[12]).toBe(BINGO_FREE);
      expect(new Set(card).size).toBe(25);
      card.forEach((id, i) => {
        if (i !== 12) {
          expect(Number(id)).toBeGreaterThanOrEqual((i % 5) * 15 + 1);
          expect(Number(id)).toBeLessThanOrEqual((i % 5) * 15 + 15);
        }
      });
    }
  });
  it.each(BINGO_MODES)(
    "validates every %s pattern, rejects missing marks and undrawn numbers",
    (mode) => {
      const card = createNumberBingoCard(() => 0);
      for (const pattern of bingoPatterns(mode)) {
        const marks = pattern.filter((i) => i !== 12).map((i) => card[i]!);
        expect(hasNumberBingo(card, marks, marks, mode)).toBe(true);
        expect(hasNumberBingo(card, marks.slice(1), marks, mode)).toBe(false);
        expect(hasNumberBingo(card, marks, marks.slice(1), mode)).toBe(false);
      }
      expect(hasNumberBingo([], [], [], mode)).toBe(false);
    },
  );
  it("draws 75 unique numbers, ignores the word count and does not auto-advance on timeout", () => {
    const state = started();
    expect(state.deck).toHaveLength(75);
    expect(new Set(state.deck.map((card) => card.id)).size).toBe(75);
    expect(state.participants[0]!.bingoCard).toHaveLength(25);
    expect(canAdvanceRoomQuestion(state, 100_000)).toBe(false);
    const publicState = toPublicRoomState(state);
    expect(publicState.drawnIds).toHaveLength(0);
    expect(publicState.currentQuestion).toBeUndefined();
    expect(toPublicRoomState(advanceRoomQuestion(state, 3)).drawnIds).toHaveLength(1);
    expect(publicState.bingoWords).toBeUndefined();
  });
  it("allows late marks, requires Bingo and waits for the host instead of ending on a podium", () => {
    let state = started();
    for (let i = 0; i < 75; i++) state = advanceRoomQuestion(state, 3 + i);
    const row = state.participants[0]!.bingoCard!.slice(0, 5);
    const answer = (id: string) =>
      submitRoomAnswer(state, { participantId: "p", questionIndex: 74, answer: id, now: 100_000 });
    expect(answer("bingo").correct).toBe(false);
    for (const id of row) state = answer(id).state;
    expect(state.phase).toBe("playing");
    const duplicate = answer(row[0]!);
    expect(duplicate.pointsChange).toBe(0);
    expect(duplicate.state.participants[0]!.score).toBe(5);
    const winner = answer("bingo");
    expect(winner.correct).toBe(true);
    expect(winner.state.phase).toBe("playing");
    expect(winner.state.bingoClaim?.participantId).toBe("p");
    expect(winner.state.participants[0]!.score).toBe(5);
    expect(advanceRoomQuestion(winner.state, 100_001)).toBe(winner.state);
    const accepted = reviewNumberBingo(
      winner.state,
      winner.state.bingoClaim!.id,
      "continue",
      100_002,
    );
    expect(accepted.phase).toBe("playing");
    expect(accepted.bingoWinnerIds).toEqual(["p"]);
    expect(accepted.participants[0]!.score).toBe(105);
    expect(accepted.bingoClaim).toBeUndefined();
    expect(
      submitRoomAnswer(accepted, {
        participantId: "p",
        questionIndex: 74,
        answer: "bingo",
        now: 100_003,
      }).correct,
    ).toBe(false);
    const rejected = reviewNumberBingo(
      winner.state,
      winner.state.bingoClaim!.id,
      "reject",
      100_004,
    );
    expect(rejected.bingoWinnerIds).toEqual([]);
    expect(rejected.participants[0]!.score).toBe(5);
    const restarted = reviewNumberBingo(
      winner.state,
      winner.state.bingoClaim!.id,
      "restart",
      100_005,
    );
    expect(toPublicRoomState(restarted).drawnIds).toEqual([]);
    expect(restarted.participants[0]!.bingoMarks).toEqual([]);
    expect(restarted.participants[0]!.score).toBe(0);
    expect(reviewNumberBingo(winner.state, "stale", "reject", 100_006)).toBe(winner.state);
  });
  it("rejects undrawn numbers and foreign participant/card entries", () => {
    const state = started();
    const attempt = (participantId: string, answer: string) =>
      submitRoomAnswer(state, { participantId, answer, questionIndex: 0, now: 3 });
    expect(attempt("p", state.deck[1]!.id).correct).toBe(false);
    expect(attempt("unknown", state.deck[0]!.id).correct).toBe(false);
    expect(attempt("p", BINGO_FREE).correct).toBe(false);
    expect(attempt("p", "bingo").state).toBe(state);
  });
  it.each(BINGO_MODES)("requires a host decision for %s and allows a second winner", (mode) => {
    let state = started();
    state = {
      ...state,
      settings: { ...state.settings, bingoMode: mode },
      participants: [
        ...state.participants,
        { ...state.participants[0]!, id: "p2", displayName: "Bia" },
      ],
    };
    for (let i = 0; i < 75; i++) state = advanceRoomQuestion(state, 3 + i);
    for (const participantId of ["p", "p2"]) {
      const card = state.participants.find((p) => p.id === participantId)!.bingoCard!;
      for (const i of bingoPatterns(mode)[0]!)
        if (i !== 12)
          state = submitRoomAnswer(state, {
            participantId,
            questionIndex: 74,
            answer: card[i]!,
            now: 100,
          }).state;
      expect(state.bingoClaim).toBeUndefined();
      state = submitRoomAnswer(state, {
        participantId,
        questionIndex: 74,
        answer: "bingo",
        now: 101,
      }).state;
      expect(state.phase).toBe("playing");
      expect(state.bingoClaim?.participantId).toBe(participantId);
      expect(
        submitRoomAnswer(state, {
          participantId: "p2",
          questionIndex: 74,
          answer: "bingo",
          now: 102,
        }).correct,
      ).toBe(false);
      state = reviewNumberBingo(state, state.bingoClaim!.id, "continue", 103);
    }
    expect(state.bingoWinnerIds).toEqual(["p", "p2"]);
  });
});
