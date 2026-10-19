import { createHash } from "node:crypto";
import type { KvStore } from "./kv-store.js";
import {
  DEVICE_LIMIT,
  DEVICE_RETENTION_MS,
  deviceDescription,
  type AccountDevice,
} from "../domain/account-devices.js";

export const deviceAccountKey = (uid: string) =>
  `room-limits/account-devices-${createHash("sha256").update(uid).digest("hex")}`;

export function createAccountDevicesHandler(options: {
  store: KvStore;
  identify(request: Request): Promise<{ uid: string; anonymous: boolean } | undefined>;
  allowedOrigins: string[];
  consume(uid: string): Promise<boolean>;
  now?: () => number;
}) {
  return async (request: Request): Promise<Response> => {
    const reply = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    if (!["GET", "POST", "DELETE"].includes(request.method)) return reply(405, { error: "method" });
    const origin =
      request.headers.get("origin") ||
      (request.method === "GET" && request.headers.get("sec-fetch-site") === "same-origin"
        ? new URL(request.url).origin
        : "");
    if (!options.allowedOrigins.includes(origin)) return reply(403, { error: "origin" });
    try {
      const account = await options.identify(request);
      if (!account || account.anonymous) return reply(401, { error: "auth" });
      if (!(await options.consume(account.uid))) return reply(429, { error: "quota" });
      const now = options.now?.() ?? Date.now();
      const key = deviceAccountKey(account.uid);
      let id = "";
      if (request.method !== "GET") {
        if (!request.headers.get("content-type")?.startsWith("application/json"))
          return reply(415, { error: "json" });
        const raw = await request.text();
        if (raw.length > 128) return reply(413, { error: "size" });
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return reply(400, { error: "json" });
        }
        if (
          !body ||
          typeof body !== "object" ||
          !("id" in body) ||
          typeof body.id !== "string" ||
          !/^[a-f0-9-]{36}$/.test(body.id)
        )
          return reply(400, { error: "id" });
        id = body.id;
      }
      for (let attempt = 0; attempt < 4; attempt++) {
        const snapshot = await options.store.readVersion!(key);
        const saved = snapshot.value ? (JSON.parse(snapshot.value) as AccountDevice[]) : [];
        const devices = saved.filter((device) => device.lastSeen > now - DEVICE_RETENTION_MS);
        if (request.method === "GET")
          return reply(200, { devices: devices.sort((a, b) => b.lastSeen - a.lastSeen) });
        const next = devices.filter((device) => device.id !== id);
        if (request.method === "POST") {
          if (next.length >= DEVICE_LIMIT) return reply(409, { error: "capacity" });
          next.push({
            id,
            ...deviceDescription(request.headers.get("user-agent") ?? ""),
            lastSeen: now,
          });
        }
        if (
          await options.store.compareAndSet!(
            key,
            JSON.stringify(next),
            DEVICE_RETENTION_MS / 1000,
            snapshot.version,
          )
        )
          return reply(200, { devices: next.sort((a, b) => b.lastSeen - a.lastSeen) });
      }
      return reply(503, { error: "conflict" });
    } catch {
      return reply(503, { error: "unavailable" });
    }
  };
}
