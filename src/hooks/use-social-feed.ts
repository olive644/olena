import { useEffect, useState } from "react";
import type { SocialFeed } from "../domain/profile-social";
import { requestSocial, SOCIAL_CHANGED } from "../data/profile-social";
import { getFirebaseAccountServices } from "../data/firebase-account";
export function useSocialFeed(enabled: boolean) {
  const [feed, setFeed] = useState<SocialFeed>();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let pending = false;
    let generation = 0;
    let unsubscribe: (() => void) | undefined;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      const current = generation;
      try {
        const value = await requestSocial();
        if (alive && current === generation) setFeed(value);
      } catch {
        if (alive && current === generation) setFeed(undefined);
      } finally {
        pending = false;
      }
    };
    void getFirebaseAccountServices()
      .then(({ auth, authApi }) => {
        if (!alive) return;
        unsubscribe = authApi.onAuthStateChanged(auth, (user) => {
          generation++;
          pending = false;
          setFeed(undefined);
          if (user && !user.isAnonymous) void refresh();
        });
      })
      .catch(() => {});
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);
    window.addEventListener(SOCIAL_CHANGED, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      unsubscribe?.();
      window.clearInterval(timer);
      window.removeEventListener(SOCIAL_CHANGED, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled]);
  return enabled ? feed : undefined;
}
