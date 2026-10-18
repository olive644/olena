import { useEffect, useState } from "react";
import type { SocialFeed } from "../domain/profile-social";
import { requestSocial, SOCIAL_CHANGED } from "../data/profile-social";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { subscribeSocialUpdates } from "../data/profile-social-events";

// Só memória e UID confirmado: evita baixar o mesmo feed para sino e perfil.
let cached: { uid: string; value: SocialFeed; at: number } | undefined;
let flight: { uid: string; promise: Promise<SocialFeed> } | undefined;
let revision = 0;
const changes = new WeakSet<Event>();
function sharedFeed(uid: string) {
  if (flight?.uid === uid) return flight.promise;
  if (cached?.uid === uid && Date.now() - cached.at < 2000) return Promise.resolve(cached.value);
  const current = revision;
  const promise = requestSocial().then((value) => {
    if (current === revision) cached = { uid, value, at: Date.now() };
    return value;
  });
  flight = { uid, promise };
  void promise
    .finally(() => {
      if (flight?.promise === promise) flight = undefined;
    })
    .catch(() => {});
  return promise;
}
export function useSocialFeed(enabled: boolean) {
  const [feed, setFeed] = useState<SocialFeed>();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let pending = false;
    let generation = 0;
    let queued = false;
    let uid = "";
    let unsubscribe: (() => void) | undefined;
    let stopEvents: ((immediate?: boolean) => void) | undefined;
    const refresh = async () => {
      if (!uid) return;
      if (pending) {
        queued = true;
        return;
      }
      pending = true;
      const current = generation;
      const currentRevision = revision;
      try {
        const value = await sharedFeed(uid);
        if (alive && current === generation && currentRevision === revision) setFeed(value);
      } catch {
        // Uma falha de atualização não apaga números já confirmados.
      } finally {
        if (current === generation) {
          pending = false;
          if (queued && alive) {
            queued = false;
            void refresh();
          }
        }
      }
    };
    void getFirebaseAccountServices()
      .then(({ auth, authApi }) => {
        if (!alive) return;
        unsubscribe = authApi.onAuthStateChanged(auth, (user) => {
          stopEvents?.(true);
          stopEvents = undefined;
          generation++;
          pending = false;
          queued = false;
          uid = user && !user.isAnonymous ? user.uid : "";
          if (!uid || (cached && cached.uid !== uid) || (flight && flight.uid !== uid)) {
            cached = undefined;
            flight = undefined;
            revision++;
          }
          setFeed(cached?.uid === uid ? cached.value : undefined);
          if (uid) void refresh();
          if (uid) stopEvents = subscribeSocialUpdates(uid);
        });
      })
      .catch(() => {});
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const changed = (event: Event) => {
      if (!changes.has(event)) {
        changes.add(event);
        cached = undefined;
        flight = undefined;
        revision++;
      }
      void refresh();
    };
    window.addEventListener(SOCIAL_CHANGED, changed);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive = false;
      unsubscribe?.();
      stopEvents?.();
      window.clearInterval(timer);
      window.removeEventListener(SOCIAL_CHANGED, changed);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled]);
  return enabled ? feed : undefined;
}
