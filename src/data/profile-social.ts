import { uiText } from "../i18n/runtime.js";
import { isMathCourse } from "./math-courses";
import { getFirebaseAccountServices } from "./firebase-account";
import { PROFILE_AVATARS } from "../domain/profile-avatars";
import { PROFILE_COVERS } from "../domain/profile-covers";
import type { SocialAction, SocialFeed, SocialProfile } from "../domain/profile-social";
import { validSocialProfileDetails } from "../domain/social-profile-details";
import {
  validAchievementIds,
  validAchievementDates,
  validAchievementFavorites,
} from "../domain/math-achievements";
export const SOCIAL_CHANGED = "olena:social-changed";
export const SOCIAL_VISIT = "olena:social-visit";
function isActivity(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item["id"] === "string" &&
    /^[a-f0-9]{32}$/.test(item["id"]) &&
    ["focus", "practice", "quiz", "streak", "module"].includes(String(item["kind"])) &&
    (item["course"] === undefined || isMathCourse(item["course"])) &&
    (item["level"] === undefined ||
      (Number.isInteger(item["level"]) &&
        Number(item["level"]) >= 0 &&
        Number(item["level"]) < 6)) &&
    (item["kind"] !== "module" || (isMathCourse(item["course"]) && item["level"] !== undefined)) &&
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
    (item["blocked"] === undefined || typeof item["blocked"] === "boolean") &&
    (item["achievements"] === undefined || validAchievementIds(item["achievements"])) &&
    (item["achievementDates"] === undefined || validAchievementDates(item["achievementDates"])) &&
    (item["achievementFavorites"] === undefined ||
      validAchievementFavorites(item["achievementFavorites"])) &&
    typeof item["username"] === "string" &&
    /^[a-z0-9._]{1,30}$/.test(item["username"]) &&
    typeof item["name"] === "string" &&
    item["name"].length <= 80 &&
    (item["details"] === undefined || validSocialProfileDetails(item["details"])) &&
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
    throw new Error(uiText(1079));
  });
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error(uiText(1080));
  const token = await user.getIdToken();
  const send = () =>
    fetch(`/api/profile-social${query ? `?${query}` : ""}`, {
      method: action ? "POST" : "GET",
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(action ? { body: JSON.stringify(action) } : {}),
    });
  // Falha de rede chega do navegador como "Failed to fetch". Leitura é repetida uma vez
  // (nada muda no servidor); ação não, para nunca seguir ou bloquear duas vezes.
  const response = await send()
    .catch((cause: unknown) => (action ? Promise.reject(cause) : send()))
    .catch((cause: unknown) => {
      throw new Error(
        uiText(cause instanceof DOMException && cause.name === "TimeoutError" ? 1116 : 1193),
      );
    });
  const body: unknown = await response.json().catch(() => undefined);
  if (auth.currentUser?.uid !== user.uid) throw new Error(uiText(1076));
  if (!response.ok)
    throw new Error(
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : uiText(927),
    );
  if (!body || typeof body !== "object") throw new Error(uiText(1081));
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
    throw new Error(uiText(1081));
  if (
    feed.connections !== undefined &&
    (!["followers", "following"].includes(feed.connections.kind) ||
      !/^[a-z0-9._]{1,30}$/.test(feed.connections.owner) ||
      !Array.isArray(feed.connections.people) ||
      feed.connections.people.length > 50 ||
      (feed.connections.next !== undefined &&
        (!Number.isSafeInteger(feed.connections.next) ||
          feed.connections.next < 0 ||
          feed.connections.next > 1000)))
  )
    throw new Error(uiText(1082));
  // Uma conta com dados fora do padrão some da lista, em vez de derrubar a lista inteira.
  if (feed.connections) feed.connections.people = feed.connections.people.filter(isProfile);
  if (
    feed.suggestions !== undefined &&
    (!Array.isArray(feed.suggestions) ||
      feed.suggestions.length > 10 ||
      !feed.suggestions.every(
        (item) => isProfile(item) && Number.isSafeInteger(item.mutualCount) && item.mutualCount > 0,
      ))
  )
    throw new Error(uiText(1083));
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
    throw new Error(uiText(1081));
  if (action) window.dispatchEvent(new Event(SOCIAL_CHANGED));
  return feed;
}
