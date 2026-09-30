import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { WORKSPACE_STORAGE_KEY, loadWorkspace, serializeWorkspace } from "../data/local-workspace";
import { SYNCED_STORAGE_APPLIED_EVENT, SYNCED_STORAGE_EVENT } from "../data/synced-storage";
import {
  openIndexedWorkspaceStore,
  type WorkspaceKeyValueStore,
} from "../data/indexed-workspace-store";
import { workspaceReducer } from "../domain/workspace";
import {
  WORKSPACE_HISTORY_KEY,
  loadWorkspaceHistory,
  recordWorkspaceSnapshot,
  type WorkspaceHistoryEntry,
} from "../data/workspace-history";

// Aviso de armazenamento cheio como um pequeno estado externo: quem grava (dentro de um efeito) só
// atualiza o valor, e a tela lê pelo useSyncExternalStore, sem setState dentro do efeito.
const storageFullStore = {
  value: false,
  listeners: new Set<() => void>(),
  set(next: boolean) {
    if (this.value === next) return;
    this.value = next;
    for (const listener of this.listeners) listener();
  },
  subscribe(listener: () => void) {
    storageFullStore.listeners.add(listener);
    return () => storageFullStore.listeners.delete(listener);
  },
  snapshot: () => storageFullStore.value,
};

export function useWorkspace() {
  const remoteUpdate = useRef(false);
  // Armazenamento em IndexedDB (etapa 2 da migração, ver docs/CURRENT_STATE_AUDIT.md): é quem
  // garante o salvamento de verdade agora, com bem mais espaço que os cerca de 5 MB por site
  // do localStorage. Nulo quando o navegador não tem IndexedDB disponível (por exemplo,
  // alguns modos de navegação privada); nesse caso o localStorage volta a ser a única gravação,
  // como antes da etapa 1.
  const indexedStoreRef = useRef<WorkspaceKeyValueStore | null | undefined>(undefined);
  if (indexedStoreRef.current === undefined) indexedStoreRef.current = openIndexedWorkspaceStore();
  // Só aparece quando nem o IndexedDB nem o localStorage (seu substituto quando ele não existe)
  // conseguem gravar.
  const storageFull = useSyncExternalStore(
    storageFullStore.subscribe,
    storageFullStore.snapshot,
    () => false,
  );
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, () =>
    loadWorkspace(window.localStorage),
  );

  // Ao abrir, o espaço já apareceu na tela vindo do localStorage (síncrono, sem atraso), que
  // aqui serve só de leitura rápida inicial. Se o IndexedDB (a gravação de verdade) tiver algo,
  // ele substitui em seguida: como os dois são sempre gravados juntos, o conteúdo já devia ser
  // o mesmo, então isso não muda o que a pessoa vê na prática.
  // Precisa rodar antes do efeito de gravação abaixo: senão, a gravação do mount dispara
  // primeiro e sobrescreve no IndexedDB o que já estava lá antes de dar tempo de lê-lo.
  useEffect(() => {
    let cancelled = false;
    indexedStoreRef.current
      ?.get()
      .then((serialized) => {
        if (cancelled || serialized === undefined) return;
        remoteUpdate.current = true;
        dispatch({
          type: "workspace/replaced",
          workspace: loadWorkspace({ getItem: () => serialized }),
        });
      })
      .catch(() => {
        // Espelho best-effort: uma falha aqui só significa que o app segue com o localStorage.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (remoteUpdate.current) {
      remoteUpdate.current = false;
      return;
    }
    const serialized = serializeWorkspace(workspace);
    // O localStorage continua recebendo o mesmo conteúdo, para a leitura inicial da próxima
    // abertura continuar instantânea. Como o IndexedDB agora é quem garante o salvamento de
    // verdade, uma falha aqui (armazenamento cheio) não impede mais o app de seguir: ela só é
    // reportada à pessoa se o IndexedDB também falhar (ou não existir) logo abaixo.
    let localStorageOk = true;
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, serialized);
    } catch {
      // O histórico de versões é só uma conveniência e costuma ser o que enche o espaço: ele
      // cede lugar ao espaço de estudos antes de desistir.
      try {
        window.localStorage.removeItem(WORKSPACE_HISTORY_KEY);
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, serialized);
      } catch {
        localStorageOk = false;
      }
    }
    if (localStorageOk) {
      recordWorkspaceSnapshot(window.localStorage, workspace);
      window.dispatchEvent(new Event(SYNCED_STORAGE_EVENT));
    }
    const indexedStore = indexedStoreRef.current;
    if (!indexedStore) {
      // Sem IndexedDB disponível: o localStorage volta a ser a única gravação de verdade,
      // como antes da etapa 1 da migração.
      storageFullStore.set(!localStorageOk);
      return;
    }
    indexedStore
      .set(serialized)
      .then(() => storageFullStore.set(false))
      .catch(() => storageFullStore.set(!localStorageOk));
  }, [workspace]);

  useEffect(() => {
    const refresh = () => {
      remoteUpdate.current = true;
      dispatch({ type: "workspace/replaced", workspace: loadWorkspace(window.localStorage) });
    };
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    return () => window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
  }, []);

  function restoreSnapshot(entry: WorkspaceHistoryEntry) {
    remoteUpdate.current = false;
    dispatch({ type: "workspace/replaced", workspace: entry.workspace });
  }

  return {
    workspace,
    storageFull,
    dispatch,
    history: loadWorkspaceHistory(window.localStorage),
    restoreSnapshot,
  };
}
