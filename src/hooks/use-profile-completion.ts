import { useEffect, useState } from "react";
import type { StoredProfile } from "../domain/profile-identity";
import { profileCompletion, type ProfileCompletion } from "../domain/profile-completion";
import { invalidateProfileCompletion, requestProfileCompletion } from "../data/profile-completion";

export function useProfileCompletion(
  profile: StoredProfile,
  username: string,
  enabled: boolean,
  syncStatus?: string,
) {
  const key = JSON.stringify([
    profile.name ?? "",
    profile.photoUrl ?? "",
    profile.cover ?? "",
    username,
  ]);
  const expected = JSON.stringify(profileCompletion(profile, username));
  const [state, setState] = useState<{
    key: string;
    status: "confirmed" | "offline";
    completion?: ProfileCompletion;
  }>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const check = async () => {
      if (!active) return;
      try {
        const result = await requestProfileCompletion(key);
        if (!active) return;
        if (JSON.stringify(result) !== expected) {
          // Uma edição pode ainda estar na fila da sincronização. Não regredir o card.
          invalidateProfileCompletion();
          if (++attempt < 4) {
            timer = setTimeout(() => void check(), attempt * 2000);
            return;
          }
          setState({ key, status: "offline" });
          return;
        }
        setState({ key, status: "confirmed", completion: result });
      } catch {
        if (active) setState({ key, status: "offline" });
      }
    };
    const retry = () => {
      clearTimeout(timer);
      attempt = 0;
      invalidateProfileCompletion();
      void check();
    };
    timer = setTimeout(() => void check(), 500);
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    };
  }, [key, expected, enabled, syncStatus]);
  const current = enabled && state?.key === key ? state : undefined;
  return {
    status: current?.status ?? "pending",
    completion: current?.status === "confirmed" ? current.completion : undefined,
  };
}
