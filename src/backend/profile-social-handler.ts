import { createHash } from "node:crypto";
import { PROFILE_AVATARS } from "../domain/profile-avatars.js";
import type { SocialFeed, SocialProfile } from "../domain/profile-social.js";
import type { HandleIdentity, HandleRegistry } from "./profile-handle-handler.js";

type Account = {
  display?: { name: string; photoUrl: string };
  following: Record<string, number>;
  notices: Record<string, { at: number; read: boolean }>;
};
export type SocialState = { accounts: Record<string, Account> };
export type SocialStore = {
  read(): Promise<{ value: SocialState; version: string }>;
  write(value: SocialState, version: string): Promise<boolean>;
};
const keyFor = (uid: string) => createHash("sha256").update(uid).digest("hex");
const empty = (): Account => ({ following: {}, notices: {} });
const RETENTION = 48 * 60 * 60 * 1000;

export function createProfileSocialHandler(options: {
  store: SocialStore;
  handles(): Promise<HandleRegistry>;
  identify(request: Request): Promise<HandleIdentity | undefined>;
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
        return reply(401, { error: "Entre na conta para encontrar pessoas." });
      if (!(await options.consume(identity.uid)))
        return reply(429, { error: "Aguarde um pouco antes de tentar novamente." });
      const key = keyFor(identity.uid);
      const handles = await options.handles();
      const username = handles[key]?.username;
      if (!username && request.method !== "DELETE")
        return reply(409, { error: "Defina seu Nome de usuário no perfil para usar amigos." });
      const live = (id: string) => !!handles[id]?.username;
      const now = options.now?.() ?? Date.now();
      let body: Record<string, unknown> = {};
      if (request.method === "POST") {
        if (!request.headers.get("content-type")?.startsWith("application/json"))
          return reply(415, { error: "Envie JSON." });
        const raw = await request.text();
        if (new TextEncoder().encode(raw).length > 2048)
          return reply(413, { error: "Requisição muito longa." });
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
          body = parsed as Record<string, unknown>;
        } catch {
          return reply(400, { error: "JSON inválido." });
        }
        const fields =
          body["action"] === "share"
            ? ["action", "enabled", "name", "photoUrl"]
            : body["action"] === "read"
              ? ["action"]
              : ["action", "username"];
        if (Object.keys(body).some((field) => !fields.includes(field)))
          return reply(400, { error: "Campos não permitidos." });
        if (!["share", "read", "follow", "unfollow"].includes(String(body["action"])))
          return reply(400, { error: "Ação inválida." });
        if (
          body["action"] === "share" &&
          (typeof body["enabled"] !== "boolean" ||
            (body["enabled"] &&
              (typeof body["name"] !== "string" ||
                !body["name"].trim() ||
                body["name"].length > 80 ||
                !PROFILE_AVATARS.some((avatar) => avatar.photoUrl === body["photoUrl"]))))
        )
          return reply(400, { error: "Nome ou personagem inválido." });
      }
      const params = new URL(request.url).searchParams;
      const query = params.get("search");
      const targetName = request.method === "GET" ? params.get("username") : body["username"];
      if (query !== null && !/^[\p{L}\p{M}\p{N} ._'-]{2,80}$/u.test(query))
        return reply(400, { error: "Busque com pelo menos duas letras do nome ou @." });
      let target: string | undefined;
      if (targetName !== undefined && targetName !== null) {
        if (typeof targetName !== "string" || !/^[a-z0-9._]{1,30}$/.test(targetName))
          return reply(400, { error: "Nome de usuário inválido." });
        target = Object.keys(handles).find((id) => handles[id]?.username === targetName);
        if (!target) return reply(404, { error: "Perfil não encontrado." });
      }
      if (["follow", "unfollow"].includes(String(body["action"])) && (!target || target === key))
        return reply(400, { error: "Escolha outra pessoa para seguir." });
      for (let attempt = 0; attempt < 8; attempt++) {
        const snapshot = await options.store.read();
        const state: SocialState = {
          accounts: Object.fromEntries(
            Object.entries(snapshot.value.accounts ?? {}).map(([id, account]) => [
              id,
              { ...account, following: { ...account.following }, notices: { ...account.notices } },
            ]),
          ),
        };
        if (request.method === "POST") {
          const latest = await options.handles();
          if (
            latest[key]?.username !== username ||
            (target && latest[target]?.username !== targetName)
          )
            return reply(409, { error: "O perfil mudou. Busque novamente antes de seguir." });
        }
        const self = state.accounts[key] ?? empty();
        const profile = (id: string): SocialProfile => {
          const account = state.accounts[id] ?? empty();
          return {
            username: handles[id]?.username ?? "",
            name: account.display?.name ?? handles[id]?.username ?? "",
            photoUrl: account.display?.photoUrl ?? "/profile-avatars/helena.webp",
            followers: Object.entries(state.accounts).filter(
              ([other, value]) => live(other) && value.following[id] !== undefined,
            ).length,
            following: Object.keys(account.following).filter(live).length,
            followsYou: account.following[key] !== undefined,
            followed: self.following[id] !== undefined,
            shared: !!account.display,
          };
        };
        const feed = (): SocialFeed => ({
          self: profile(key),
          notifications: Object.entries(self.notices)
            .filter(
              ([actor, notice]) =>
                live(actor) && now - notice.at >= 0 && now - notice.at < RETENTION,
            )
            .sort(([, a], [, b]) => b.at - a.at)
            .slice(0, 50)
            .map(([actor, notice]) => ({ person: profile(actor), ...notice })),
          ...(query !== null
            ? {
                results: Object.keys(handles)
                  .filter(
                    (id) =>
                      id !== key &&
                      (handles[id]!.username.startsWith(query) ||
                        state.accounts[id]?.display?.name
                          .toLocaleLowerCase("pt-BR")
                          .includes(query.toLocaleLowerCase("pt-BR"))),
                  )
                  .slice(0, 10)
                  .map(profile),
              }
            : {}),
          suggestions: Object.keys(handles)
            .filter((id) => id !== key && self.following[id] === undefined)
            .map((id) => ({
              ...profile(id),
              mutualCount: Object.keys(self.following).filter(
                (other) => live(other) && state.accounts[other]?.following[id] !== undefined,
              ).length,
            }))
            .filter((item) => item.mutualCount > 0)
            .sort((a, b) => b.mutualCount - a.mutualCount)
            .slice(0, 10),
          ...(target ? { profile: profile(target) } : {}),
        });
        if (request.method === "GET") return reply(200, feed());
        if (request.method === "DELETE") {
          delete state.accounts[key];
          for (const account of Object.values(state.accounts)) {
            delete account.following[key];
            delete account.notices[key];
          }
        } else {
          if (!state.accounts[key] && Object.keys(state.accounts).length >= 1000)
            return reply(503, { error: "Novas conexões estão temporariamente indisponíveis." });
          state.accounts[key] = self;
          self.following = Object.fromEntries(
            Object.entries(self.following).filter(([id]) => live(id)),
          );
          self.notices = Object.fromEntries(
            Object.entries(self.notices).filter(
              ([actor, value]) => live(actor) && now - value.at < RETENTION,
            ),
          );
          if (body["action"] === "share") {
            if (body["enabled"])
              self.display = {
                name: String(body["name"]).trim(),
                photoUrl: String(body["photoUrl"]),
              };
            else delete self.display;
          } else if (body["action"] === "read") {
            for (const notice of Object.values(self.notices)) notice.read = true;
          } else if (target) {
            if (body["action"] === "unfollow") delete self.following[target];
            else if (self.following[target] === undefined) {
              if (Object.keys(self.following).length >= 200)
                return reply(409, { error: "Você pode seguir até 200 pessoas nesta versão." });
              if (!state.accounts[target] && Object.keys(state.accounts).length >= 1000)
                return reply(503, { error: "Novas conexões estão temporariamente indisponíveis." });
              self.following[target] = now;
              const other = (state.accounts[target] ??= empty());
              if (!other.notices[key] || now - other.notices[key]!.at >= RETENTION)
                other.notices[key] = { at: now, read: false };
              other.notices = Object.fromEntries(
                Object.entries(other.notices)
                  .filter(([, value]) => now - value.at < RETENTION)
                  .sort(([, a], [, b]) => b.at - a.at)
                  .slice(0, 50),
              );
            }
          }
        }
        if (JSON.stringify(state).length > 5_000_000)
          return reply(503, { error: "Conexões temporariamente indisponíveis." });
        if (await options.store.write(state, snapshot.version))
          return reply(200, request.method === "DELETE" ? { deleted: true } : feed());
      }
      return reply(503, { error: "Muitas alterações simultâneas. Tente novamente." });
    } catch {
      return reply(503, { error: "Não foi possível consultar amigos. Tente novamente." });
    }
  };
}
