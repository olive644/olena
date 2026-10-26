import { createHash } from "node:crypto";
import type { KvStore } from "./kv-store.js";
import type { HandleIdentity } from "./profile-handle-handler.js";
import {
  INBOX_KEY as INBOX,
  TICKET_TTL_SECONDS as TTL,
  publicTicket,
  ticketKey,
  type StoredSupportTicket,
} from "./support-keys.js";
import type { DiscordSupport } from "./discord-support.js";

export const accountKey = (uid: string) => createHash("sha256").update(uid).digest("hex");
type Inbox = Record<string, number>;
/** Envio ao Discord: a mesma gravação do ticket guarda a pendência e depois o envio é tentado. */
export type SupportRelay = Pick<DiscordSupport, "noticeVersion" | "enqueue" | "flush">;
const RELAY_BUDGET_MS = 2500;

/** Espera o envio ao Discord por pouco tempo. Se demorar, a mensagem segue pendente. */
async function withBudget(work: Promise<void>): Promise<void> {
  await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, RELAY_BUDGET_MS))]);
}

export function createSupportHandler(options: {
  store: KvStore;
  identify(request: Request): Promise<HandleIdentity | undefined>;
  allowedOrigins: string[];
  staffHashes: readonly string[];
  consume(uid: string, write: boolean): Promise<boolean>;
  /** Ponte com o Discord. Ausente, o atendimento funciona só dentro do aplicativo, como antes. */
  relay?: SupportRelay;
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
      const key = ticketKey(id);
      if (request.method === "GET") {
        let saved = await options.store.get(key);
        // A pessoa consultando a própria conversa é o gatilho para reenviar o que ficou pendente.
        if (
          options.relay &&
          saved &&
          !staff &&
          (JSON.parse(saved) as StoredSupportTicket).relay?.pending.length
        ) {
          await withBudget(options.relay.flush(id));
          saved = await options.store.get(key);
        }
        return reply(200, {
          staff,
          ...(saved ? { ticket: publicTicket(JSON.parse(saved) as StoredSupportTicket) } : {}),
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
        Object.keys(body).some((key) => !["text", "requestId", "relayConsent"].includes(key)) ||
        !("text" in body) ||
        typeof body.text !== "string" ||
        !body.text.trim() ||
        body.text.length > 2000 ||
        !("requestId" in body) ||
        typeof body.requestId !== "string" ||
        !/^[a-f0-9-]{36}$/.test(body.requestId) ||
        ("relayConsent" in body && typeof body.relayConsent !== "string")
      )
        return reply(400, { error: "Escreva uma mensagem de até 2.000 caracteres." });
      for (let attempt = 0; attempt < 5; attempt++) {
        const snapshot = await options.store.readVersion!(key);
        const ticket: StoredSupportTicket = snapshot.value
          ? (JSON.parse(snapshot.value) as StoredSupportTicket)
          : { id, updatedAt: now(), messages: [] };
        if (staff && id !== own && !snapshot.value)
          return reply(404, { error: "Conversa não encontrada." });
        if (ticket.messages.some((message) => message.id === body.requestId))
          return reply(200, { staff, ticket: publicTicket(ticket) });
        if (ticket.messages.length >= 100)
          return reply(409, {
            error: "Esta conversa atingiu o limite de 100 mensagens. Nenhuma mensagem foi enviada.",
          });
        const fromTeam = staff && id !== own;
        // Com a ponte ligada, só segue ao Discord quem confirmou o aviso. Sem aceite, nada é gravado.
        const consent = "relayConsent" in body ? body.relayConsent : undefined;
        if (options.relay && !fromTeam && consent !== options.relay.noticeVersion)
          return reply(409, {
            error: "Confirme o aviso do atendimento para enviar a mensagem.",
            code: "relay-consent-required",
            noticeVersion: options.relay.noticeVersion,
          });
        ticket.messages.push({
          id: body.requestId,
          text: body.text.trim(),
          at: now(),
          from: fromTeam ? "team" : "user",
        });
        ticket.updatedAt = now();
        if (options.relay && !fromTeam)
          options.relay.enqueue(ticket, body.requestId, options.relay.noticeVersion);
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
        if (
          await options.store.compareAndSet!(key, JSON.stringify(ticket), TTL, snapshot.version)
        ) {
          let shown = ticket;
          if (options.relay && ticket.relay?.pending.length) {
            await withBudget(options.relay.flush(id));
            const latest = await options.store.get(key);
            if (latest) shown = JSON.parse(latest) as StoredSupportTicket;
          }
          return reply(200, { staff, ticket: publicTicket(shown) });
        }
      }
      return reply(409, { error: "A conversa mudou. Tente novamente." });
    } catch {
      return reply(503, { error: "Não foi possível conectar ao atendimento. Tente novamente." });
    }
  };
}

export async function deleteSupportAccount(
  store: KvStore,
  uid: string,
  relay?: { purge(ticketId: string): Promise<void> },
) {
  const id = accountKey(uid);
  // Primeiro tira as mensagens do canal do Discord, depois apaga o ticket.
  if (relay) await relay.purge(id).catch(() => {});
  await store.del(ticketKey(id));
  for (let attempt = 0; attempt < 5; attempt++) {
    const snapshot = await store.readVersion!(INBOX);
    if (!snapshot.value) return;
    const index = JSON.parse(snapshot.value) as Inbox;
    delete index[id];
    if (await store.compareAndSet!(INBOX, JSON.stringify(index), TTL, snapshot.version)) return;
  }
  throw new Error("support-cleanup");
}
