import { it, expect, vi } from "vitest";
import { createRoomGuard } from "./room-guard";
import { createMemoryRoomStore } from "./room-transaction";

vi.mock("jose", () => ({
  createRemoteJWKSet: () => "fake-jwks",
  jwtVerify: vi.fn(async (token: string) => {
    if (token !== "valid-token") throw new Error("invalid signature");
    return { payload: {}, protectedHeader: {} };
  }),
}));

it.each([true, false])(
  "registra resultados sem expor credenciais (enforce=%s)",
  async (enforce) => {
    const observe = vi.fn();
    const guard = createRoomGuard(createMemoryRoomStore(), "project", "app", enforce, observe);
    for (const [token, result] of [
      ["valid-token", "valid"],
      ["tampered-token", "invalid"],
      ["", "missing"],
    ]) {
      const response = await guard(
        new Request("https://app.example/api/local-room?action=resume", {
          headers: token ? { "X-Firebase-AppCheck": token } : {},
        }),
      );
      expect(response?.status).toBe(enforce && result !== "valid" ? 403 : undefined);
      expect(observe).toHaveBeenLastCalledWith({
        action: "resume",
        enforced: enforce,
        result,
        status: enforce && result !== "valid" ? 403 : 200,
      });
    }
    expect(JSON.stringify(observe.mock.calls)).not.toContain("token");
  },
);

it.each(["create", "view-create"])(
  "limita %s de forma atômica e independente por endereço",
  async (action) => {
    const guard = createRoomGuard(createMemoryRoomStore(), "project", "app", false);
    const request = (ip: string) =>
      new Request(`https://app.example/api/local-room?action=${action}`, {
        headers: { "x-vercel-forwarded-for": ip },
      });
    const results = await Promise.all(Array.from({ length: 10 }, () => guard(request("1.2.3.4"))));
    expect(results.filter((result) => !result)).toHaveLength(6);
    expect(results.filter((result) => result?.status === 429)).toHaveLength(4);
    expect(await guard(request("5.6.7.8"))).toBeUndefined();
  },
);

it("exige App Check quando habilitado e recusa configuração incompleta", async () => {
  const request = new Request("https://app.example/api/local-room?action=create");
  expect(
    (await createRoomGuard(createMemoryRoomStore(), "project", "app", true)(request))?.status,
  ).toBe(403);
  expect(
    (await createRoomGuard(createMemoryRoomStore(), "project", "", true)(request))?.status,
  ).toBe(503);
});

it("deixa passar quando o token do App Check é válido", async () => {
  const guard = createRoomGuard(createMemoryRoomStore(), "project", "app", true);
  const request = new Request("https://app.example/api/local-room?action=create", {
    headers: { "X-Firebase-AppCheck": "valid-token" },
  });
  expect(await guard(request)).toBeUndefined();
});

it("recusa quando o token do App Check é inválido", async () => {
  const guard = createRoomGuard(createMemoryRoomStore(), "project", "app", true);
  const request = new Request("https://app.example/api/local-room?action=create", {
    headers: { "X-Firebase-AppCheck": "tampered-token" },
  });
  expect((await guard(request))?.status).toBe(403);
});
