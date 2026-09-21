import { useEffect, useState } from "react";
import { getFirebaseAccountServices } from "../data/firebase-account";
import {
  applySyncedStorage,
  readSyncedStorage,
  SYNCED_STORAGE_EVENT,
} from "../data/synced-storage";

type CloudState = { version?: number; updatedAt?: number; items?: Record<string, string> };

export type CloudSyncState = {
  ready: boolean;
  revision: number;
  authenticated?: boolean;
  enabled: boolean;
  status: "disabled" | "signed-out" | "loading" | "syncing" | "synced" | "offline";
  displayName?: string | undefined;
  email?: string | undefined;
  lastSyncedAt?: number | undefined;
  syncNow?: (() => void) | undefined;
  signOut?: (() => Promise<void>) | undefined;
};

export function useCloudSync() {
  const enabled =
    !import.meta.env["VITEST"] &&
    Boolean(
      import.meta.env["VITE_FIREBASE_API_KEY"] &&
      import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] &&
      import.meta.env["VITE_FIREBASE_PROJECT_ID"],
    );
  const [state, setState] = useState<CloudSyncState>({
    ready: !enabled,
    revision: 0,
    enabled,
    status: enabled ? "loading" : "disabled",
  });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let stopAuth: (() => void) | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let uploadTimer: ReturnType<typeof setTimeout> | undefined;
    let saveCloud: (() => Promise<void>) | undefined;
    let dirty = false;
    let changeRevision = 0;

    function scheduleUpload() {
      if (!saveCloud) return;
      dirty = true;
      changeRevision += 1;
      clearTimeout(uploadTimer);
      setState((current) => ({ ...current, status: "syncing" }));
      uploadTimer = setTimeout(() => void saveCloud?.(), 350);
    }
    window.addEventListener(SYNCED_STORAGE_EVENT, scheduleUpload);

    void getFirebaseAccountServices()
      .then(({ auth, authApi, databaseURL }) => {
        if (!active) return;
        async function syncUser(user: (typeof auth)["currentUser"]) {
          clearInterval(pollTimer);
          pollTimer = undefined;
          saveCloud = undefined;
          if (!user) {
            setState((current) => ({
              enabled: current.enabled,
              ready: true,
              revision: current.revision,
              authenticated: false,
              status: "signed-out",
            }));
            return;
          }

          const signOut = async () => {
            clearTimeout(uploadTimer);
            dirty = false;
            saveCloud = undefined;
            await authApi.signOut(auth);
            applySyncedStorage({});
          };

          setState((current) => ({
            ...current,
            ready: false,
            authenticated: true,
            status: "loading",
            displayName: user.displayName ?? undefined,
            email: user.email ?? undefined,
            signOut,
          }));
          const url = `${databaseURL}/users/${user.uid}/state.json`;
          const request = async (method: "GET" | "PUT", body?: CloudState) => {
            const token = await user.getIdToken();
            const init: RequestInit = { method };
            if (body) {
              init.body = JSON.stringify(body);
              init.headers = { "Content-Type": "application/json" };
            }
            const response = await fetch(`${url}?auth=${encodeURIComponent(token)}`, init);
            if (!response.ok) throw new Error("sync");
            return (await response.json()) as CloudState | null;
          };
          // O login com Google (GoogleLogin) grava localmente que o
          // onboarding foi concluido assim que a autenticacao termina, no
          // mesmo instante em que onAuthStateChanged dispara esta funcao.
          // Como o GET abaixo e uma chamada de rede, ele pode demorar mais
          // que essa gravacao local — sem essa checagem, um retorno de
          // nuvem antigo (de uma sessao anterior) sobrescreveria a marca de
          // onboarding concluido que acabou de ser salva, jogando a pessoa
          // de volta pro onboarding mesmo apos o login funcionar.
          const localBeforeGet = JSON.stringify(readSyncedStorage());
          const cloud = await request("GET");
          if (!active) return;
          const localAfterGet = JSON.stringify(readSyncedStorage());

          let lastItems = "";
          if (cloud?.items && localAfterGet === localBeforeGet) {
            applySyncedStorage(cloud.items);
            lastItems = JSON.stringify(cloud.items);
          } else {
            dirty = true;
            changeRevision += 1;
          }

          saveCloud = async () => {
            const items = readSyncedStorage();
            const serialized = JSON.stringify(items);
            if (serialized === lastItems) {
              dirty = false;
              setState((current) => ({ ...current, status: "synced" }));
              return;
            }
            const savingRevision = changeRevision;
            setState((current) => ({ ...current, status: "syncing" }));
            try {
              await request("PUT", { version: 1, updatedAt: Date.now(), items });
              if (!active) return;
              lastItems = serialized;
              if (savingRevision === changeRevision) dirty = false;
              const savedAt = Date.now();
              setState((current) => ({
                ...current,
                status: dirty ? "syncing" : "synced",
                lastSyncedAt: savedAt,
              }));
              if (dirty) {
                clearTimeout(uploadTimer);
                uploadTimer = setTimeout(() => void saveCloud?.(), 350);
              }
            } catch {
              if (active) setState((current) => ({ ...current, status: "offline" }));
            }
          };

          const receiveCloud = (next: CloudState | null) => {
            const serialized = next?.items ? JSON.stringify(next.items) : undefined;
            const changed = Boolean(serialized && serialized !== lastItems);
            if (changed && next?.items && serialized) {
              lastItems = serialized;
              applySyncedStorage(next.items);
            }
            setState((current) => ({
              ...current,
              ready: true,
              authenticated: true,
              status: "synced",
              lastSyncedAt: Date.now(),
              revision: current.revision,
            }));
          };

          const syncNow = () => {
            clearTimeout(uploadTimer);
            const serialized = JSON.stringify(readSyncedStorage());
            if (dirty || serialized !== lastItems) {
              dirty = true;
              changeRevision += 1;
              void saveCloud?.();
              return;
            }
            setState((current) => ({ ...current, status: "syncing" }));
            void request("GET")
              .then(receiveCloud)
              .catch(() => setState((current) => ({ ...current, status: "offline" })));
          };

          setState((current) => ({
            ...current,
            ready: true,
            authenticated: true,
            status: dirty ? "syncing" : "synced",
            displayName: user.displayName ?? undefined,
            email: user.email ?? undefined,
            lastSyncedAt: Date.now(),
            syncNow,
            signOut,
            revision: current.revision + 1,
          }));
          if (dirty) void saveCloud();
          pollTimer = setInterval(() => {
            if (dirty) {
              void saveCloud?.();
              return;
            }
            void request("GET")
              .then(receiveCloud)
              .catch(() => setState((current) => ({ ...current, status: "offline" })));
          }, 5000);
        }
        stopAuth = authApi.onAuthStateChanged(auth, (user) => {
          void syncUser(user).catch(() =>
            setState((current) => ({
              ...current,
              ready: true,
              authenticated: Boolean(user),
              status: "offline",
            })),
          );
        });
      })
      .catch(() => setState((current) => ({ ...current, ready: true, status: "offline" })));

    return () => {
      active = false;
      clearTimeout(uploadTimer);
      clearInterval(pollTimer);
      stopAuth?.();
      window.removeEventListener(SYNCED_STORAGE_EVENT, scheduleUpload);
    };
  }, [enabled]);

  return state;
}
