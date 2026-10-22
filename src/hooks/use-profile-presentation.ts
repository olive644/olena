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
import { mathAchievements } from "../domain/math-achievements";
import { readMathGame } from "../data/math-game-learning";

export function useProfilePresentation(
  username: string,
  fallback: string,
  workspace?: WorkspaceState,
) {
  const [profile] = useStoredProfile();
  const name = profile.name?.trim() || fallback;
  const photoUrl = profileAvatarSource(profile.photoUrl);
  const cover = profileCover(profile.cover);
  const earned = mathAchievements(
    readMathGame(),
    workspace?.practiceActivities,
    agendaTimeZone(),
  ).filter((item) => item.earned);
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
  }, [username, name, photoUrl, cover, details, achievements, achievementDates]);
}
