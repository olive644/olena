import { useEffect, useState } from "react";
import { getFirebaseAccountServices } from "../data/firebase-account";
import {
  PROFILE_HANDLE_CHANGED,
  requestProfileHandle,
  type ProfileHandle,
} from "../data/profile-handle";

export function useProfileHandle(guest: boolean) {
  const [state, setState] = useState<ProfileHandle>({ username: "", creks: false });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
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
          setState({ username: "", creks: false });
          if (!user || user.isAnonymous) return;
          void requestProfileHandle("GET")
            .then(async (value) => {
              if (!alive || current !== generation) return;
              // A reserva do dono foi solicitada explicitamente; nomes antigos de outras
              // contas só são reservados ao confirmar o formulário.
              const resolved =
                !value.username && value.preferredUsername
                  ? await requestProfileHandle("POST", value.preferredUsername)
                  : value;
              if (alive && current === generation) setState(resolved);
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
