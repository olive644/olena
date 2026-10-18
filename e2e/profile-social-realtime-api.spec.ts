import { expect, test } from "@playwright/test";

test("canal social protege método, origem e identidade", async ({ request }) => {
  const method = await request.post("/api/profile-social?stream=1");
  expect(method.status()).toBe(405);
  const filter = await request.get("/api/profile-social?stream=1&uid=other");
  expect(filter.status()).toBe(400);
  const foreign = await request.get("/api/profile-social?stream=1", {
    headers: { Origin: "https://evil.example" },
  });
  expect(foreign.status()).toBe(403);
  const anonymous = await request.get("/api/profile-social?stream=1", {
    headers: { Origin: "https://olenastudy.vercel.app" },
  });
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["cache-control"]).toBe("no-store");
});
