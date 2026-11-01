import { createHmac } from "node:crypto";
import type { KvStore } from "./kv-store.js";
import { PRIVACY_POLICY_VERSION } from "../domain/privacy-policy.js";

export type LogAccount = {
  uid: string;
  authTime: number;
  provider: string;
  createdAt?: number;
  deleted: boolean;
  name?: string;
};
type Dependencies = {
  observe?: (account: LogAccount, reference: string, method: string) => Promise<void>;
  identify: (request: Request, deleted: boolean) => Promise<LogAccount | undefined>;
  consume: (request: Request, uid?: string) => Promise<boolean>;
  store: KvStore;
  allowedOrigins: readonly string[];
  send: (event: {
    title: string;
    method: string;
    reference: string;
    nonce: string;
    timestamp: string;
    name: string;
    color: number;
  }) => Promise<void>;
  secret: string;
  now?: () => number;
};
const methods: Readonly<Record<string, string>> = {
  "google.com": "Google",
  password: "E-mail e senha",
  custom: "Discord",
};

export function createAccountLogHandler(deps: Dependencies) {
  const clock = deps.now ?? Date.now;
  const reply = (status: number) =>
    new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply(405);
    if (!deps.allowedOrigins.includes(request.headers.get("origin") ?? "")) return reply(403);
    if (!deps.secret) return reply(503);
    try {
      if (!(await deps.consume(request))) return reply(429);
      const raw = await request.text();
      if (raw.length > 512) return reply(413);
      let body: { event?: unknown; consent?: unknown };
      try {
        body = JSON.parse(raw) as typeof body;
      } catch {
        return reply(400);
      }
      if (
        !body ||
        !["login", "logout", "deleted", "activity"].includes(String(body.event)) ||
        body.consent !== PRIVACY_POLICY_VERSION
      )
        return reply(400);
      const account = await deps.identify(request, body.event === "deleted");
      if (
        !account ||
        account.deleted !== (body.event === "deleted") ||
        !Object.hasOwn(methods, account.provider)
      )
        return reply(401);
      const age = clock() / 1000 - account.authTime;
      if (!Number.isFinite(age) || age < 0 || (body.event === "login" && age > 900))
        return reply(401);
      if (!(await deps.consume(request, account.uid))) return reply(429);
      const digest = (value: string) =>
        createHmac("sha256", deps.secret).update(value).digest("hex");
      await deps.observe?.(account, digest(account.uid).slice(0, 16), methods[account.provider]!);
      if (body.event === "activity") return reply(204);
      const created =
        body.event === "login" &&
        account.createdAt !== undefined &&
        Math.abs(account.createdAt - account.authTime * 1000) < 15000;
      const id = digest(
        created
          ? `${account.uid}:created:${account.createdAt}`
          : `${account.uid}:${account.authTime}:${String(body.event)}`,
      );
      const key = `privateAccountLog/${id}`;
      const entry = await deps.store.readVersion!(key);
      if (entry.value) return reply(204);
      if (!(await deps.store.compareAndSet!(key, "sending", 60, entry.version))) return reply(204);
      try {
        await deps.send({
          title:
            body.event === "deleted"
              ? "Conta excluída"
              : body.event === "logout"
                ? "Saída informada pelo aplicativo"
                : created
                  ? "Conta criada"
                  : "Entrada na conta",
          method: methods[account.provider]!,
          name: accountLogName(account.name),
          color: body.event === "deleted" ? 0xed4245 : created ? 0x57f287 : 0x7839ee,
          reference: digest(account.uid).slice(0, 16),
          nonce: id.slice(0, 24),
          timestamp: new Date(clock()).toISOString(),
        });
        await deps.store.set(key, "sent", 86400);
        return reply(204);
      } catch {
        await deps.store.del(key);
        return reply(503);
      }
    } catch {
      return reply(503);
    }
  };
}

export function accountLogName(name?: string) {
  return (
    [...(name ?? "")]
      .map((char) => {
        const code = char.codePointAt(0)!;
        return code < 32 || code === 127 ? " " : char;
      })
      .join("")
      .trim()
      .slice(0, 100) || "Nome não informado"
  );
}
