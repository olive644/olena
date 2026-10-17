import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";

const origin = "https://helena.example";
const settings = { difficulty: "mixed", questionCount: 5, roundSeconds: 15 };

function handlerWith(store = createMemoryRoomStore()) {
  return createLocalRoomHandler({
    store,
    publish: async () => {},
    streamUrl: (code) => `https://rtdb.example/rooms/${code}.json`,
  });
}
const create = (body: unknown) =>
  new Request(`${origin}/api/local-room?action=create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const derivedFrom = (requestId: string) =>
  Array.from(
    createHash("sha256").update(requestId).digest().subarray(0, 5),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");

describe("criação de sala com requestId", () => {
  it("não deriva o código do requestId, então quem escolhe o requestId não escolhe o código", async () => {
    const requestId = "11111111-2222-4333-8444-555555555555";
    const results = new Set<string>();
    for (let index = 0; index < 8; index += 1) {
      const response = await handlerWith()(create({ settings, requestId }));
      expect(response.status).toBe(201);
      results.add(((await response.json()) as { code: string }).code);
    }
    expect(results.size).toBeGreaterThan(1);
    expect(results.has(derivedFrom(requestId))).toBe(false);
  });

  it("um pedido repetido com o mesmo requestId volta à mesma sala e ao mesmo código", async () => {
    const handler = handlerWith();
    const requestId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const first = (await (await handler(create({ settings, requestId }))).json()) as {
      code: string;
      hostToken: string;
    };
    const repeated = (await (await handler(create({ settings, requestId }))).json()) as {
      code: string;
      hostToken: string;
    };
    expect(repeated.code).toBe(first.code);
    expect(repeated.hostToken).toBe(first.hostToken);
  });

  it("requestIds diferentes criam salas diferentes", async () => {
    const handler = handlerWith();
    const a = (await (
      await handler(create({ settings, requestId: "aaaaaaaa-bbbb-4ccc-8ddd-000000000001" }))
    ).json()) as { code: string };
    const b = (await (
      await handler(create({ settings, requestId: "aaaaaaaa-bbbb-4ccc-8ddd-000000000002" }))
    ).json()) as { code: string };
    expect(a.code).not.toBe(b.code);
  });
});
