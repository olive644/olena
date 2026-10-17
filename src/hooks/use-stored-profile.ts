import { useEffect, useState } from "react";
import { SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";
import type { StoredProfile } from "../domain/profile-identity";
import { profileCover } from "../domain/profile-covers";
export type { StoredProfile } from "../domain/profile-identity";
export function readStoredProfile(): StoredProfile {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const profile = { ...value } as StoredProfile;
    if ("cover" in profile) profile.cover = profileCover(profile.cover);
    for (const key of ["name", "photoUrl", "username", "bio", "pronouns"] as const) {
      if (typeof profile[key] !== "string") delete profile[key];
    }
    if (!Array.isArray(profile.socialLinks)) delete profile.socialLinks;
    else
      profile.socialLinks = profile.socialLinks.filter(
        (link): link is string => typeof link === "string",
      );
    return profile;
  } catch {
    return {};
  }
}
export function useStoredProfile() {
  const [profile, setProfile] = useState(readStoredProfile);
  useEffect(() => {
    const refresh = () => setProfile(readStoredProfile());
    window.addEventListener(SYNCED_STORAGE_EVENT, refresh);
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    // Captura também uma aplicação ocorrida entre o render e a assinatura.
    refresh();
    return () => {
      window.removeEventListener(SYNCED_STORAGE_EVENT, refresh);
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    };
  }, []);
  return [profile, setProfile] as const;
}
