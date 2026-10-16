import { createHash } from "node:crypto";

export type HandleIdentity = {
  uid: string;
  email?: string;
  emailVerified: boolean;
  anonymous: boolean;
};
export type HandleRegistry = Record<string, { username: string }>;
export type HandleSnapshot = { value: HandleRegistry; version: string };
export type HandleStore = {
  read(): Promise<HandleSnapshot>;
  write(value: HandleRegistry, version: string): Promise<boolean>;
};
const accountKey = (uid: string) => createHash("sha256").update(uid).digest("hex");

export function createProfileHandleHandler(options: {
  store: HandleStore;
  identify(request: Request): Promise<HandleIdentity | undefined>;
  allowedOrigins: string[];
  ownerEmail: string;
  consume(uid: string): Promise<boolean>;
}) {
  return async (request: Request): Promise<Response> => {
    const reply = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    if (!["GET", "POST", "DELETE"].includes(request.method))
      return reply(405, { error: "Método não permitido." });
    const origin =
      request.headers.get("origin") ||
      (request.method === "GET" && request.headers.get("sec-fetch-site") === "same-origin"
        ? new URL(request.url).origin
        : null);
    if (!origin || !options.allowedOrigins.includes(origin))
      return reply(403, { error: "Origem não autorizada." });
    try {
      const identity = await options.identify(request);
      if (!identity || identity.anonymous)
        return reply(401, { error: "Entre na conta para criar um @." });
      if (!(await options.consume(identity.uid)))
        return reply(429, { error: "Aguarde um pouco antes de tentar novamente." });
      const owner =
        !!options.ownerEmail &&
        identity.emailVerified &&
        identity.email?.toLowerCase() === options.ownerEmail.toLowerCase();
      const key = accountKey(identity.uid);
      let username = "";
      if (request.method === "POST") {
        if (!request.headers.get("content-type")?.startsWith("application/json"))
          return reply(415, { error: "Envie JSON." });
        const raw = await request.text();
        if (new TextEncoder().encode(raw).length > 512)
          return reply(413, { error: "Requisição muito longa." });
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return reply(400, { error: "JSON inválido." });
        }
        if (
          !body ||
          typeof body !== "object" ||
          !("username" in body) ||
          typeof body.username !== "string" ||
          !/^[a-z0-9._]{0,30}$/.test(body.username)
        )
          return reply(400, { error: "Use até 30 letras minúsculas, números, ponto ou _." });
        username = body.username;
        if (username === "oliver644" && !owner)
          return reply(409, { error: "Esse @ já está reservado. Escolha outro." });
      }
      for (let attempt = 0; attempt < 12; attempt++) {
        const snapshot = await options.store.read();
        if (request.method === "GET") {
          const current = snapshot.value[key]?.username || "";
          return reply(200, {
            username: current,
            creks: owner && current === "oliver644",
            preferredUsername: owner ? "oliver644" : "",
          });
        }
        if (
          username &&
          Object.entries(snapshot.value).some(
            ([id, value]) => id !== key && value.username === username,
          )
        )
          return reply(409, { error: "Esse @ já está em uso. Escolha outro." });
        // ponytail: CAS central para até 10 mil contas. Migrar para índice transacional
        // particionado antes desse teto; nunca relaxar exclusividade sob concorrência.
        if (username && !snapshot.value[key] && Object.keys(snapshot.value).length >= 10_000)
          return reply(503, { error: "Reservas indisponíveis no momento." });
        const next = { ...snapshot.value };
        if (username) next[key] = { username };
        else delete next[key];
        if (await options.store.write(next, snapshot.version))
          return reply(200, { username, creks: owner && username === "oliver644" });
      }
      return reply(503, { error: "Muitas alterações simultâneas. Tente novamente." });
    } catch {
      return reply(503, { error: "Não foi possível confirmar o @. Tente novamente." });
    }
  };
}
