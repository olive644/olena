import { useEffect, useState } from "react";
import { rememberReturningVisitor } from "../data/returning-visitor";
import { reauthenticateAccount } from "../data/account-auth";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { deleteAccountEverywhere } from "../data/account-deletion";
import { claimDeviceForAccount, clearPersonalData } from "../data/personal-data";
import { loadWorkspace, serializeWorkspace, WORKSPACE_STORAGE_KEY } from "../data/local-workspace";
import {
  applySyncedStorage,
  readSyncedStorage,
  SYNCED_STORAGE_EVENT,
} from "../data/synced-storage";
import { mergeWorkspaceStates } from "../domain/workspace-sync-merge";
import type { SyncedItems, SyncedMergeResult } from "../data/sync-conflict";
import { mergeReadUpdates, SYSTEM_UPDATES_READ_KEY } from "../data/system-updates";
import { FOCUS_SESSION_KEY } from "../domain/focus-session";
import { ACCOUNT_PROFILE_KEY, mergeProfileProgress } from "../domain/profile-progress";
import { readPendingOnboardingConfiguration } from "../data/onboarding-client";
import { encodeCloudItems, decodeCloudItems, cloudWireName } from "../data/cloud-state-codec";

type CloudState = { version?: number; updatedAt?: number; items?: Record<string, string> };
const SYNC_CONFLICT_STORAGE_KEY = "helenastudy.sync-conflict.v1";

async function mergeItems(
  base: SyncedItems,
  local: SyncedItems,
  remote: SyncedItems,
): Promise<SyncedMergeResult> {
  const { mergeSyncedItems } = await import("../data/sync-conflict");
  const result = mergeSyncedItems(base, local, remote);
  // O espaço de estudos inteiro é só mais uma chave para o merge acima: se os dois lados
  // mudaram, ele descarta um bloco inteiro, mesmo quando as mudanças foram em cadernos ou
  // folhas diferentes (o caso comum de usar o mesmo app em dois aparelhos). Quando é
  // exatamente esse o conflito, mescla por item em vez de aceitar essa perda.
  if (
    result.conflicts.includes(WORKSPACE_STORAGE_KEY) ||
    (local[WORKSPACE_STORAGE_KEY] !== undefined && remote[WORKSPACE_STORAGE_KEY] !== undefined)
  ) {
    const asWorkspace = (raw: string | undefined) => loadWorkspace({ getItem: () => raw ?? null });
    const { workspace, conflicts } = mergeWorkspaceStates(
      asWorkspace(base[WORKSPACE_STORAGE_KEY]),
      asWorkspace(local[WORKSPACE_STORAGE_KEY]),
      asWorkspace(remote[WORKSPACE_STORAGE_KEY]),
    );
    result.items[WORKSPACE_STORAGE_KEY] = serializeWorkspace(workspace);
    if (conflicts === 0) {
      result.conflicts = result.conflicts.filter((key) => key !== WORKSPACE_STORAGE_KEY);
    } else if (!result.conflicts.includes(WORKSPACE_STORAGE_KEY)) {
      result.conflicts.push(WORKSPACE_STORAGE_KEY);
    }
  }
  return result;
}

// Chaves que mudaram entre o que a conta tinha e o que está no aparelho (null = removida).
function itemsDelta(base: SyncedItems, next: SyncedItems): Record<string, string | null> {
  const delta: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(next)) if (base[key] !== value) delta[key] = value;
  for (const key of Object.keys(base)) if (!(key in next)) delta[key] = null;
  return delta;
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
  signOut?: ((discardPending?: boolean) => Promise<void>) | undefined;
  // Apaga a conta e os estudos da nuvem. Rejeita com AccountDeletionError.
  deleteAccount?: ((password?: string) => Promise<void>) | undefined;
  passwordAccount?: boolean | undefined;
};

// Cada download do estado inteiro conta no Realtime Database (plano gratuito: 10 GB por mês), e
// o estado da conta pode ter megabytes. Por isso o envio só manda as chaves que mudaram, a
// conferência antes de salvar lê só o `updatedAt` (alguns bytes) e o stream escuta só esse campo.
// O estado completo só é baixado quando outro aparelho de fato gravou algo novo. Juntar as
// mudanças de poucos segundos num só envio reduz ainda mais, e o envio imediato ao esconder a
// página impede que a espera perca o que foi feito.
const CLOUD_UPLOAD_DELAY_MS = 4000;

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
    let eventSource: EventSource | undefined;
    let stopIdToken: (() => void) | undefined;
    let onlineListener: (() => void) | undefined;
    let uploadTimer: ReturnType<typeof setTimeout> | undefined;
    let saveCloud: (() => Promise<void>) | undefined;
    let dirty = false;
    let changeRevision = 0;
    let conflictPending = false;
    let accountRevision = 0;

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
      uploadTimer = setTimeout(() => void saveCloud?.(), CLOUD_UPLOAD_DELAY_MS);
    }
    window.addEventListener(SYNCED_STORAGE_EVENT, scheduleUpload);
    // Ao sair ou esconder a página, não espera o intervalo: envia o que estiver pendente agora.
    const flushPending = () => {
      if (!dirty || !saveCloud) return;
      clearTimeout(uploadTimer);
      void saveCloud();
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushPending();
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushPending);

    void getFirebaseAccountServices()
      .then(({ auth, authApi, databaseURL }) => {
        if (!active) return;
        async function syncUser(user: (typeof auth)["currentUser"], accountAttempt: number) {
          const currentAccount = () => active && accountRevision === accountAttempt;
          eventSource?.close();
          eventSource = undefined;
          stopIdToken?.();
          stopIdToken = undefined;
          if (onlineListener) window.removeEventListener("online", onlineListener);
          onlineListener = undefined;
          saveCloud = undefined;
          if (!user) {
            conflictPending = false;
            localStorage.removeItem(SYNC_CONFLICT_STORAGE_KEY);
            setState((current) => ({
              enabled: current.enabled,
              ready: true,
              revision: current.revision + 1,
              authenticated: false,
              status: "signed-out",
            }));
            return;
          }

          const accessProvider = user.getIdTokenResult
            ? (await user.getIdTokenResult()).signInProvider
            : user.providerData?.[0]?.providerId;
          if (!currentAccount()) return;
          // Em computador compartilhado, nada da pessoa que saiu pode ficar visível
          // para a próxima: histórico de versões, rascunhos do caderno, progresso,
          // perfil e sessões de sala, não só as chaves sincronizadas.
          const wipeDevice = (keepAccessConsent = false) => {
            clearPersonalData(localStorage, keepAccessConsent ? ["helena.accountAccess.v1"] : []);
            clearPersonalData(sessionStorage);
            applySyncedStorage({});
          };
          const stopSyncing = () => {
            clearTimeout(uploadTimer);
            dirty = false;
            saveCloud = undefined;
          };
          const signOutSync: { flush?: () => Promise<void> } = {};
          const signOut = async (discardPending = false) => {
            if (!discardPending) {
              if (!signOutSync.flush) throw new Error("sync-not-ready");
              let timer: ReturnType<typeof setTimeout> | undefined;
              try {
                await Promise.race([
                  signOutSync.flush(),
                  new Promise<never>((_, reject) => {
                    timer = setTimeout(() => reject(new Error("sync-timeout")), 15000);
                  }),
                ]);
              } finally {
                clearTimeout(timer);
              }
            }
            // Remover o registro não revoga tokens nem pode impedir a saída.
            await import("../data/account-devices")
              .then(({ requestAccountDevices }) => requestAccountDevices("DELETE"))
              .catch(() => {});
            await authApi.signOut(auth);
            rememberReturningVisitor();
            stopSyncing();
            accountRevision++;
            eventSource?.close();
            wipeDevice(true);
          };
          const deleteAccount = async (password?: string) => {
            // Durante a exclusão nada novo pode ser enviado; se ela falhar, a sincronização volta.
            const resume = saveCloud;
            stopSyncing();
            try {
              await deleteAccountEverywhere({
                reauthenticate: async () => {
                  await reauthenticateAccount(
                    { auth, authApi, databaseURL, redirectResult: null },
                    user,
                    password,
                  );
                },
                deleteCloudData: async () => {
                  const token = await user.getIdToken(true);
                  const handleResponse = await fetch("/api/profile-handle", {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!handleResponse.ok) throw new Error("delete-handle");
                  const response = await fetch(
                    `${databaseURL}/users/${user.uid}.json?auth=${encodeURIComponent(token)}`,
                    { method: "DELETE" },
                  );
                  if (!response.ok) throw new Error("delete");
                },
                deleteAuthUser: async () => {
                  const deletionToken = await user.getIdToken();
                  await authApi.deleteUser(user);
                  // O acesso já foi excluído; falha de limpeza não pode deixar dados no aparelho.
                  await fetch("/api/olena?action=account-auth&step=cleanup", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${deletionToken}` },
                    signal: AbortSignal.timeout(5000),
                  }).catch(() => {});
                },
                wipeLocal: wipeDevice,
              });
            } catch (cause) {
              saveCloud = resume;
              throw cause;
            }
          };

          setState((current) => ({
            ...current,
            ready: false,
            authenticated: true,
            status: "loading",
            displayName: user.displayName ?? undefined,
            email: user.email ?? undefined,
            signOut,
            deleteAccount,
            passwordAccount: accessProvider === "password",
          }));
          // Outra conta já usou este aparelho: os dados dela não podem ir para a conta nova.
          if (claimDeviceForAccount(localStorage, user.uid))
            setState((current) => ({ ...current, revision: current.revision + 1 }));
          const stateUrl = `${databaseURL}/users/${user.uid}/stateV2`;
          const url = `${stateUrl}.json`;
          const legacyUrl = `${databaseURL}/users/${user.uid}/state.json`;
          const accessToken = async (signal: AbortSignal) => {
            const token = await new Promise<string>((resolve, reject) => {
              const timeout = () => reject(new Error("sync-timeout"));
              signal.addEventListener("abort", timeout, { once: true });
              void user.getIdToken().then(
                (value) => {
                  signal.removeEventListener("abort", timeout);
                  resolve(value);
                },
                (cause: unknown) => {
                  signal.removeEventListener("abort", timeout);
                  reject(cause);
                },
              );
            });
            signal.throwIfAborted();
            if (!currentAccount()) throw new Error("Account changed");
            return token;
          };
          const request = async (method: "GET" | "PUT", body?: CloudState, legacy = false) => {
            const signal = AbortSignal.timeout(12000);
            const token = await accessToken(signal);
            const init: RequestInit = { method, signal };
            if (body) {
              init.body = JSON.stringify({ ...body, items: encodeCloudItems(body.items ?? {}) });
              init.headers = { "Content-Type": "application/json" };
            }
            // print=silent: sem isso o Firebase devolve o estado inteiro na resposta do PUT, que
            // conta como download e ninguém lê.
            const response = await fetch(
              `${legacy ? legacyUrl : url}?auth=${encodeURIComponent(token)}${method === "PUT" ? "&print=silent" : ""}`,
              init,
            );
            if (!response.ok) throw new Error("sync");
            if (method === "PUT") return null;
            const result = (await response.json()) as CloudState | null;
            if (!currentAccount()) throw new Error("Account changed");
            return result?.items ? { ...result, items: decodeCloudItems(result.items) } : result;
          };
          const rest = async (target: string, init: RequestInit, query = "") => {
            const signal = AbortSignal.timeout(12000);
            const token = await accessToken(signal);
            const response = await fetch(`${target}?auth=${encodeURIComponent(token)}${query}`, {
              ...init,
              signal,
            });
            if (!response.ok) throw new Error("sync");
            return response;
          };
          // Lê só o campo `updatedAt` (um número), em vez do estado inteiro. Devolve undefined
          // quando a resposta não é um número válido: quem chama então confere por completo.
          const requestUpdatedAt = async (): Promise<number | undefined> => {
            const value: unknown = await (
              await rest(`${stateUrl}/updatedAt.json`, { method: "GET" })
            ).json();
            if (!currentAccount()) throw new Error("Account changed");
            return typeof value === "number" && Number.isFinite(value) ? value : undefined;
          };
          // Grava só as chaves informadas (PATCH com caminhos), sem reenviar o resto do estado.
          const patchState = (patch: Record<string, string | number | null>) =>
            rest(
              url,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
              },
              "&print=silent",
            );
          // O login com Google (GoogleLogin) grava localmente que o
          // onboarding foi concluido assim que a autenticacao termina, no
          // mesmo instante em que onAuthStateChanged dispara esta funcao.
          // Como o GET abaixo e uma chamada de rede, ele pode demorar mais
          // que essa gravacao local — sem essa checagem, um retorno de
          // nuvem antigo (de uma sessao anterior) sobrescreveria a marca de
          // onboarding concluido que acabou de ser salva, jogando a pessoa
          // de volta pro onboarding mesmo apos o login funcionar.
          const localBeforeGet = readSyncedStorage();
          const modernCloud = await request("GET");
          const cloud = modernCloud ?? (await request("GET", undefined, true));
          let migrationPending = modernCloud === null && cloud !== null;
          let cloudUpdatedAt = Number.isFinite(cloud?.updatedAt) ? cloud!.updatedAt! : 0;
          if (!currentAccount()) return;
          const localAfterGet = readSyncedStorage();

          let lastItems = "";
          if (cloud?.items) {
            const merged = { ...cloud.items };
            const pendingOnboarding = localAfterGet["helena.onboarding.v1"];
            if (readPendingOnboardingConfiguration(pendingOnboarding ?? null, user.uid))
              merged["helena.onboarding.v1"] = pendingOnboarding!;
            // Recorded focus is append-only. A stale account snapshot must not erase
            // sessions completed offline before this page was reloaded.
            const localWorkspace = localAfterGet[WORKSPACE_STORAGE_KEY];
            if (localWorkspace) {
              if (!cloud.items[WORKSPACE_STORAGE_KEY])
                merged[WORKSPACE_STORAGE_KEY] = localWorkspace;
              else {
                const cached = loadWorkspace({ getItem: () => localWorkspace });
                const accountSerialized = cloud.items[WORKSPACE_STORAGE_KEY]!;
                const account = loadWorkspace({
                  getItem: () => accountSerialized,
                });
                const sessions = new Map(
                  account.focusSessions.map((session) => [session.id, session]),
                );
                for (const session of cached.focusSessions)
                  if (!sessions.has(session.id)) sessions.set(session.id, session);
                merged[WORKSPACE_STORAGE_KEY] = serializeWorkspace({
                  ...account,
                  focusSessions: [...sessions.values()],
                });
              }
            }
            if (localAfterGet[SYSTEM_UPDATES_READ_KEY] || cloud.items[SYSTEM_UPDATES_READ_KEY])
              merged[SYSTEM_UPDATES_READ_KEY] = mergeReadUpdates(
                localBeforeGet[SYSTEM_UPDATES_READ_KEY],
                localAfterGet[SYSTEM_UPDATES_READ_KEY],
                cloud.items[SYSTEM_UPDATES_READ_KEY],
              );
            const rewardsKey = "helena.mathPlaceRewards.v1";
            const mergedProfile = mergeProfileProgress(
              cloud.items[ACCOUNT_PROFILE_KEY] ?? localAfterGet[ACCOUNT_PROFILE_KEY],
              localAfterGet[ACCOUNT_PROFILE_KEY],
              localBeforeGet[ACCOUNT_PROFILE_KEY],
              cloud.items[ACCOUNT_PROFILE_KEY],
            );
            if (mergedProfile) merged[ACCOUNT_PROFILE_KEY] = mergedProfile;
            const localRewards = localAfterGet[rewardsKey];
            if (localRewards !== undefined) {
              const rewardsMerge = await mergeItems(
                {},
                { [rewardsKey]: localRewards },
                cloud.items,
              );
              if (!currentAccount()) return;
              if (rewardsMerge.conflicts.length)
                rememberConflict(
                  {},
                  { [rewardsKey]: localRewards },
                  cloud.items,
                  rewardsMerge.conflicts,
                );
              merged[rewardsKey] = rewardsMerge.items[rewardsKey] ?? localRewards;
            }
            // Chave introduzida depois da primeira versão da nuvem: não apague
            // a sequência local antiga antes de enviá-la à conta.
            const streakKey = "noteoli.pomodoro-streak.v1";
            if (localAfterGet[streakKey] || cloud.items[streakKey]) {
              const streakMerge = await mergeItems(
                {},
                { [streakKey]: localAfterGet[streakKey] ?? "[]" },
                { [streakKey]: cloud.items[streakKey] ?? "[]" },
              );
              if (!currentAccount()) return;
              merged[streakKey] = streakMerge.items[streakKey]!;
            }
            if (localAfterGet[FOCUS_SESSION_KEY] || cloud.items[FOCUS_SESSION_KEY]) {
              const activeMerge = await mergeItems(
                {},
                { [FOCUS_SESSION_KEY]: localAfterGet[FOCUS_SESSION_KEY] ?? "null" },
                { [FOCUS_SESSION_KEY]: cloud.items[FOCUS_SESSION_KEY] ?? "null" },
              );
              if (!currentAccount()) return;
              if (activeMerge.items[FOCUS_SESSION_KEY])
                merged[FOCUS_SESSION_KEY] = activeMerge.items[FOCUS_SESSION_KEY];
            }
            for (const key of new Set([
              ...Object.keys(localBeforeGet),
              ...Object.keys(localAfterGet),
            ])) {
              if (
                key === rewardsKey ||
                key === SYSTEM_UPDATES_READ_KEY ||
                key === streakKey ||
                key === FOCUS_SESSION_KEY
              )
                continue;
              if (key === "helena.profile.v1" && cloud.items[key] !== undefined) continue;
              if (localBeforeGet[key] !== localAfterGet[key]) {
                if (key === WORKSPACE_STORAGE_KEY && localAfterGet[key]) {
                  const changed = await mergeItems(
                    { [key]: localBeforeGet[key] ?? "" },
                    { [key]: localAfterGet[key] },
                    cloud.items,
                  );
                  if (!currentAccount()) return;
                  merged[key] = changed.items[key]!;
                  if (changed.conflicts.length)
                    rememberConflict(localBeforeGet, localAfterGet, cloud.items, changed.conflicts);
                  continue;
                }
                if (localAfterGet[key] === undefined) delete merged[key];
                else merged[key] = localAfterGet[key];
              }
            }
            applySyncedStorage(merged);
            const remoteSerialized = JSON.stringify(cloud.items);
            lastItems = remoteSerialized;
            if (JSON.stringify(merged) !== remoteSerialized) {
              dirty = true;
              changeRevision += 1;
            }
          } else {
            dirty = true;
            changeRevision += 1;
          }

          if (migrationPending) {
            dirty = true;
            changeRevision += 1;
          }
          let saving = false;
          // updatedAt que este aparelho está gravando agora: o stream avisa dele logo depois, e
          // isso não é uma mudança de outro aparelho.
          let inflightUpdatedAt: number | undefined;
          const remoteHasNewer = async () => {
            const remote = await requestUpdatedAt();
            return remote === undefined || remote > cloudUpdatedAt;
          };
          saveCloud = async () => {
            if (!currentAccount()) return;
            if (saving) {
              dirty = true;
              return;
            }
            let items = readSyncedStorage();
            let serialized = JSON.stringify(items);
            if (serialized === lastItems && !migrationPending) {
              dirty = false;
              setState((current) => ({
                ...current,
                status: conflictPending ? "conflict" : "synced",
              }));
              return;
            }
            const savingRevision = changeRevision;
            saving = true;
            setState((current) => ({ ...current, status: "syncing" }));
            try {
              // Estado da conta que serve de base para saber o que mudou neste aparelho.
              let baseline = lastItems;
              // Só baixa o estado inteiro quando outro aparelho gravou algo mais novo: a conferência
              // comum custa alguns bytes (o campo updatedAt), não o tamanho do estado.
              if (lastItems && (await remoteHasNewer())) {
                const latest = await request("GET");
                const latestItems = latest?.items;
                const latestSerialized = latestItems ? JSON.stringify(latestItems) : "";
                if (
                  latestItems &&
                  latestSerialized &&
                  latestSerialized !== lastItems &&
                  !(Number.isFinite(latest?.updatedAt) && latest!.updatedAt! < cloudUpdatedAt)
                ) {
                  const merged = await mergeItems(
                    parseItems(lastItems),
                    readSyncedStorage(),
                    latestItems,
                  );
                  if (!currentAccount()) return;
                  if (merged.conflicts.length)
                    rememberConflict(parseItems(lastItems), items, latestItems, merged.conflicts);
                  items = merged.items;
                  serialized = JSON.stringify(items);
                  applySyncedStorage(items);
                  baseline = latestSerialized;
                }
                if (Number.isFinite(latest?.updatedAt))
                  cloudUpdatedAt = Math.max(cloudUpdatedAt, latest!.updatedAt!);
              }
              if (!currentAccount()) return;
              items = readSyncedStorage();
              serialized = JSON.stringify(items);
              const fullUpdatedAt = Math.max(Date.now(), cloudUpdatedAt + 1);
              // Depois da primeira gravação, só as chaves que mudaram vão para a conta. A sessão de
              // Foco muda a cada 30 s e não deve reenviar (nem fazer os outros aparelhos baixarem)
              // o estado inteiro: ela é gravada sozinha e sem mexer em updatedAt.
              const delta =
                baseline && !migrationPending ? itemsDelta(parseItems(baseline), items) : undefined;
              const changedKeys = delta ? Object.keys(delta) : [];
              const sessionOnly =
                changedKeys.length > 0 && changedKeys.every((key) => key === FOCUS_SESSION_KEY);
              const updatedAt = sessionOnly ? cloudUpdatedAt : fullUpdatedAt;
              inflightUpdatedAt = updatedAt;
              try {
                if (!delta) await request("PUT", { version: 2, updatedAt, items });
                else if (changedKeys.length > 0) {
                  const patch: Record<string, string | number | null> = {};
                  for (const key of changedKeys) patch[`items/${cloudWireName(key)}`] = delta[key]!;
                  if (!sessionOnly) patch["updatedAt"] = updatedAt;
                  try {
                    await patchState(patch);
                  } catch (cause) {
                    if (!currentAccount()) throw cause;
                    // Caminho de reserva: se o envio parcial falhar, repete com o estado inteiro.
                    inflightUpdatedAt = fullUpdatedAt;
                    await request("PUT", { version: 2, updatedAt: fullUpdatedAt, items });
                    cloudUpdatedAt = Math.max(cloudUpdatedAt, fullUpdatedAt);
                  }
                }
              } finally {
                inflightUpdatedAt = undefined;
              }
              if (!currentAccount()) return;
              cloudUpdatedAt = Math.max(cloudUpdatedAt, updatedAt);
              lastItems = serialized;
              migrationPending = false;
              if (savingRevision === changeRevision) dirty = false;
              const savedAt = Date.now();
              setState((current) => ({
                ...current,
                status: dirty ? "syncing" : conflictPending ? "conflict" : "synced",
                lastSyncedAt: savedAt,
              }));
              if (dirty) {
                clearTimeout(uploadTimer);
                uploadTimer = setTimeout(() => void saveCloud?.(), CLOUD_UPLOAD_DELAY_MS);
              }
            } catch {
              if (currentAccount()) setState((current) => ({ ...current, status: "offline" }));
            } finally {
              saving = false;
            }
          };

          signOutSync.flush = async () => {
            clearTimeout(uploadTimer);
            const deadline = Date.now() + 12000;
            while (saving) {
              if (Date.now() >= deadline) throw new Error("sync-timeout");
              await new Promise<void>((resolve) => setTimeout(resolve, 50));
            }
            if (!currentAccount()) throw new Error("account-changed");
            await saveCloud?.();
            if (dirty || conflictPending) throw new Error("sync-pending");
          };

          const receiveCloud = async (next: CloudState | null) => {
            if (!currentAccount()) return;
            // A delayed stream/GET from before our acknowledged write is not a deletion.
            if (Number.isFinite(next?.updatedAt) && next!.updatedAt! < cloudUpdatedAt) return;
            const serialized = next?.items ? JSON.stringify(next.items) : undefined;
            const changed = Boolean(serialized && serialized !== lastItems);
            if (changed && next?.items && serialized) {
              const localItems = readSyncedStorage();
              const merged = await mergeItems(parseItems(lastItems), localItems, next.items);
              if (!currentAccount()) return;
              if (Number.isFinite(next.updatedAt) && next.updatedAt! < cloudUpdatedAt) return;
              if (Number.isFinite(next.updatedAt)) cloudUpdatedAt = next.updatedAt!;
              if (JSON.stringify(merged.items) !== serialized) {
                if (merged.conflicts.length)
                  rememberConflict(parseItems(lastItems), localItems, next.items, merged.conflicts);
                lastItems = serialized;
                applySyncedStorage(merged.items);
                dirty = true;
                changeRevision += 1;
                setState((current) => ({ ...current, status: "syncing" }));
                void saveCloud?.();
              } else {
                lastItems = serialized;
                applySyncedStorage(merged.items);
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
              .catch(() => {
                if (currentAccount()) setState((current) => ({ ...current, status: "offline" }));
              });
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
            deleteAccount,
            revision: current.revision + 1,
          }));
          if (dirty) void saveCloud();

          // Conecta direto no Realtime Database do Firebase por Server-Sent Events nativos
          // do navegador, do mesmo jeito que a sala local já fazia (ver startStreaming em
          // use-local-room.ts): mudanças feitas em outro dispositivo chegam aqui na hora,
          // em vez de esperar o próximo ciclo de um polling. A diferença em relação à sala é
          // que este stream exige um token de login na própria URL (a sala lê um caminho
          // público); como o token expira, a conexão precisa ser reaberta com um token novo
          // sempre que ele for renovado (onIdTokenChanged), e também se o próprio Firebase
          // avisar que o token usado na conexão não vale mais (auth_revoked).
          //
          // O stream escuta só o campo updatedAt (um número). Assim reabrir a conexão, e o eco
          // das gravações deste mesmo aparelho, custam alguns bytes e não o estado inteiro. O
          // estado completo só é baixado quando o número é mais novo que o que já temos.
          let fetchingRemote = false;
          let fetchAgain = false;
          const fetchRemote = async () => {
            if (fetchingRemote) {
              fetchAgain = true;
              return;
            }
            fetchingRemote = true;
            try {
              do {
                fetchAgain = false;
                await receiveCloud(await request("GET"));
              } while (fetchAgain && currentAccount());
            } catch {
              if (currentAccount()) setState((current) => ({ ...current, status: "offline" }));
            } finally {
              fetchingRemote = false;
            }
          };
          const receiveRemoteUpdatedAt = (remote: unknown) => {
            if (typeof remote !== "number" || !Number.isFinite(remote)) return;
            if (remote <= cloudUpdatedAt || remote === inflightUpdatedAt) return;
            void fetchRemote();
          };
          function openStream(streamUser: NonNullable<(typeof auth)["currentUser"]>) {
            if (!currentAccount()) return;
            eventSource?.close();
            eventSource = undefined;
            void streamUser.getIdToken().then((token) => {
              if (!currentAccount()) return;
              const source = new EventSource(
                `${stateUrl}/updatedAt.json?auth=${encodeURIComponent(token)}`,
              );
              source.addEventListener("put", (event) => {
                try {
                  const payload = JSON.parse((event as MessageEvent<string>).data) as {
                    path: string;
                    data: unknown;
                  };
                  if (payload.path === "/") receiveRemoteUpdatedAt(payload.data);
                } catch {
                  // Evento malformado: ignora e espera o próximo.
                }
              });
              source.addEventListener("auth_revoked", () => openStream(streamUser));
              source.addEventListener("cancel", () => source.close());
              eventSource = source;
            });
          }
          openStream(user);
          stopIdToken = authApi.onIdTokenChanged(auth, (freshUser) => {
            if (freshUser) openStream(freshUser);
          });
          // O stream só avisa quando algo muda DE VERDADE no lado de fora: uma mudança local
          // que falhou em subir por falta de rede (dirty) não gera nenhum evento novo até a
          // rede voltar, então precisa de um empurrão explícito nesse momento.
          onlineListener = () => {
            if (dirty) void saveCloud?.();
          };
          window.addEventListener("online", onlineListener);
        }
        const synchronize = (user: (typeof auth)["currentUser"]) => {
          const attempt = ++accountRevision;
          void syncUser(user, attempt).catch(() => {
            if (!active || accountRevision !== attempt) return;
            setState((current) => ({
              ...current,
              ready: true,
              authenticated: Boolean(user),
              status: "offline",
            }));
            if (onlineListener) window.removeEventListener("online", onlineListener);
            onlineListener = () => synchronize(auth.currentUser);
            window.addEventListener("online", onlineListener);
          });
        };
        stopAuth = authApi.onAuthStateChanged(auth, synchronize);
      })
      .catch(() => setState((current) => ({ ...current, ready: true, status: "offline" })));

    return () => {
      active = false;
      clearTimeout(uploadTimer);
      eventSource?.close();
      stopIdToken?.();
      if (onlineListener) window.removeEventListener("online", onlineListener);
      stopAuth?.();
      window.removeEventListener(SYNCED_STORAGE_EVENT, scheduleUpload);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushPending);
    };
  }, [enabled]);

  return state;
}
