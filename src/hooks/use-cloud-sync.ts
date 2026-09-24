import { useEffect, useState } from "react";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { claimDeviceForAccount, clearPersonalData } from "../data/personal-data";
import {
  applySyncedStorage,
  readSyncedStorage,
  SYNCED_STORAGE_EVENT,
} from "../data/synced-storage";
import type { SyncedItems, SyncedMergeResult } from "../data/sync-conflict";

type CloudState = { version?: number; updatedAt?: number; items?: Record<string, string> };
const SYNC_CONFLICT_STORAGE_KEY = "helenastudy.sync-conflict.v1";

// O cookie de sessão do Google Agenda é HttpOnly: só o servidor consegue apagá-lo.
// Ao sair da conta ele não pode continuar dando acesso à agenda da pessoa anterior.
function disconnectGoogleCalendar() {
  try {
    void fetch("/api/google-calendar?action=disconnect", { method: "POST" }).catch(() => undefined);
  } catch {
    /* Sem rede, o cookie expira sozinho e a desconexão manual continua disponível. */
  }
}

async function mergeItems(
  base: SyncedItems,
  local: SyncedItems,
  remote: SyncedItems,
): Promise<SyncedMergeResult> {
  const { mergeSyncedItems } = await import("../data/sync-conflict");
  return mergeSyncedItems(base, local, remote);
}

export type CloudSyncState = {
  ready: boolean;
  revision: number;
  authenticated?: boolean;
  enabled: boolean;
  status: "disabled" | "signed-out" | "loading" | "syncing" | "synced" | "offline" | "conflict";
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
    let conflictPending = false;

    function parseItems(serialized: string): SyncedItems {
      try {
        const parsed: unknown = JSON.parse(serialized);
        if (!parsed || typeof parsed !== "object") return {};
        return Object.fromEntries(
          Object.entries(parsed).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        );
      } catch {
        return {};
      }
    }

    function rememberConflict(
      base: SyncedItems,
      local: SyncedItems,
      remote: SyncedItems,
      keys: string[],
    ) {
      conflictPending = true;
      try {
        localStorage.setItem(
          SYNC_CONFLICT_STORAGE_KEY,
          JSON.stringify({ createdAt: Date.now(), base, local, remote, keys }),
        );
      } catch {
        // A full localStorage must not interrupt the sync path.
      }
    }

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
            conflictPending = false;
            localStorage.removeItem(SYNC_CONFLICT_STORAGE_KEY);
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
            // Em computador compartilhado, nada da pessoa que saiu pode ficar visível
            // para a próxima: histórico de versões, rascunhos do caderno, progresso,
            // perfil e sessões de sala, não só as chaves sincronizadas.
            clearPersonalData(localStorage);
            clearPersonalData(sessionStorage);
            disconnectGoogleCalendar();
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
          // Outra conta já usou este aparelho: os dados dela não podem ir para a conta nova.
          claimDeviceForAccount(localStorage, user.uid);
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
          const localBeforeGet = readSyncedStorage();
          const cloud = await request("GET");
          if (!active) return;
          const localAfterGet = readSyncedStorage();

          let lastItems = "";
          if (cloud?.items) {
            const merged = { ...cloud.items };
            // Chave introduzida depois da primeira versão da nuvem: não apague
            // a sequência local antiga antes de enviá-la à conta.
            const localPomodoro = localAfterGet["noteoli.pomodoro-streak.v1"];
            if (cloud.items["noteoli.pomodoro-streak.v1"] === undefined && localPomodoro)
              merged["noteoli.pomodoro-streak.v1"] = localPomodoro;
            for (const key of new Set([
              ...Object.keys(localBeforeGet),
              ...Object.keys(localAfterGet),
            ])) {
              if (localBeforeGet[key] !== localAfterGet[key]) {
                if (localAfterGet[key] === undefined) delete merged[key];
                else merged[key] = localAfterGet[key];
              }
            }
            applySyncedStorage(merged);
            const remoteSerialized = JSON.stringify(cloud.items);
            lastItems = JSON.stringify(merged) === remoteSerialized ? remoteSerialized : "";
            if (!lastItems) {
              dirty = true;
              changeRevision += 1;
            }
          } else {
            dirty = true;
            changeRevision += 1;
          }

          saveCloud = async () => {
            let items = readSyncedStorage();
            let serialized = JSON.stringify(items);
            if (serialized === lastItems) {
              dirty = false;
              setState((current) => ({
                ...current,
                status: conflictPending ? "conflict" : "synced",
              }));
              return;
            }
            const savingRevision = changeRevision;
            setState((current) => ({ ...current, status: "syncing" }));
            try {
              if (lastItems) {
                const latest = await request("GET");
                const latestItems = latest?.items;
                const latestSerialized = latestItems ? JSON.stringify(latestItems) : "";
                if (latestItems && latestSerialized && latestSerialized !== lastItems) {
                  const merged = await mergeItems(parseItems(lastItems), items, latestItems);
                  if (merged.conflicts.length)
                    rememberConflict(parseItems(lastItems), items, latestItems, merged.conflicts);
                  items = merged.items;
                  serialized = JSON.stringify(items);
                  applySyncedStorage(items);
                }
              }
              await request("PUT", { version: 1, updatedAt: Date.now(), items });
              if (!active) return;
              lastItems = serialized;
              if (savingRevision === changeRevision) dirty = false;
              const savedAt = Date.now();
              setState((current) => ({
                ...current,
                status: dirty ? "syncing" : conflictPending ? "conflict" : "synced",
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

          const receiveCloud = async (next: CloudState | null) => {
            const serialized = next?.items ? JSON.stringify(next.items) : undefined;
            const changed = Boolean(serialized && serialized !== lastItems);
            if (changed && next?.items && serialized) {
              const localItems = readSyncedStorage();
              const localSerialized = JSON.stringify(localItems);
              if (localSerialized !== lastItems) {
                const merged = await mergeItems(parseItems(lastItems), localItems, next.items);
                if (merged.conflicts.length)
                  rememberConflict(parseItems(lastItems), localItems, next.items, merged.conflicts);
                applySyncedStorage(merged.items);
                dirty = true;
                changeRevision += 1;
                setState((current) => ({ ...current, status: "syncing" }));
                void saveCloud?.();
              } else {
                lastItems = serialized;
                applySyncedStorage(next.items);
              }
            }
            setState((current) => ({
              ...current,
              ready: true,
              authenticated: true,
              status: conflictPending ? "conflict" : dirty ? "syncing" : "synced",
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
