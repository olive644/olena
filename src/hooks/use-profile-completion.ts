import { useEffect, useState } from "react";
import type { StoredProfile } from "../domain/profile-identity";
import { profileCompletion } from "../domain/profile-completion";
import { invalidateProfileCompletion, requestProfileCompletion } from "../data/profile-completion";

export function useProfileCompletion(profile: StoredProfile, username: string, enabled: boolean) {
  const key = JSON.stringify([
    profile.name ?? "",
    profile.photoUrl ?? "",
    profile.cover ?? "",
    username,
  ]);
  const expected = JSON.stringify(profileCompletion(profile, username));
  const [state, setState] = useState<{ key: string; status: "confirmed" | "offline" }>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    const check = async () => {
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
        setState({ key, status: "confirmed" });
      } catch {
        if (active) setState({ key, status: "offline" });
      }
    };
    const retry = () => {
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
  }, [key, expected, enabled]);
  return state?.key === key ? state.status : "pending";
}
