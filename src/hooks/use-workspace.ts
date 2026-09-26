import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { loadWorkspace, saveWorkspace } from "../data/local-workspace";
import { SYNCED_STORAGE_APPLIED_EVENT, SYNCED_STORAGE_EVENT } from "../data/synced-storage";
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
  // O navegador dá cerca de 5 MB por site. Cheio, gravar falha; isso não pode derrubar o app.
  const storageFull = useSyncExternalStore(
    storageFullStore.subscribe,
    storageFullStore.snapshot,
    () => false,
  );
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, () =>
    loadWorkspace(window.localStorage),
  );

  useEffect(() => {
    if (remoteUpdate.current) {
      remoteUpdate.current = false;
      return;
    }
    try {
      saveWorkspace(window.localStorage, workspace);
    } catch {
      // O histórico de versões é só uma conveniência e costuma ser o que enche o espaço: ele
      // cede lugar ao espaço de estudos. Só se ainda assim não couber o aviso aparece.
      try {
        window.localStorage.removeItem(WORKSPACE_HISTORY_KEY);
        saveWorkspace(window.localStorage, workspace);
      } catch {
        storageFullStore.set(true);
        return;
      }
    }
    storageFullStore.set(false);
    recordWorkspaceSnapshot(window.localStorage, workspace);
    window.dispatchEvent(new Event(SYNCED_STORAGE_EVENT));
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
