import { createHash } from "node:crypto";
import type { KvStore } from "./kv-store.js";
import type { HandleIdentity } from "./profile-handle-handler.js";
import type { SupportTicket } from "../domain/support.js";

const accountKey = (uid: string) => createHash("sha256").update(uid).digest("hex");
const TTL = 30 * 86400;
const INBOX = "privateSupport/inbox";
type Inbox = Record<string, number>;

export function createSupportHandler(options: {
  store: KvStore;
  identify(request: Request): Promise<HandleIdentity | undefined>;
  allowedOrigins: string[];
  staffHashes: readonly string[];
  consume(uid: string, write: boolean): Promise<boolean>;
  now?: () => number;
}) {
  const now = options.now ?? Date.now;
  return async (request: Request): Promise<Response> => {
    const reply = (status: number, value: unknown) =>
      Response.json(value, {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
        },
      });
    if (!["GET", "POST"].includes(request.method))
      return reply(405, { error: "Método não permitido." });
    const url = new URL(request.url);
    if (
      [...url.searchParams.keys()].some((key) => !["action", "ticket", "inbox"].includes(key)) ||
      ["action", "ticket", "inbox"].some((key) => url.searchParams.getAll(key).length > 1) ||
      url.searchParams.get("action") !== "support" ||
      (url.searchParams.has("inbox") && url.searchParams.get("inbox") !== "1")
    )
      return reply(400, { error: "Consulta inválida." });
    const origin =
      request.headers.get("origin") ||
      (request.headers.get("sec-fetch-site") === "same-origin" ? url.origin : "");
    if (!options.allowedOrigins.includes(origin))
      return reply(403, { error: "Origem não permitida." });
    try {
      const identity = await options.identify(request);
      if (!identity || identity.anonymous || !identity.emailVerified)
        return reply(401, { error: "Entre em uma conta verificada para conversar com o time." });
      const own = accountKey(identity.uid);
      const staff = options.staffHashes.includes(own);
      const id = url.searchParams.get("ticket") ?? own;
      if (!/^[a-f0-9]{64}$/.test(id)) return reply(400, { error: "Ticket inválido." });
      if ((!staff && id !== own) || (!staff && url.searchParams.has("inbox")))
        return reply(403, { error: "Você não pode acessar esta conversa." });
      if (!(await options.consume(identity.uid, request.method === "POST")))
        return reply(429, { error: "Muitas solicitações. Aguarde um pouco." });
      if (url.searchParams.has("inbox")) {
        if (request.method !== "GET" || url.searchParams.has("ticket"))
          return reply(400, { error: "Consulta inválida." });
        const saved = await options.store.get(INBOX);
        const index = saved ? (JSON.parse(saved) as Inbox) : {};
        return reply(200, {
          staff,
          inbox: Object.entries(index)
            .filter(([, at]) => now() - at < TTL * 1000)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)
            .map(([id, updatedAt]) => ({ id, updatedAt })),
        });
      }
      const key = `privateSupport/tickets/${id}`;
      if (request.method === "GET") {
        const saved = await options.store.get(key);
        return reply(200, {
          staff,
          ...(saved ? { ticket: JSON.parse(saved) as SupportTicket } : {}),
        });
      }
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return reply(415, { error: "Envie JSON." });
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 12000)
        return reply(413, { error: "Mensagem muito grande." });
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        return reply(400, { error: "Mensagem inválida." });
      }
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).some((key) => !["text", "requestId"].includes(key)) ||
        !("text" in body) ||
        typeof body.text !== "string" ||
        !body.text.trim() ||
        body.text.length > 2000 ||
        !("requestId" in body) ||
        typeof body.requestId !== "string" ||
        !/^[a-f0-9-]{36}$/.test(body.requestId)
      )
        return reply(400, { error: "Escreva uma mensagem de até 2.000 caracteres." });
      for (let attempt = 0; attempt < 5; attempt++) {
        const snapshot = await options.store.readVersion!(key);
        const ticket: SupportTicket = snapshot.value
          ? (JSON.parse(snapshot.value) as SupportTicket)
          : { id, updatedAt: now(), messages: [] };
        if (staff && id !== own && !snapshot.value)
          return reply(404, { error: "Conversa não encontrada." });
        if (ticket.messages.some((message) => message.id === body.requestId))
          return reply(200, { staff, ticket });
        if (ticket.messages.length >= 100)
          return reply(409, {
            error: "Esta conversa atingiu o limite de 100 mensagens. Nenhuma mensagem foi enviada.",
          });
        ticket.messages.push({
          id: body.requestId,
          text: body.text.trim(),
          at: now(),
          from: staff && id !== own ? "team" : "user",
        });
        ticket.updatedAt = now();
        // Índice tem teto e guarda apenas IDs/timestamps, nunca o conteúdo das mensagens.
        let indexed = false;
        for (let retry = 0; retry < 5; retry++) {
          const snapshot = await options.store.readVersion!(INBOX);
          const index: Inbox = snapshot.value ? (JSON.parse(snapshot.value) as Inbox) : {};
          for (const [key, at] of Object.entries(index))
            if (now() - at >= TTL * 1000) delete index[key];
          if (!(id in index) && Object.keys(index).length >= 500)
            return reply(503, {
              error: "O atendimento está com a fila cheia. Tente novamente mais tarde.",
            });
          index[id] = now();
          if (
            await options.store.compareAndSet!(INBOX, JSON.stringify(index), TTL, snapshot.version)
          ) {
            indexed = true;
            break;
          }
        }
        if (!indexed) return reply(409, { error: "A fila mudou. Tente enviar novamente." });
        if (await options.store.compareAndSet!(key, JSON.stringify(ticket), TTL, snapshot.version))
          return reply(200, { staff, ticket });
      }
      return reply(409, { error: "A conversa mudou. Tente novamente." });
    } catch {
      return reply(503, { error: "Não foi possível conectar ao atendimento. Tente novamente." });
    }
  };
}

export async function deleteSupportAccount(store: KvStore, uid: string) {
  const id = accountKey(uid);
  await store.del(`privateSupport/tickets/${id}`);
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await store.readVersion!(INBOX);
    if (!snapshot.value) return;
    const index = JSON.parse(snapshot.value) as Inbox;
    delete index[id];
    if (await store.compareAndSet!(INBOX, JSON.stringify(index), TTL, snapshot.version)) return;
  }
  throw new Error("support-cleanup");
}
