import { expect, it } from "vitest";
import { BINGO_MODES } from "./number-bingo";
import {
  addLocalParticipant,
  advanceRoomQuestion,
  createRoom,
  roomCountdownValue,
  startRoom,
  toPublicRoomState,
} from "./local-room";

it.each(BINGO_MODES)(
  "%s começa com zero bolas e bloqueia sorteios até terminar 3, 2, 1",
  (bingoMode) => {
    const lobby = addLocalParticipant(
      createRoom(
        { activity: "bingo", bingoMode, difficulty: "mixed", questionCount: 5, roundSeconds: 5 },
        { code: "ABCDE", hostToken: "host", now: 0 },
      ),
      { id: "ana", displayName: "Ana", score: 0 },
      1,
    );
    const started = startRoom(lobby, { now: 1000 });
    expect(toPublicRoomState(started).drawnIds).toEqual([]);
    for (const [now, number] of [
      [1000, 3],
      [2000, 2],
      [3000, 1],
    ] as const) {
      expect(roomCountdownValue(toPublicRoomState(started), now)).toBe(number);
      expect(advanceRoomQuestion(started, now)).toBe(started);
    }
    const first = advanceRoomQuestion(started, 4000);
    expect(toPublicRoomState(first).drawnIds).toHaveLength(1);
    expect(first.countdownStartedAt).toBeUndefined();
    expect(roomCountdownValue(toPublicRoomState(first), 4000)).toBeNull();
  },
);
