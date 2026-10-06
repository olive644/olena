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
    for (let i = 0; i < 74; i++)
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
    expect(won.state.phase).toBe("results");
  });
});
