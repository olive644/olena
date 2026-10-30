import { useEffect } from "react";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { requestSocial } from "../data/profile-social";
import { useStoredProfile } from "./use-stored-profile";
import { profileAvatarSource } from "../domain/profile-avatars";
import { profileCover } from "../domain/profile-covers";
import { ACCOUNT_OWNER_KEY } from "../data/personal-data";
import type { WorkspaceState } from "../domain/workspace";
import { profileStreaks } from "../domain/profile-streaks";
import { profileLevel } from "../domain/profile-study";
import { readRoomXp } from "../data/room-xp";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { recognizeSocialLink } from "../domain/profile-identity";
import { ALL_ACHIEVEMENTS, mathAchievements } from "../domain/math-achievements";
import { achievementFamilies } from "../domain/achievement-presentation";
import { effectiveFavorites, isPublicCardId } from "../domain/arcana-profile";
import { ARCANA_IDS } from "../data/arcana-ids";
import { oliverCardDates, oliverCollection } from "../data/math-place-rewards";
import { readMathGame } from "../data/math-game-learning";
import type { AchievementProgress } from "./use-math-achievements";

export function useProfilePresentation(
  username: string,
  fallback: string,
  workspace?: WorkspaceState,
  values?: readonly AchievementProgress[],
) {
  const [profile] = useStoredProfile();
  const name = profile.name?.trim() || fallback;
  const photoUrl = profileAvatarSource(profile.photoUrl);
  const cover = profileCover(profile.cover);
  const earned = (
    values ?? mathAchievements(readMathGame(), workspace?.practiceActivities, agendaTimeZone())
  ).filter((item) => item.earned);
  // Publica os destaques que o próprio perfil mostra: ausência sugere três, [] segue vazio.
  const earnedIds = new Set(earned.map((item) => item.id));
  const favorites = JSON.stringify(
    effectiveFavorites(
      profile.achievementFavorites,
      earnedIds,
      achievementFamilies(ALL_ACHIEVEMENTS, earnedIds).map((item) => item.id),
    ),
  );
  const owned = oliverCollection();
  const ownedCards = ARCANA_IDS.filter((id) => owned[id] && isPublicCardId(id));
  // Só os destaques efetivos saem do aparelho (cabem no limite de 4096 bytes do share).
  const featured = effectiveFavorites(profile.cardFavorites, new Set(ownedCards), ownedCards);
  const cardFavorites = JSON.stringify(featured);
  const cards = cardFavorites;
  const cardDates = JSON.stringify(
    Object.fromEntries(
      featured.flatMap((id) => {
        const at = oliverCardDates()[id as (typeof ARCANA_IDS)[number]];
        return at !== undefined && at > 0 && at <= 253402300799999
          ? [[id, new Date(at).toISOString()]]
          : [];
      }),
    ),
  );
  const achievements = JSON.stringify(earned.map((item) => item.id));
  const achievementDates = JSON.stringify(
    Object.fromEntries(
      earned.filter((item) => item.earnedAt).map((item) => [item.id, item.earnedAt]),
    ),
  );
  const details = workspace
    ? JSON.stringify({
        level: profileLevel(readRoomXp()).level,
        streaks: profileStreaks(workspace, [], new Date(), agendaTimeZone()),
        socialLinks: (profile.socialLinks ?? [])
          .filter((link) => recognizeSocialLink(link))
          .slice(0, 5),
      })
    : "";
  useEffect(() => {
    if (!username || !name) return;
    let owner: string | null;
    try {
      owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
    } catch {
      return;
    }
    let active = true;
    void getFirebaseAccountServices()
      .then(async ({ auth }) => {
        await auth.authStateReady();
        if (!active) return;
        if (!auth.currentUser || auth.currentUser.isAnonymous) return;
        if (
          !owner ||
          owner !== auth.currentUser.uid ||
          localStorage.getItem(ACCOUNT_OWNER_KEY) !== owner
        )
          return;
        await requestSocial({
          action: "share",
          enabled: true,
          name,
          photoUrl,
          cover,
          expectedUsername: username,
          achievements: JSON.parse(achievements) as string[],
          achievementDates: JSON.parse(achievementDates) as Record<string, string>,
          achievementFavorites: JSON.parse(favorites) as string[],
          cards: JSON.parse(cards) as string[],
          cardDates: JSON.parse(cardDates) as Record<string, string>,
          cardFavorites: JSON.parse(cardFavorites) as string[],
          ...(details
            ? {
                details: JSON.parse(
                  details,
                ) as import("../domain/social-profile-details").SocialProfileDetails,
              }
            : {}),
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [
    username,
    name,
    photoUrl,
    cover,
    details,
    achievements,
    achievementDates,
    favorites,
    cards,
    cardDates,
    cardFavorites,
  ]);
}
