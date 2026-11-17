import { expect, it, vi } from "vitest";
import handler from "../../api/speech";

it("a voz natural está desligada: responde 410 sem tocar na Cloudflare", () => {
  const setHeader = vi.fn();
  const end = vi.fn();
  const response = { statusCode: 0, setHeader, end };
  handler({}, response);
  expect(response.statusCode).toBe(410);
  expect(end.mock.calls[0]?.[0]).toContain("voice_disabled");
});
