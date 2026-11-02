import type { KvStore } from "./kv-store.js";
const KEY = "room-limits/olena-online-channel";
export const ONLINE_TTL = 150000;
export const CHANNEL_INTERVAL = 300000;
export function createOnlineChannel(options: {
  store: KvStore;
  observe(key: string, now: number): Promise<void>;
  count(since: number): Promise<number>;
  publish(count: number): Promise<number | undefined>;
  clock?: () => number;
}) {
  const now = options.clock ?? Date.now;
  async function update() {
    const at = now();
    const { store } = options;
    if (!store.readVersion || !store.compareAndSet) throw new Error("presence-cas-required");
    const current = await store.readVersion(KEY);
    const state: { next?: number; count?: number } = current.value ? JSON.parse(current.value) : {};
    if ((state.next ?? 0) > at) return;
    if (
      !(await store.compareAndSet(
        KEY,
        JSON.stringify({ ...state, next: at + CHANNEL_INTERVAL }),
        86400,
        current.version,
      ))
    )
      return;
    const count = await options.count(at - ONLINE_TTL);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("presence-count");
    if (count === state.count) return;
    try {
      const retry = await options.publish(count);
      await store.set(
        KEY,
        JSON.stringify({
          next: at + Math.max(CHANNEL_INTERVAL, retry ?? 0),
          count: retry === undefined ? count : state.count,
        }),
        86400,
      );
    } catch {
      throw new Error("presence-publish");
    }
  }
  return {
    async heartbeat(key: string) {
      await options.observe(key, now());
      await update();
    },
    update,
  };
}
