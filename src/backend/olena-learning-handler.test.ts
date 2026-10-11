import { describe, expect, it, vi } from "vitest";
import { lessons, passesArithmeticCheck } from "../ai/olena-corpus";
import { createLearningHandler } from "./olena-learning-handler";
import { createMemoryRoomStore } from "./room-transaction";
import { checkRateLimit } from "./rate-limit";

const token = "b".repeat(64);
const request = (body?: string, auth = token) =>
  new Request("https://example.test/api/olena-learning", {
    method: "POST",
    headers: { authorization: `Bearer ${auth}` },
    ...(body === undefined ? {} : { body }),
  });
const setup = () => {
  const store = createMemoryRoomStore();
  const provider = {
    generate: vi.fn().mockImplementation(async (input: { prompt: string }) => ({
      answer: input.prompt.match(/referência (.+)\. Use/)?.[1] ?? "",
      suggestions: [],
    })),
  };
  const deps = {
    store,
    provider,
    enabled: true,
    token,
    teacher: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    consume: () => checkRateLimit(store, "learning-test-day", "all", 2, 86400),
  };
  return { deps, handler: createLearningHandler(deps) };
};

describe("public synthetic learning", () => {
  it("authenticates before storage or provider access", async () => {
    const { deps, handler } = setup();
    const read = vi.spyOn(deps.store, "readVersion");
    expect((await handler(request(undefined, "wrong"))).status).toBe(401);
    expect(read).not.toHaveBeenCalled();
    expect(deps.provider.generate).not.toHaveBeenCalled();
  });
  it("fails closed when disabled, body includes private data, or GET is used", async () => {
    const { deps, handler } = setup();
    expect((await createLearningHandler({ ...deps, enabled: false })(request())).status).toBe(503);
    expect((await handler(request('{"prompt":"private"}'))).status).toBe(400);
    expect((await handler(new Request("https://example.test"))).status).toBe(405);
    expect(deps.provider.generate).not.toHaveBeenCalled();
  });
  it("persists bounded public samples and exports corpus after daily cap", async () => {
    const { deps, handler } = setup();
    expect((await handler(request())).status).toBe(200);
    expect((await handler(request())).status).toBe(200);
    const response = await handler(request());
    const payload = await response.json();
    expect(payload.drafts).toHaveLength(2);
    expect(payload.generated).toBe(0);
    expect(payload.publicSynthetic).toBe(true);
    expect(deps.provider.generate).toHaveBeenCalledTimes(2);
    expect(deps.provider.generate.mock.calls[0]?.[0].sources).toEqual([]);
    expect(payload.drafts[0].prompt).toBe(lessons[0]?.prompt);
  });
  it("does not accept incorrect arithmetic or pretend it was human reviewed", async () => {
    const { deps, handler } = setup();
    deps.provider.generate.mockResolvedValue({ answer: "3 + 2 = 6", suggestions: [] });
    expect((await (await handler(request())).json()).drafts).toEqual([]);
    expect(passesArithmeticCheck("3 + 2 = 5, mas 2 + 2 = 7", "3 + 2 = 5")).toBe(false);
  });
  it("locks concurrent generation and releases lease on provider failure", async () => {
    const { deps, handler } = setup();
    let release: () => void = () => undefined;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    deps.provider.generate.mockImplementation(async () => {
      await wait;
      throw new Error("provider secret must not leak");
    });
    const first = handler(request());
    await vi.waitFor(() => expect(deps.provider.generate).toHaveBeenCalledOnce());
    expect((await handler(request())).status).toBe(409);
    release();
    const failure = await first;
    expect(failure.status).toBe(503);
    expect(await failure.text()).not.toContain("secret");
    deps.provider.generate.mockResolvedValue({ answer: "3 + 2 = 5", suggestions: [] });
    expect((await handler(request())).status).toBe(200);
  });
  it("stops once the fixed curriculum is complete", async () => {
    const { deps, handler } = setup();
    await deps.store.set(
      "olena-learning/public-corpus-v1",
      JSON.stringify({
        drafts: lessons.map((lesson) => ({ ...lesson, answer: lesson.reference })),
        lease: "",
        until: 0,
      }),
      86400,
    );
    expect((await (await handler(request())).json()).generated).toBe(0);
    expect(deps.provider.generate).not.toHaveBeenCalled();
  });
});
