import { expect, it } from "vitest";
import { handleOlena } from "./olena-handler";
const request = (body: unknown, query = "?action=english") =>
  new Request(`https://olena.example/api/olena${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
it("serves adaptive English planning through the real Olena dispatcher", async () => {
  const response = await handleOlena(request({ solved: [], recent: [], exclude: [] }));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ version: 1, id: 0, difficulty: 0, recovery: false });
});
it("rejects extra parameters, malformed bodies, unsupported methods and oversized payloads", async () => {
  expect((await handleOlena(request({}, "?action=english&other=1"))).status).toBe(400);
  expect((await handleOlena(request({ solved: [999], recent: [], exclude: [] }))).status).toBe(400);
  expect(
    (await handleOlena(new Request("https://olena.example/api/olena?action=english"))).status,
  ).toBe(405);
  expect((await handleOlena(request("x".repeat(5000)))).status).toBe(413);
});
