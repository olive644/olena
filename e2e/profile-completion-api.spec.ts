import { expect, test } from "@playwright/test";

test("API da jornada preserva autenticação, origem e consulta da própria conta", async ({
  request,
}) => {
  const method = await request.post("/api/olena?action=profile-completion");
  expect(method.status()).toBe(405);
  expect(method.headers()["allow"]).toBe("GET");
  const filter = await request.get("/api/olena?action=profile-completion&uid=other");
  expect(filter.status()).toBe(400);
  const foreign = await request.get("/api/olena?action=profile-completion", {
    headers: { Origin: "https://evil.example" },
  });
  expect(foreign.status()).toBe(403);
  const anonymous = await request.get("/api/olena?action=profile-completion&version=1", {
    headers: { Origin: "https://olenastudy.vercel.app" },
  });
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()["cache-control"]).toBe("no-store");
  expect(await anonymous.json()).toEqual({ error: "Entre na conta para conferir seu perfil." });
});
