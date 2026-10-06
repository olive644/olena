import { describe, expect, it } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";
import type { PublicLocalRoomState } from "../domain/local-room";

describe("number bingo transport", () => {
  it("persists every mode and checks marks/claims with authenticated server state", async () => {
    let now = 1_000;
    const handler = createLocalRoomHandler({
      store: createMemoryRoomStore(),
      publish: async () => {},
      streamUrl: () => "/stream",
      now: () => now,
    });
    const post = (action: string, body: unknown) =>
      handler(
        new Request("https://example.test/api/local-room?action=" + action, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    const created = (await (
      await post("create", {
        settings: {
          activity: "bingo",
          bingoMode: "line",
          difficulty: "mixed",
          questionCount: 5,
          roundSeconds: 5,
        },
      })
    ).json()) as { code: string; hostToken: string };
    for (const mode of ["line", "column", "diagonal", "corners", "full"]) {
      const response = await post("settings", { ...created, settings: { bingoMode: mode } });
      expect(response.status).toBe(200);
      const payload = (await response.json()) as { state: PublicLocalRoomState };
      expect(payload.state.settings.bingoMode).toBe(mode);
    }
    expect((await post("settings", { ...created, settings: { bingoMode: "fake" } })).status).toBe(
      400,
    );
    await post("settings", { ...created, settings: { bingoMode: "line" } });
    const joined = (await (
      await post("join", { code: created.code, displayName: "Ana" })
    ).json()) as { participantId: string; participantToken: string };
    let state = ((await (await post("start", created)).json()) as { state: PublicLocalRoomState })
      .state;
    now += 60_000;
    const heartbeat = await post("heartbeat", {
      code: created.code,
      role: "host",
      credential: created.hostToken,
    });
    state = ((await heartbeat.json()) as { state: PublicLocalRoomState }).state;
    expect(state.questionIndex).toBe(0);
    expect(state.drawnIds).toEqual([]);
    expect(state.bingoDrawCount).toBe(0);
    const submit = (answer: string, participantToken = joined.participantToken) =>
      post("answer", {
        code: created.code,
        ...joined,
        participantToken,
        questionIndex: state.questionIndex,
        answer,
      });
    expect((await submit("bingo", "bad")).status).toBe(403);
    expect(((await (await submit("bingo")).json()) as { correct: boolean }).correct).toBe(false);
    for (let i = 0; i < 75; i++)
      state = (
        (await (await post("next", { ...created, questionIndex: state.questionIndex })).json()) as {
          state: PublicLocalRoomState;
        }
      ).state;
    expect(new Set(state.drawnIds).size).toBe(75);
    expect(state.bingoWords).toBeUndefined();
    state = (
      (await (await post("next", { ...created, questionIndex: state.questionIndex })).json()) as {
        state: PublicLocalRoomState;
      }
    ).state;
    expect(state.phase).toBe("playing");
    expect(state.questionIndex).toBe(74);
    expect(state.drawnIds).toHaveLength(75);
    for (const id of state.participants[0]!.bingoCard!.slice(0, 5)) {
      const response = await submit(id);
      expect(response.status).toBe(200);
      expect(((await response.json()) as { correct: boolean }).correct).toBe(true);
    }
    const won = (await (await submit("bingo")).json()) as {
      correct: boolean;
      state: PublicLocalRoomState;
    };
    expect(won.correct).toBe(true);
    expect(won.state.phase).toBe("playing");
    expect(won.state.participants[0]!.score).toBe(5);
    const review = (
      decision: string,
      hostToken = created.hostToken,
      claimId = won.state.bingoClaim!.id,
    ) => post("bingo-review", { ...created, hostToken, claimId, decision });
    expect((await review("continue", "bad")).status).toBe(403);
    expect((await review("unknown")).status).toBe(400);
    const rejected = ((await (await review("reject")).json()) as { state: PublicLocalRoomState })
      .state;
    expect(rejected.bingoClaim).toBeUndefined();
    expect(rejected.bingoWinnerIds).toEqual([]);
    const again = (await (await submit("bingo")).json()) as {
      correct: boolean;
      state: PublicLocalRoomState;
    };
    expect(again.correct).toBe(true);
    const accepted = (
      (await (await review("continue", created.hostToken, again.state.bingoClaim!.id)).json()) as {
        state: PublicLocalRoomState;
      }
    ).state;
    expect(accepted.bingoWinnerIds).toEqual([joined.participantId]);
    expect(accepted.participants[0]!.score).toBe(105);
    expect(accepted.phase).toBe("playing");
    expect(accepted.drawnIds).toEqual(won.state.drawnIds);
    expect(((await (await submit("bingo")).json()) as { correct: boolean }).correct).toBe(false);
  });
  it("deduplicates the first draw and restarts a confirmed review with zero balls", async () => {
    const handler = createLocalRoomHandler({
      store: createMemoryRoomStore(),
      publish: async () => {},
      streamUrl: () => "/stream",
    });
    const post = (action: string, body: unknown) =>
      handler(
        new Request("https://example.test/api/local-room?action=" + action, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    const created = (await (
      await post("create", {
        settings: {
          activity: "bingo",
          bingoMode: "corners",
          difficulty: "mixed",
          questionCount: 5,
          roundSeconds: 5,
        },
      })
    ).json()) as { code: string; hostToken: string };
    const joined = (await (
      await post("join", { code: created.code, displayName: "Ana" })
    ).json()) as { participantId: string; participantToken: string };
    await post("start", created);
    const next = { ...created, questionIndex: 0, bingoDrawCount: 0 };
    await Promise.all([post("next", next), post("next", next)]);
    const snapshot = async () =>
      (
        (await (
          await post("heartbeat", {
            code: created.code,
            role: "host",
            credential: created.hostToken,
          })
        ).json()) as { state: PublicLocalRoomState }
      ).state;
    let state = await snapshot();
    expect(state.drawnIds).toHaveLength(1);
    for (let i = 1; i < 75; i++) await post("next", created);
    state = await snapshot();
    const answer = (value: string) =>
      post("answer", {
        code: created.code,
        ...joined,
        questionIndex: state.questionIndex,
        answer: value,
      });
    for (const i of [0, 4, 20, 24]) await answer(state.participants[0]!.bingoCard![i]!);
    state = ((await (await answer("bingo")).json()) as { state: PublicLocalRoomState }).state;
    const restart = { ...created, claimId: state.bingoClaim!.id, decision: "restart" };
    const restarted = (
      (await (await post("bingo-review", restart)).json()) as { state: PublicLocalRoomState }
    ).state;
    expect(restarted.drawnIds).toEqual([]);
    expect(restarted.participants[0]!.bingoMarks).toEqual([]);
    expect(restarted.participants[0]!.score).toBe(0);
    expect(restarted.currentQuestion).toBeUndefined();
    expect(restarted.roundId).not.toBe(state.roundId);
    expect(restarted.bingoWinnerIds).toEqual([]);
    const retry = (
      (await (await post("bingo-review", restart)).json()) as { state: PublicLocalRoomState }
    ).state;
    expect(retry.revision).toBe(restarted.revision);
    expect(retry.roundId).toBe(restarted.roundId);
    expect(retry.participants[0]!.bingoCard).toEqual(restarted.participants[0]!.bingoCard);
  });
});
