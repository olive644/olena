import { useEffect } from "react";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { requestSocial } from "../data/profile-social";
import { useStoredProfile } from "./use-stored-profile";
import { profileAvatarSource } from "../domain/profile-avatars";
import { profileCover } from "../domain/profile-covers";
import { ACCOUNT_OWNER_KEY } from "../data/personal-data";

export function useProfilePresentation(username: string, fallback: string) {
  const [profile] = useStoredProfile();
  const name = profile.name?.trim() || fallback;
  const photoUrl = profileAvatarSource(profile.photoUrl);
  const cover = profileCover(profile.cover);
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
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [username, name, photoUrl, cover]);
}
