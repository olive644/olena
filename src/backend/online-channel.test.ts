import { expect, it, vi } from "vitest";
import { createOnlineChannel, CHANNEL_INTERVAL, ONLINE_TTL } from "./online-channel";
import type { KvStore } from "./kv-store";
function setup() {
  let now = 10000000;
  let value: string | undefined;
  let version = 0;
  const entries = new Map<string, number>();
  const publish = vi.fn<(count: number) => Promise<number | undefined>>(async () => undefined);
  const store: KvStore = {
    get: async () => value,
    set: async (_, v) => {
      value = v;
      version++;
    },
    del: async () => {
      value = undefined;
      version++;
    },
    readVersion: async () => ({ value, version: String(version) }),
    compareAndSet: async (_, v, _ttl, vn) => {
      if (vn !== String(version)) return false;
      value = v;
      version++;
      return true;
    },
  };
  const tracker = createOnlineChannel({
    store,
    observe: async (key, at) => {
      entries.set(key, at);
    },
    count: async (since) => [...entries.values()].filter((at) => at >= since).length,
    publish,
    clock: () => now,
  });
  return {
    tracker,
    publish,
    advance: (ms: number) => {
      now += ms;
    },
    entries,
  };
}
it("conta contas únicas, expira sinais e publica zero no agendamento", async () => {
  const x = setup();
  await x.tracker.heartbeat("same");
  await x.tracker.heartbeat("same");
  await x.tracker.heartbeat("other");
  expect(x.entries.size).toBe(2);
  expect(x.publish).toHaveBeenCalledExactlyOnceWith(1);
  x.advance(CHANNEL_INTERVAL);
  await x.tracker.heartbeat("same");
  expect(x.publish).toHaveBeenCalledTimes(1);
  x.advance(CHANNEL_INTERVAL);
  await x.tracker.update();
  expect(x.publish).toHaveBeenLastCalledWith(0);
  expect(ONLINE_TTL).toBeLessThan(CHANNEL_INTERVAL);
});
it("trava compartilhada evita renomear simultaneamente e não repete total igual", async () => {
  const x = setup();
  await Promise.all([x.tracker.heartbeat("a"), x.tracker.heartbeat("b")]);
  expect(x.publish).toHaveBeenCalledTimes(1);
  x.advance(CHANNEL_INTERVAL);
  await Promise.all([x.tracker.update(), x.tracker.update()]);
  expect(x.publish).toHaveBeenCalledTimes(2);
});
it("respeita Retry-After e não considera publicação recusada como sucesso", async () => {
  const x = setup();
  x.publish.mockResolvedValueOnce(900000);
  await x.tracker.heartbeat("a");
  x.advance(CHANNEL_INTERVAL);
  await x.tracker.update();
  expect(x.publish).toHaveBeenCalledTimes(1);
  x.advance(900000);
  await x.tracker.update();
  expect(x.publish).toHaveBeenLastCalledWith(0);
});
it("falha de transporte não anuncia sucesso nem repete imediatamente", async () => {
  const x = setup();
  x.publish.mockRejectedValueOnce(new Error("network"));
  await expect(x.tracker.heartbeat("a")).rejects.toThrow("presence-publish");
  await x.tracker.update();
  expect(x.publish).toHaveBeenCalledTimes(1);
  x.advance(CHANNEL_INTERVAL);
  await x.tracker.update();
  expect(x.publish).toHaveBeenLastCalledWith(0);
});
