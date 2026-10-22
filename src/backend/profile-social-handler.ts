import { createHash } from "node:crypto";
import { PROFILE_AVATARS, profileAvatarSource } from "../domain/profile-avatars.js";
import { PROFILE_COVERS, profileCover } from "../domain/profile-covers.js";
import type { SocialFeed, SocialProfile } from "../domain/profile-social.js";
import type { HandleIdentity, HandleRegistry } from "./profile-handle-handler.js";
import type { StudyActivity } from "./study-activity-summary.js";
import {
  validSocialProfileDetails,
  publicProfileDetails,
  type SocialProfileDetails,
} from "../domain/social-profile-details.js";
import { recognizeSocialLink } from "../domain/profile-identity.js";
import { isAchievementId, validAchievementIds } from "../domain/math-achievements.js";

type Account = {
  blocked?: Record<string, number>;
  achievements?: Record<string, true>;
  achievementsUpdatedAt?: number;
  display?: { name: string; photoUrl: string; cover?: string };
  details?: SocialProfileDetails;
  following: Record<string, number>;
  notices: Record<
    string,
    {
      at: number;
      read: boolean;
      actor?: string;
      kind?: "activity" | "like";
      owner?: string;
      activity?: StudyActivity;
    }
  >;
  activitySince?: number;
  activitySharing?: boolean;
  activities?: Record<string, StudyActivity & { likes: Record<string, number> }>;
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
  completedActivities?(uid: string): Promise<StudyActivity[]>;
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
        if (new TextEncoder().encode(raw).length > 4096)
          return reply(413, { error: "Requisição muito longa." });
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
          body = parsed as Record<string, unknown>;
        } catch {
          return reply(400, { error: "JSON inválido." });
        }
        const fields =
          body["action"] === "activity-privacy"
            ? ["action", "enabled"]
            : body["action"] === "publish-activities"
              ? ["action"]
              : body["action"] === "like-activity"
                ? ["action", "username", "activityId", "liked"]
                : body["action"] === "share"
                  ? [
                      "action",
                      "enabled",
                      "name",
                      "photoUrl",
                      "cover",
                      "expectedUsername",
                      "details",
                      "achievements",
                    ]
                  : body["action"] === "read"
                    ? ["action"]
                    : ["action", "username"];
        if (Object.keys(body).some((field) => !fields.includes(field)))
          return reply(400, { error: "Campos não permitidos." });
        if (
          ![
            "share",
            "block",
            "unblock",
            "read",
            "follow",
            "unfollow",
            "remove-follower",
            "activity-privacy",
            "publish-activities",
            "like-activity",
          ].includes(String(body["action"]))
        )
          return reply(400, { error: "Ação inválida." });
        if (body["action"] === "activity-privacy" && typeof body["enabled"] !== "boolean")
          return reply(400, { error: "Preferência inválida." });
        if (
          body["action"] === "like-activity" &&
          (typeof body["liked"] !== "boolean" ||
            typeof body["activityId"] !== "string" ||
            !/^[a-f0-9]{32}$/.test(body["activityId"]))
        )
          return reply(400, { error: "Atividade inválida." });
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
        if (
          body["cover"] !== undefined &&
          !PROFILE_COVERS.some((item) => item.id === body["cover"])
        )
          return reply(400, { error: "Capa inválida." });
        if (body["expectedUsername"] !== undefined && body["expectedUsername"] !== username)
          return reply(409, { error: "A conta mudou. Abra seu perfil novamente." });
        if (body["details"] !== undefined && !validSocialProfileDetails(body["details"]))
          return reply(400, { error: "Dados públicos do perfil inválidos." });
        if (body["achievements"] !== undefined && !validAchievementIds(body["achievements"]))
          return reply(400, { error: "Conquistas inválidas." });
      }
      const params = new URL(request.url).searchParams;
      const query = params.get("search");
      const list = params.get("list");
      const offset = Number(params.get("offset") ?? 0);
      if (
        (list !== null && !["followers", "following"].includes(list)) ||
        !Number.isSafeInteger(offset) ||
        offset < 0 ||
        offset > 1000
      )
        return reply(400, { error: "Lista inválida." });
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
      if (
        ["follow", "unfollow", "remove-follower", "block", "unblock"].includes(
          String(body["action"]),
        ) &&
        (!target || target === key)
      )
        return reply(400, { error: "Escolha outra pessoa para seguir." });
      let completed: StudyActivity[] | undefined;
      for (let attempt = 0; attempt < 8; attempt++) {
        const snapshot = await options.store.read();
        const state: SocialState = {
          accounts: Object.fromEntries(
            Object.entries(snapshot.value.accounts ?? {}).map(([id, account]) => [
              id,
              {
                ...account,
                blocked: { ...account.blocked },
                following: { ...account.following },
                notices: { ...account.notices },
                activities: Object.fromEntries(
                  Object.entries(account.activities ?? {}).map(([id, activity]) => [
                    id,
                    { ...activity, likes: { ...activity.likes } },
                  ]),
                ),
              },
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
        const blocked = (id: string) =>
          self.blocked?.[id] !== undefined || state.accounts[id]?.blocked?.[key] !== undefined;
        if (target && state.accounts[target]?.blocked?.[key] !== undefined)
          return reply(404, { error: "Perfil indisponível." });
        if (
          target &&
          blocked(target) &&
          ["follow", "like-activity"].includes(String(body["action"]))
        )
          return reply(403, { error: "Desbloqueie esta pessoa antes de interagir." });
        const profile = (id: string): SocialProfile => {
          const account = state.accounts[id] ?? empty();
          const details =
            !blocked(id) && account.display ? publicProfileDetails(account.details) : undefined;
          return {
            username: handles[id]?.username ?? "",
            name: (account.display?.name ?? handles[id]?.username ?? "").slice(0, 80),
            photoUrl: profileAvatarSource(account.display?.photoUrl),
            followers: Object.entries(state.accounts).filter(
              ([other, value]) => live(other) && value.following[id] !== undefined,
            ).length,
            following: Object.keys(account.following).filter(live).length,
            followsYou: account.following[key] !== undefined,
            followed: self.following[id] !== undefined,
            shared: !!account.display,
            cover: profileCover(account.display?.cover),
            blocked: self.blocked?.[id] !== undefined,
            ...(!blocked(id) && account.display && account.achievementsUpdatedAt !== undefined
              ? { achievements: Object.keys(account.achievements ?? {}).filter(isAchievementId) }
              : {}),
            ...(details ? { details } : {}),
          };
        };
        const feed = (): SocialFeed => ({
          self: profile(key),
          activitySharing: self.activitySharing !== false,
          activities: Object.entries(state.accounts)
            .filter(
              ([id, account]) =>
                live(id) &&
                !blocked(id) &&
                account.activitySince !== undefined &&
                (id === key || self.following[id] !== undefined || id === target),
            )
            .flatMap(([id, account]) =>
              Object.values(account.activities ?? {})
                .filter(
                  (activity) =>
                    activity.at >= account.activitySince! && now - activity.at < RETENTION,
                )
                .map((activity) => ({
                  id: activity.id,
                  kind: activity.kind,
                  value: activity.value,
                  at: activity.at,
                  ...(activity.course ? { course: activity.course } : {}),
                  ...(activity.level !== undefined ? { level: activity.level } : {}),
                  person: profile(id),
                  liked: activity.likes[key] !== undefined,
                  likes: Object.keys(activity.likes)
                    .filter((id) => live(id) && !blocked(id))
                    .map((actor) => ({
                      username: profile(actor).username,
                      name: profile(actor).name,
                    })),
                })),
            )
            .sort((a, b) => b.at - a.at)
            .slice(0, 40),
          notifications: Object.entries(self.notices)
            .filter(
              ([id, notice]) =>
                live(notice.actor ?? id) &&
                !blocked(notice.actor ?? id) &&
                (!notice.owner || !blocked(notice.owner)) &&
                (!notice.owner || state.accounts[notice.owner]?.activitySince !== undefined) &&
                now - notice.at >= 0 &&
                now - notice.at < RETENTION,
            )
            .sort(([, a], [, b]) => b.at - a.at)
            .slice(0, 50)
            .map(([id, notice]) => ({
              person: profile(notice.actor ?? id),
              at: notice.at,
              read: notice.read,
              ...(notice.kind ? { kind: notice.kind, activity: notice.activity } : {}),
            })),
          ...(query !== null
            ? {
                results: Object.keys(handles)
                  .filter(
                    (id) =>
                      id !== key &&
                      state.accounts[id]?.blocked?.[key] === undefined &&
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
            .filter((id) => id !== key && !blocked(id) && self.following[id] === undefined)
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
          ...(list === "followers" || list === "following"
            ? (() => {
                const owner = target ?? key;
                const ids = Object.keys(handles)
                  .filter(
                    (id) =>
                      id !== owner &&
                      !blocked(id) &&
                      (list === "followers"
                        ? state.accounts[id]?.following[owner] !== undefined
                        : state.accounts[owner]?.following[id] !== undefined),
                  )
                  .sort((a, b) => handles[a]!.username.localeCompare(handles[b]!.username));
                return {
                  connections: {
                    kind: list,
                    owner: handles[owner]!.username,
                    people: ids.slice(offset, offset + 50).map(profile),
                    ...(offset + 50 < ids.length ? { next: offset + 50 } : {}),
                  },
                };
              })()
            : {}),
        });
        if (request.method === "GET") return reply(200, feed());
        if (request.method === "DELETE") {
          delete state.accounts[key];
          for (const account of Object.values(state.accounts)) {
            delete account.following[key];
            if (account.blocked) delete account.blocked[key];
            delete account.notices[key];
            for (const [id, notice] of Object.entries(account.notices))
              if (notice.actor === key || notice.owner === key) delete account.notices[id];
            for (const activity of Object.values(account.activities ?? {}))
              delete activity.likes[key];
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
              ([id, value]) => live(value.actor ?? id) && now - value.at < RETENTION,
            ),
          );
          if (body["action"] === "activity-privacy") {
            self.activitySharing = body["enabled"] === true;
            if (body["enabled"] === true) self.activitySince ??= now;
            else {
              delete self.activitySince;
              delete self.activities;
              for (const account of Object.values(state.accounts))
                for (const [id, notice] of Object.entries(account.notices))
                  if (notice.owner === key) delete account.notices[id];
            }
          } else if (body["action"] === "publish-activities") {
            if (self.activitySharing !== false) {
              self.activitySince ??= now;
              completed ??= (await options.completedActivities?.(identity.uid)) ?? [];
              self.activities ??= {};
              for (const activity of completed.slice(0, 12)) {
                if (activity.at < self.activitySince) continue;
                const previous = self.activities[activity.id];
                if (previous && previous.value === activity.value) continue;
                self.activities[activity.id] = { ...activity, likes: previous?.likes ?? {} };
                for (const [id, account] of Object.entries(state.accounts)) {
                  if (id !== key && account.following[key] !== undefined) {
                    const noticeKey = `activity:${key}:${activity.id}`;
                    const existing = account.notices[noticeKey];
                    account.notices[noticeKey] = {
                      actor: key,
                      owner: key,
                      kind: "activity",
                      activity,
                      at: existing?.at ?? now,
                      read: existing?.read ?? false,
                    };
                  }
                }
              }
              self.activities = Object.fromEntries(
                Object.entries(self.activities)
                  .filter(([, activity]) => now - activity.at < RETENTION)
                  .sort(([, a], [, b]) => b.at - a.at)
                  .slice(0, 12),
              );
            }
          } else if (body["action"] === "like-activity") {
            const owner = target && state.accounts[target];
            const activity =
              owner && owner.activitySince !== undefined
                ? owner.activities?.[String(body["activityId"])]
                : undefined;
            if (!target || !owner || !activity || now - activity.at >= RETENTION || target === key)
              return reply(404, { error: "Atividade indisponível." });
            const noticeId = `like:${key}:${activity.id}`;
            if (body["liked"] === true) {
              if (activity.likes[key] === undefined) {
                if (Object.keys(activity.likes).length >= 200)
                  return reply(409, { error: "Limite de curtidas atingido." });
                activity.likes[key] = now;
                owner.notices[noticeId] = {
                  actor: key,
                  owner: target,
                  kind: "like",
                  activity: {
                    id: activity.id,
                    kind: activity.kind,
                    value: activity.value,
                    at: activity.at,
                    ...(activity.course ? { course: activity.course } : {}),
                    ...(activity.level !== undefined ? { level: activity.level } : {}),
                  },
                  at: now,
                  read: false,
                };
              }
            } else {
              delete activity.likes[key];
              delete owner.notices[noticeId];
            }
          } else if (body["action"] === "share") {
            if (body["achievements"] !== undefined) {
              self.achievements = Object.fromEntries(
                (body["achievements"] as string[]).map((id) => [id, true as const]),
              );
              self.achievementsUpdatedAt = now;
            }
            if (validSocialProfileDetails(body["details"])) {
              const details = body["details"];
              self.details = {
                level: details.level,
                streaks: {
                  pomodoro: details.streaks.pomodoro,
                  timer: details.streaks.timer,
                  islands: details.streaks.islands,
                },
                socialLinks: [
                  ...new Set(details.socialLinks.map((link) => recognizeSocialLink(link)!.url)),
                ],
                updatedAt: now,
              };
            }
            if (body["enabled"])
              self.display = {
                name: String(body["name"]).trim(),
                photoUrl: String(body["photoUrl"]),
                ...(body["cover"] !== undefined ? { cover: String(body["cover"]) } : {}),
              };
            else delete self.display;
          } else if (body["action"] === "read") {
            for (const notice of Object.values(self.notices)) notice.read = true;
          } else if (target) {
            if (body["action"] === "block") {
              self.blocked ??= {};
              if (self.blocked[target] === undefined && Object.keys(self.blocked).length >= 200)
                return reply(409, { error: "Limite de 200 bloqueios atingido." });
              self.blocked[target] = now;
              delete self.following[target];
              const other = state.accounts[target];
              if (other) delete other.following[key];
              for (const [owner, account] of [
                [key, self],
                [target, other],
              ] as const) {
                if (!account) continue;
                const opposite = owner === key ? target : key;
                for (const [id, notice] of Object.entries(account.notices))
                  if (id === opposite || notice.actor === opposite || notice.owner === opposite)
                    delete account.notices[id];
                for (const activity of Object.values(account.activities ?? {}))
                  delete activity.likes[opposite];
              }
            } else if (body["action"] === "unblock") {
              if (self.blocked) delete self.blocked[target];
            } else if (body["action"] === "remove-follower") {
              const other = state.accounts[target];
              if (other) delete other.following[key];
              delete self.notices[target];
            } else if (body["action"] === "unfollow") delete self.following[target];
            else if (self.following[target] === undefined) {
              if (Object.keys(self.following).length >= 200)
                return reply(409, { error: "Você pode seguir até 200 pessoas nesta versão." });
              if (!state.accounts[target] && Object.keys(state.accounts).length >= 1000)
                return reply(503, { error: "Novas conexões estão temporariamente indisponíveis." });
              self.following[target] = now;
              const other = (state.accounts[target] ??= empty());
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
        for (const account of Object.values(state.accounts))
          account.notices = Object.fromEntries(
            Object.entries(account.notices)
              .filter(([, notice]) => now - notice.at < RETENTION)
              .sort(([, a], [, b]) => b.at - a.at)
              .slice(0, 50),
          );
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
