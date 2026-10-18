import { it, expect, vi } from "vitest";
import { createRoomGuard, ROOM_CREATE_DAILY_LIMIT } from "./room-guard";
import { createMemoryRoomStore } from "./room-transaction";
import { createHash } from "node:crypto";

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

it.each(["kick", "lock", "repeat", "lobby", "team", "host-player", "bingo-review"])(
  "reconhece a ação %s da sala em vez de agrupá-la como desconhecida",
  async (action) => {
    const observe = vi.fn();
    const guard = createRoomGuard(createMemoryRoomStore(), "project", "app", false, observe);
    await guard(new Request(`https://app.example/api/local-room?action=${action}`));
    expect(observe).toHaveBeenLastCalledWith(expect.objectContaining({ action }));
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

it("fallback de uma turma no mesmo IP mantém limites por dispositivo e endereço", async () => {
  const store = createMemoryRoomStore();
  const guard = createRoomGuard(store, "project", "app", false);
  const address = "1.2.3.4";
  const bucket = Math.floor(Date.now() / 60000);
  const ipKey = `room-limits/${createHash("sha256").update(`${address}:heartbeat`).digest("hex")}`;
  await store.set(ipKey, JSON.stringify({ bucket, count: 1800 }), 120);
  const request = (credential: string) =>
    new Request("https://app.example/api/local-room?action=heartbeat", {
      method: "POST",
      headers: { "x-vercel-forwarded-for": address, "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
  expect(await guard(request("aluno-1"))).toBeUndefined();
  const deviceKey = `room-limits/${createHash("sha256").update(`heartbeat-device:${address}:aluno-1`).digest("hex")}`;
  await store.set(deviceKey, JSON.stringify({ bucket, count: 90 }), 120);
  expect((await guard(request("aluno-1")))?.status).toBe(429);
  expect(await guard(request("aluno-2"))).toBeUndefined();
  await store.set(ipKey, JSON.stringify({ bucket, count: 2400 }), 120);
  expect((await guard(request("aluno-3")))?.status).toBe(429);
});

it("recusa quando o token do App Check é inválido", async () => {
  const guard = createRoomGuard(createMemoryRoomStore(), "project", "app", true);
  const request = new Request("https://app.example/api/local-room?action=create", {
    headers: { "X-Firebase-AppCheck": "tampered-token" },
  });
  expect((await guard(request))?.status).toBe(403);
});

it("avisa uma única vez quando o App Check não é exigido e fica quieto quando é", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const ask = (guard: ReturnType<typeof createRoomGuard>) =>
    guard(new Request("https://app.example/api/local-room?action=resume"));
  const open = createRoomGuard(createMemoryRoomStore(), "project", "app", false);
  await ask(open);
  await ask(open);
  expect(warn).toHaveBeenCalledTimes(1);
  expect(String(warn.mock.calls[0]?.[0])).toContain("app_check_not_enforced");
  warn.mockClear();
  await ask(createRoomGuard(createMemoryRoomStore(), "project", "app", true));
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

it("o teto global de criações vale para todos os endereços somados, e só para criar", async () => {
  const store = createMemoryRoomStore();
  const guard = createRoomGuard(store, "project", "app", false);
  const request = (ip: string, action: string) =>
    new Request(`https://app.example/api/local-room?action=${action}`, {
      headers: { "x-vercel-forwarded-for": ip },
    });
  // Esgota o teto global como se muitos endereços diferentes tivessem criado salas hoje.
  const day = 86400;
  const { checkRateLimit } = await import("./rate-limit");
  for (let i = 0; i < ROOM_CREATE_DAILY_LIMIT; i++)
    expect(
      await checkRateLimit(store, "room-limits", "global:create-day", ROOM_CREATE_DAILY_LIMIT, day),
    ).toBe(true);
  const blocked = await guard(request("198.51.100.1", "create"));
  expect(blocked?.status).toBe(429);
  expect(await blocked?.json()).toMatchObject({ error: expect.stringContaining("hoje") });
  // Outras ações não são afetadas pelo teto de criação.
  expect(await guard(request("198.51.100.1", "join"))).toBeUndefined();
  expect(await guard(request("198.51.100.2", "answer"))).toBeUndefined();
});
