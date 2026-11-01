import { accountLogName, type LogAccount } from "./discord-account-log.js";

const WEEK = 7 * 86400000;
const RETENTION = 30 * 86400000;
type Entry = { name: string; method: string; lastSeen: number; dueAt: number; notified: boolean };
export function createAccountInactivity(
  root: string,
  accessToken: () => Promise<string>,
  fetcher: typeof fetch = fetch,
  clock = Date.now,
) {
  async function request(path: string, init: RequestInit = {}) {
    const response = await fetcher(
      `${root}/privateAccountActivity${path.startsWith(".json") ? "" : "/"}${path}`,
      {
        ...init,
        headers: { Authorization: `Bearer ${await accessToken()}`, ...init.headers },
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!response.ok && response.status !== 412) throw new Error("account-activity-store");
    return response;
  }
  async function read(reference: string) {
    const response = await request(`${reference}.json`, { headers: { "X-Firebase-ETag": "true" } });
    const version = response.headers.get("etag");
    if (!version) throw new Error("account-activity-version");
    return { entry: (await response.json()) as Entry | null, version };
  }
  async function write(reference: string, entry: Entry | null, version: string) {
    return (
      (
        await request(`${reference}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "if-match": version },
          body: JSON.stringify(entry),
        })
      ).status !== 412
    );
  }
  return {
    async observe(account: LogAccount, reference: string, method: string) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { entry, version } = await read(reference);
        const now = clock();
        if (!account.deleted && entry && !entry.notified && now - entry.lastSeen < 1800000) return;
        const next: Entry | null = account.deleted
          ? null
          : {
              name: accountLogName(account.name),
              method,
              lastSeen: now,
              dueAt: now + WEEK,
              notified: false,
            };
        if (await write(reference, next, version)) return;
      }
      throw new Error("account-activity-conflict");
    },
    async sweep(
      send: (event: {
        name: string;
        method: string;
        reference: string;
        nonce: string;
        timestamp: string;
        title: string;
        color: number;
      }) => Promise<void>,
    ) {
      const now = clock();
      const response = await request(
        `.json?orderBy=${encodeURIComponent('"dueAt"')}&startAt=0&endAt=${now}&limitToFirst=50`,
      );
      const candidates = (await response.json()) as Record<string, unknown> | null;
      let sent = 0;
      for (const reference of Object.keys(candidates ?? {}).slice(0, 50)) {
        if (!/^[a-f0-9]{16}$/.test(reference)) continue;
        const { entry, version } = await read(reference);
        if (
          !entry ||
          !Number.isFinite(entry.lastSeen) ||
          !Number.isFinite(entry.dueAt) ||
          entry.dueAt > now ||
          now - entry.lastSeen < WEEK
        )
          continue;
        if (now - entry.lastSeen >= RETENTION) {
          await write(reference, null, version);
          continue;
        }
        if (entry.notified) continue;
        // Reserva por CAS. Não repetir entrega incerta automaticamente.
        if (
          !(await write(
            reference,
            { ...entry, notified: true, dueAt: entry.lastSeen + RETENTION },
            version,
          ))
        )
          continue;
        const confirmation = await read(reference);
        if (
          !confirmation.entry ||
          confirmation.entry.lastSeen !== entry.lastSeen ||
          !confirmation.entry.notified
        )
          continue;
        await send({
          name: entry.name,
          method: entry.method,
          reference,
          nonce: `${reference}${Math.floor(entry.lastSeen / 86400000)}`.slice(0, 24),
          timestamp: new Date(now).toISOString(),
          title: "Sem atividade registrada há 7 dias",
          color: 0x7839ee,
        });
        sent++;
      }
      return { sent };
    },
  };
}
