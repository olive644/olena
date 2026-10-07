import { expect, it } from "vitest";
import {
  createRoom,
  addLocalParticipant,
  startRoom,
  advanceRoomQuestion,
  submitRoomAnswer,
  reviewNumberBingo,
  toPublicRoomState,
} from "./local-room";
import { BINGO_MODES, BINGO_FREE, bingoPatterns } from "./number-bingo";

it.each(BINGO_MODES)("pedidos quase simultâneos em %s não se perdem e mantêm ordem", (mode) => {
  let state = createRoom(
    { activity: "bingo", bingoMode: mode, difficulty: "mixed", questionCount: 5, roundSeconds: 5 },
    { code: "ABCDE", hostToken: "host", now: 0 },
  );
  for (const id of ["Ana", "Bia", "Caio", "Duda"])
    state = addLocalParticipant(state, { id, displayName: id, score: 0 }, 1);
  state = startRoom(state, { now: 2, random: () => 0 });
  for (let i = 0; i < 75; i++) state = advanceRoomQuestion(state, 10 + i);
  const answer = (participantId: string, answer: string) => {
    const result = submitRoomAnswer(state, {
      participantId,
      answer,
      questionIndex: state.questionIndex,
      now: 100,
    });
    state = result.state;
    return result;
  };
  // Cada pessoa termina a marcação e pede Bingo enquanto a primeira ainda está em conferência.
  for (const id of ["Bia", "Caio", "Ana", "Duda"]) {
    const card = state.participants.find((p) => p.id === id)!.bingoCard!;
    for (const index of bingoPatterns(mode)[0]!)
      if (card[index] !== BINGO_FREE) expect(answer(id, card[index]!).correct).toBe(true);
    expect(answer(id, "bingo").correct).toBe(true);
    expect(answer(id, "bingo").correct).toBe(true);
  }
  expect(state.bingoClaim?.participantId).toBe("Bia");
  expect(state.bingoClaimQueue?.map((c) => c.participantId)).toEqual(["Caio", "Ana", "Duda"]);
  expect(toPublicRoomState(state).bingoClaimQueue).toEqual(state.bingoClaimQueue);
  const own = state.participants.find((p) => p.id === "Bia")!;
  const unmarked = own.bingoCard!.find((id) => id !== BINGO_FREE && !own.bingoMarks?.includes(id));
  if (unmarked) {
    const frozen = answer("Bia", unmarked);
    expect(frozen.correct).toBe(false);
    expect(frozen.pointsChange).toBe(0);
  }
  expect(advanceRoomQuestion(state, 110)).toBe(state);
  for (const id of ["Bia", "Caio", "Ana"]) {
    expect(state.bingoClaim?.participantId).toBe(id);
    state = reviewNumberBingo(state, state.bingoClaim!.id, "continue", 120);
  }
  expect(state.phase).toBe("results");
  expect(state.bingoWinnerIds).toEqual(["Bia", "Caio", "Ana"]);
  expect(state.bingoClaimQueue).toEqual([]);
  expect(state.participants.find((p) => p.id === "Duda")!.reward).toBeUndefined();
  expect(state.participants.find((p) => p.id === "Bia")!.reward?.place).toBe(1);
});

it("recusa, reinício e encerramento não deixam pedidos antigos na fila", () => {
  let state = createRoom(
    {
      activity: "bingo",
      bingoMode: "corners",
      bingoPhysical: true,
      difficulty: "mixed",
      questionCount: 5,
      roundSeconds: 5,
    },
    { code: "ABCDE", hostToken: "host", now: 0 },
  );
  for (const id of ["Ana", "Bia"])
    state = addLocalParticipant(state, { id, displayName: id, score: 0 }, 1);
  state = advanceRoomQuestion(startRoom(state, { now: 2 }), 3);
  for (const id of ["Ana", "Bia"])
    state = submitRoomAnswer(state, {
      participantId: id,
      questionIndex: 0,
      answer: "bingo",
      now: 4,
    }).state;
  const staleId = state.bingoClaim!.id;
  const rejected = reviewNumberBingo(state, staleId, "reject", 5);
  expect(rejected.bingoClaim?.participantId).toBe("Bia");
  expect(rejected.bingoWinnerIds).toEqual([]);
  expect(reviewNumberBingo(rejected, staleId, "continue", 6)).toBe(rejected);
  const restarted = reviewNumberBingo(state, staleId, "restart", 5);
  expect(restarted.bingoClaimQueue).toEqual([]);
  expect(restarted.bingoDrawCount).toBe(0);
  const finished = reviewNumberBingo(state, staleId, "finish", 5);
  expect(finished.phase).toBe("results");
  expect(finished.bingoWinnerIds).toEqual(["Ana"]);
  expect(finished.bingoClaimQueue).toEqual([]);
});
