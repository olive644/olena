import { expect, it } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";
import type { PublicLocalRoomState } from "../domain/local-room";

it("salva três pedidos concorrentes sem sobrescrever outro e sem duplicar pontos", async () => {
  let time = 1000;
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(() => time),
    now: () => time,
    publish: async () => {},
    streamUrl: () => "/stream",
  });
  const post = async (action: string, body: object) => {
    const response = await handler(
      new Request("https://test/api/local-room?action=" + action, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    expect(response.ok).toBe(true);
    return response.json();
  };
  const room = await post("create", {
    settings: { activity: "bingo", bingoMode: "corners", bingoPhysical: true },
  });
  const players: { participantId: string; participantToken: string }[] = [];
  for (const displayName of ["Ana", "Bia", "Caio"])
    players.push(await post("join", { code: room.code, displayName }));
  await post("start", room);
  time += 10_000;
  await post("next", room);
  await Promise.all(
    players.map((p) =>
      post("answer", { code: room.code, ...p, questionIndex: 0, answer: "bingo" }),
    ),
  );
  let state: PublicLocalRoomState = (
    await post("heartbeat", { code: room.code, role: "host", credential: room.hostToken })
  ).state;
  const ordered = [state.bingoClaim!, ...state.bingoClaimQueue!].map((c) => c.participantId);
  expect(new Set(ordered).size).toBe(3);
  for (const id of ordered) {
    expect(state.bingoClaim!.participantId).toBe(id);
    state = (
      await post("bingo-review", {
        code: room.code,
        hostToken: room.hostToken,
        claimId: state.bingoClaim!.id,
        decision: "continue",
      })
    ).state;
  }
  expect(state.phase).toBe("results");
  expect(state.bingoWinnerIds).toEqual(ordered);
  expect(state.participants.map((p) => p.score)).toEqual([30, 30, 30]);
});
