import { expect, it } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";
import type { PublicLocalRoomState } from "../domain/local-room";

it.each([
  [3, 3],
  ["3", 1],
  [-8, 1],
  [2.5, 1],
  [10000, 100],
  [null, 1],
])("nível %s é só metadado limitado, não dá pontos", async (level, expected) => {
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(),
    publish: async () => {},
    streamUrl: () => "/stream",
  });
  const post = async (action: string, body: object) => {
    const response = await handler(
      new Request(`https://test/api/local-room?action=${action}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    expect(response.ok).toBe(true);
    return response.json();
  };
  const room = await post("create", { settings: { activity: "bingo", bingoMode: "line" } });
  const result = (await post("join", { code: room.code, displayName: "Ana", level })) as {
    state: PublicLocalRoomState;
  };
  expect(result.state.participants[0]?.level).toBe(expected);
  expect(result.state.participants[0]?.score).toBe(0);
  expect(result.state.participants[0]?.reward).toBeUndefined();
});
