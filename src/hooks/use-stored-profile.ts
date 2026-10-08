import { useEffect, useState } from "react";
import { SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";
export type StoredProfile = { name?: string; photoUrl?: string };
function readStoredProfile(): StoredProfile {
  try {
    return JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}") as StoredProfile;
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
    return () => {
      window.removeEventListener(SYNCED_STORAGE_EVENT, refresh);
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    };
  }, []);
  return [profile, setProfile] as const;
}
