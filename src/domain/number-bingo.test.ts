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
    expect(publicState.drawnIds).toHaveLength(1);
    expect(publicState.bingoWords).toBeUndefined();
  });
  it("allows late marks, prevents duplicate points, requires Bingo and ranks the winner first", () => {
    let state = started();
    for (let i = 0; i < 74; i++) state = advanceRoomQuestion(state, 3 + i);
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
    expect(winner.state.phase).toBe("results");
    expect(winner.state.participants[0]!.score).toBeGreaterThan(24);
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
});
