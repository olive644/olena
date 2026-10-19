import { expect, it } from "vitest";
import { createAccountDevicesHandler } from "./account-devices-handler";
import { DEVICE_RETENTION_MS } from "../domain/account-devices";

function setup() {
  const data = new Map<string, string>();
  let time = Date.now();
  let quota = true;
  const handler = createAccountDevicesHandler({
    allowedOrigins: ["https://app.test"],
    now: () => time,
    identify: async (request) => {
      const uid = request.headers.get("authorization");
      return uid ? { uid, anonymous: uid === "guest" } : undefined;
    },
    consume: async () => quota,
    store: {
      get: async (key) => data.get(key),
      set: async (key, value) => {
        data.set(key, value);
      },
      del: async (key) => {
        data.delete(key);
      },
      readVersion: async (key) => ({ value: data.get(key), version: data.get(key) ?? "" }),
      compareAndSet: async (key, value, _ttl, version) => {
        if ((data.get(key) ?? "") !== version) return false;
        data.set(key, value);
        return true;
      },
    },
  });
  const call = (
    uid = "a",
    method = "POST",
    id = "11111111-1111-4111-8111-111111111111",
    origin = "https://app.test",
  ) =>
    handler(
      new Request("https://app.test/api/account-devices", {
        method,
        headers: {
          origin,
          authorization: uid,
          "content-type": "application/json",
          "user-agent": "Mozilla Windows Chrome/140 Edg/140",
        },
        ...(method !== "GET"
          ? { body: JSON.stringify({ id, uid: "victim", lastSeen: 1, browser: "fake" }) }
          : {}),
      }),
    );
  return {
    call,
    advance: () => {
      time += DEVICE_RETENTION_MS + 1;
    },
    limit: () => {
      quota = false;
    },
  };
}
it("isola contas, usa horário do servidor e registra cada navegador uma vez", async () => {
  const { call } = setup();
  expect((await call()).status).toBe(200);
  const response = await call();
  expect(response.headers.get("cache-control")).toBe("no-store");
  const { devices } = await response.json();
  expect(devices).toHaveLength(1);
  expect(devices[0]).toMatchObject({ browser: "Edge", system: "Windows" });
  expect(devices[0].lastSeen).toBeGreaterThan(1);
  expect(await (await call("b", "GET")).json()).toEqual({ devices: [] });
  await call("b", "DELETE");
  expect((await (await call("a", "GET")).json()).devices).toHaveLength(1);
  await call("a", "DELETE");
  expect(await (await call("a", "GET")).json()).toEqual({ devices: [] });
});
it("recusa visitantes, origem externa, ids inválidos e consumo excessivo", async () => {
  const { call, limit } = setup();
  expect((await call("guest")).status).toBe(401);
  expect((await call("")).status).toBe(401);
  expect((await call("a", "GET", "", "https://evil.test")).status).toBe(403);
  expect((await call("a", "POST", "../../b")).status).toBe(400);
  limit();
  expect((await call()).status).toBe(429);
});
it("não exibe acessos expirados", async () => {
  const { call, advance } = setup();
  await call();
  advance();
  expect(await (await call("a", "GET")).json()).toEqual({ devices: [] });
});
it("limita a lista e não duplica um aparelho já registrado no teto", async () => {
  const { call } = setup();
  for (let index = 0; index < 30; index++) {
    const id = `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111`;
    expect((await call("a", "POST", id)).status).toBe(200);
  }
  expect((await call()).status).toBe(409);
  expect((await call("a", "POST", "00000000-1111-4111-8111-111111111111")).status).toBe(200);
});
