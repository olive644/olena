import { beforeEach, expect, it, vi } from "vitest";
import { createSpeechGenerationQuota } from "./speech-quota";

const quota = vi.hoisted(() => vi.fn());
vi.mock("./rate-limit", () => ({ checkRateLimit: quota }));

beforeEach(() => {
  quota.mockReset();
  quota.mockResolvedValue(true);
});

it("consulta limite por minuto, por dia e o teto global diário", async () => {
  const store = {} as never;
  expect(await createSpeechGenerationQuota(store).consume("ip")).toBe(true);
  expect(quota.mock.calls.map((call) => call.slice(1))).toEqual([
    ["speech-generation-rate-limit", "ip", 30, 60],
    ["speech-generation-day", "ip", 600, 86400],
    ["speech-generation-global-day", "all", 6000, 86400],
  ]);
});

it("recusa quando só o teto global está esgotado, mesmo para um endereço novo", async () => {
  quota.mockImplementation(async (_store, name: string) => name !== "speech-generation-global-day");
  expect(await createSpeechGenerationQuota({} as never).consume("ip-novo")).toBe(false);
});

it("recusa pelo limite diário do endereço sem gastar o teto global", async () => {
  quota.mockImplementation(async (_store, name: string) => name !== "speech-generation-day");
  expect(await createSpeechGenerationQuota({} as never).consume("ip")).toBe(false);
  expect(quota.mock.calls.some((call) => call[1] === "speech-generation-global-day")).toBe(false);
});
