import { expect, it } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";
import type { PublicLocalRoomState } from "../domain/local-room";
it("protege conferência presencial e finalização, mantém recibos em reenvios", async () => {
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
  const room = (await (
    await post("create", {
      settings: {
        activity: "bingo",
        bingoMode: "full",
        bingoPhysical: true,
        difficulty: "mixed",
        questionCount: 5,
        roundSeconds: 5,
      },
    })
  ).json()) as { code: string; hostToken: string };
  expect((await post("settings", { ...room, settings: { bingoPhysical: "yes" } })).status).toBe(
    400,
  );
  const player = (await (await post("join", { code: room.code, displayName: "Ana" })).json()) as {
    participantId: string;
    participantToken: string;
  };
  let state = ((await (await post("start", room)).json()) as { state: PublicLocalRoomState }).state;
  expect(state.participants[0]!.bingoCard).toEqual([]);
  expect(
    (await post("bingo-finalize", { ...room, hostToken: player.participantToken })).status,
  ).toBe(403);
  expect((await post("bingo-finalize", room)).status).toBe(409);
  await post("next", room);
  state = (
    (await (
      await post("answer", { code: room.code, ...player, questionIndex: 0, answer: "bingo" })
    ).json()) as { state: PublicLocalRoomState }
  ).state;
  const review = { ...room, claimId: state.bingoClaim!.id, decision: "continue" };
  expect(
    (await post("bingo-review", { ...review, hostToken: player.participantToken })).status,
  ).toBe(403);
  expect((await post("bingo-review", review)).status).toBe(200);
  const finished = (
    (await (await post("bingo-finalize", room)).json()) as { state: PublicLocalRoomState }
  ).state;
  expect(finished.phase).toBe("results");
  expect(finished.participants[0]!.reward?.xp).toBe(35);
  const retry = (
    (await (await post("bingo-finalize", room)).json()) as { state: PublicLocalRoomState }
  ).state;
  expect(retry.participants[0]!.reward).toEqual(finished.participants[0]!.reward);
});
