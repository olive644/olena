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
  // Lê só o @ de uma conta, sem baixar o registro inteiro. A consulta do próprio @ (GET) é a mais
  // frequente, e ler as 10 mil reservas a cada uma gastaria o limite de download do banco.
  readOne?(key: string): Promise<{ username: string } | undefined>;
  write(value: HandleRegistry, version: string): Promise<boolean>;
};
const accountKey = (uid: string) => createHash("sha256").update(uid).digest("hex");

// Nomes que fariam uma pessoa parecer a equipe ou o próprio produto. O @ da dona (oliver644) tem
// regra própria mais abaixo. Quem já tinha um destes antes da regra continua com ele.
const RESERVED_HANDLES = [
  "admin",
  "administrador",
  "adm",
  "olena",
  "olenastudy",
  "helena",
  "helenastudy",
  "galeriaoli",
  "oliver",
  "suporte",
  "support",
  "equipe",
  "team",
  "staff",
  "oficial",
  "official",
  "moderador",
  "moderator",
  "mod",
  "sistema",
  "system",
  "root",
  "ajuda",
  "help",
  "contato",
  "atendimento",
];
const LOOKALIKES: Record<string, string> = {
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
};

// Compara sem pontos e sublinhados e trocando números parecidos com letras, para que
// "4dmin", "o.lena" e "supor_te" não escapem da lista. O "1" vale "l" e "i".
export function isReservedHandle(username: string): boolean {
  const flat = username.replace(/[._]/g, "");
  const variants = new Set([
    flat.replace(/[013457]/g, (digit) => LOOKALIKES[digit] ?? digit),
    flat.replace(/[013457]/g, (digit) => (digit === "1" ? "i" : (LOOKALIKES[digit] ?? digit))),
  ]);
  return [...variants].some((variant) => RESERVED_HANDLES.includes(variant));
}

export function createProfileHandleHandler(options: {
  store: HandleStore;
  identify(request: Request): Promise<HandleIdentity | undefined>;
  allowedOrigins: string[];
  ownerEmail: string;
  consume(uid: string): Promise<boolean>;
  // Limite mais apertado para reservar e apagar, que leem e gravam o registro inteiro.
  consumeWrite?(uid: string): Promise<boolean>;
  afterDelete?(request: Request): Promise<void>;
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
      if (
        request.method !== "GET" &&
        options.consumeWrite &&
        !(await options.consumeWrite(identity.uid))
      )
        return reply(429, { error: "Muitas alterações de @. Tente novamente mais tarde." });
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
        if ((username === "oliver644" && !owner) || isReservedHandle(username))
          return reply(409, { error: "Esse @ já está reservado. Escolha outro." });
      }
      if (request.method === "GET" && options.store.readOne) {
        const current = (await options.store.readOne(key))?.username || "";
        return reply(200, {
          username: current,
          creks: owner && current === "oliver644",
          preferredUsername: owner ? "oliver644" : "",
        });
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
        if (await options.store.write(next, snapshot.version)) {
          if (request.method === "DELETE") await options.afterDelete?.(request);
          return reply(200, { username, creks: owner && username === "oliver644" });
        }
      }
      return reply(503, { error: "Muitas alterações simultâneas. Tente novamente." });
    } catch {
      return reply(503, { error: "Não foi possível confirmar o @. Tente novamente." });
    }
  };
}
