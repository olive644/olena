import { uiText } from "../i18n/runtime.js";
import { getFirebaseAccountServices } from "./firebase-account";
import { PROFILE_AVATARS } from "../domain/profile-avatars";
import { PROFILE_COVERS } from "../domain/profile-covers";
import type { SocialAction, SocialFeed, SocialProfile } from "../domain/profile-social";
export const SOCIAL_CHANGED = "olena:social-changed";
export const SOCIAL_VISIT = "olena:social-visit";
function isActivity(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item["id"] === "string" &&
    /^[a-f0-9]{32}$/.test(item["id"]) &&
    ["focus", "practice", "quiz", "streak"].includes(String(item["kind"])) &&
    Number.isSafeInteger(item["value"]) &&
    Number(item["value"]) > 0 &&
    Number(item["value"]) <= 10000 &&
    Number.isFinite(item["at"])
  );
}
export function visitSocialProfile(username: string) {
  window.dispatchEvent(new CustomEvent(SOCIAL_VISIT, { detail: username }));
}
function isProfile(value: unknown): value is SocialProfile {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item["username"] === "string" &&
    /^[a-z0-9._]{1,30}$/.test(item["username"]) &&
    typeof item["name"] === "string" &&
    item["name"].length <= 80 &&
    (item["cover"] === undefined || PROFILE_COVERS.some((cover) => cover.id === item["cover"])) &&
    PROFILE_AVATARS.some((avatar) => avatar.photoUrl === item["photoUrl"]) &&
    ["followers", "following"].every(
      (field) => Number.isSafeInteger(item[field]) && Number(item[field]) >= 0,
    ) &&
    ["followsYou", "followed", "shared"].every((field) => typeof item[field] === "boolean")
  );
}
export async function requestSocial(action?: SocialAction, query = ""): Promise<SocialFeed> {
  const { auth } = await getFirebaseAccountServices().catch(() => {
    throw new Error(
      uiText("Não foi possível conectar sua conta. Entre novamente ou tente mais tarde."),
    );
  });
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error(uiText("Entre na conta para adicionar amigos."));
  const token = await user.getIdToken();
  const response = await fetch(`/api/profile-social${query ? `?${query}` : ""}`, {
    method: action ? "POST" : "GET",
    signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(action ? { body: JSON.stringify(action) } : {}),
  });
  const body: unknown = await response.json();
  if (auth.currentUser?.uid !== user.uid)
    throw new Error(uiText("A conta mudou. Abra o perfil novamente."));
  if (!response.ok)
    throw new Error(
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : uiText("Não foi possível consultar amigos."),
    );
  if (!body || typeof body !== "object") throw new Error(uiText("Resposta inválida de amigos."));
  const feed = body as SocialFeed;
  if (
    (feed.activitySharing !== undefined && typeof feed.activitySharing !== "boolean") ||
    (feed.activities !== undefined &&
      (!Array.isArray(feed.activities) ||
        feed.activities.length > 40 ||
        !feed.activities.every(
          (activity) =>
            isActivity(activity) &&
            isProfile(activity.person) &&
            typeof activity.liked === "boolean" &&
            Array.isArray(activity.likes) &&
            activity.likes.length <= 200 &&
            activity.likes.every(
              (person) =>
                typeof person.name === "string" &&
                person.name.length <= 80 &&
                typeof person.username === "string" &&
                /^[a-z0-9._]{1,30}$/.test(person.username),
            ),
        )))
  )
    throw new Error(uiText("Resposta inválida de amigos."));
  if (
    feed.connections !== undefined &&
    (!["followers", "following"].includes(feed.connections.kind) ||
      !/^[a-z0-9._]{1,30}$/.test(feed.connections.owner) ||
      !Array.isArray(feed.connections.people) ||
      feed.connections.people.length > 50 ||
      !feed.connections.people.every(isProfile) ||
      (feed.connections.next !== undefined &&
        (!Number.isSafeInteger(feed.connections.next) ||
          feed.connections.next < 0 ||
          feed.connections.next > 1000)))
  )
    throw new Error(uiText("Lista de conexões inválida."));
  if (
    feed.suggestions !== undefined &&
    (!Array.isArray(feed.suggestions) ||
      feed.suggestions.length > 10 ||
      !feed.suggestions.every(
        (item) => isProfile(item) && Number.isSafeInteger(item.mutualCount) && item.mutualCount > 0,
      ))
  )
    throw new Error(uiText("Sugestões inválidas."));
  if (
    !isProfile(feed.self) ||
    !Array.isArray(feed.notifications) ||
    feed.notifications.length > 50 ||
    !feed.notifications.every(
      (notice) =>
        isProfile(notice.person) &&
        Number.isFinite(notice.at) &&
        typeof notice.read === "boolean" &&
        (notice.kind === undefined ||
          (["activity", "like"].includes(notice.kind) && isActivity(notice.activity))),
    ) ||
    (feed.results !== undefined &&
      (!Array.isArray(feed.results) ||
        feed.results.length > 10 ||
        !feed.results.every(isProfile))) ||
    (feed.profile !== undefined && !isProfile(feed.profile))
  )
    throw new Error(uiText("Resposta inválida de amigos."));
  if (action) window.dispatchEvent(new Event(SOCIAL_CHANGED));
  return feed;
}
