import { useEffect, useState } from "react";
import { getFirebaseAccountServices } from "../data/firebase-account";
import {
  PROFILE_HANDLE_CHANGED,
  requestProfileHandle,
  type ProfileHandle,
} from "../data/profile-handle";

const empty: ProfileHandle = { username: "", creks: false };
let cached: { uid: string; value: ProfileHandle } | undefined;
let flight: { uid: string; promise: Promise<ProfileHandle> } | undefined;
let epoch = 0;
const changes = new WeakSet<Event>();

function loadHandle(uid: string) {
  if (flight?.uid === uid) return flight.promise;
  const version = epoch;
  const promise = requestProfileHandle("GET").then(async (value) => {
    if (version !== epoch) return value;
    const resolved =
      !value.username && value.preferredUsername
        ? await requestProfileHandle("POST", value.preferredUsername)
        : value;
    if (version === epoch) cached = { uid, value: resolved };
    return resolved;
  });
  flight = { uid, promise };
  void promise
    .finally(() => {
      if (flight?.promise === promise) flight = undefined;
    })
    .catch(() => {});
  return promise;
}

export function useProfileHandle(guest: boolean) {
  const [state, setState] = useState<ProfileHandle>({ username: "", creks: false });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = (event: Event) => {
      if (!changes.has(event)) {
        changes.add(event);
        epoch++;
        cached = undefined;
        flight = undefined;
      }
      setRevision((value) => value + 1);
    };
    window.addEventListener(PROFILE_HANDLE_CHANGED, refresh);
    return () => window.removeEventListener(PROFILE_HANDLE_CHANGED, refresh);
  }, []);
  useEffect(() => {
    if (guest) return;
    let alive = true;
    let generation = 0;
    let unsubscribe: (() => void) | undefined;
    void getFirebaseAccountServices()
      .then(({ auth, authApi }) => {
        if (!alive) return;
        unsubscribe = authApi.onAuthStateChanged(auth, (user) => {
          const current = ++generation;
          if (
            !user ||
            user.isAnonymous ||
            (cached && cached.uid !== user.uid) ||
            (flight && flight.uid !== user.uid)
          ) {
            epoch++;
            cached = undefined;
            flight = undefined;
          }
          setState(user && !user.isAnonymous && cached?.uid === user.uid ? cached.value : empty);
          if (!user || user.isAnonymous) return;
          const version = epoch;
          void loadHandle(user.uid)
            .then((value) => {
              if (!alive || current !== generation || version !== epoch) return;
              setState(value);
            })
            .catch(() => {
              /* Sem confirmação, não exibir @ nem selo como verificados. */
            });
        });
      })
      .catch(() => {
        /* Sem login/configuração, não há identidade reservada. */
      });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [guest, revision]);
  return {
    handle: guest ? { username: "", creks: false } : state,
    refresh: () => setRevision((value) => value + 1),
  };
}
