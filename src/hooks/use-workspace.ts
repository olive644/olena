import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { WORKSPACE_STORAGE_KEY, loadWorkspace, saveWorkspace } from "../data/local-workspace";
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
  // Espelho em IndexedDB (etapa 1 da migração: só grava e prefere ler dali quando existe;
  // o localStorage segue sendo a gravação de verdade). Nulo quando o navegador não tem
  // IndexedDB disponível (por exemplo, alguns modos de navegação privada).
  const indexedStoreRef = useRef<WorkspaceKeyValueStore | null | undefined>(undefined);
  if (indexedStoreRef.current === undefined) indexedStoreRef.current = openIndexedWorkspaceStore();
  // O navegador dá cerca de 5 MB por site. Cheio, gravar falha; isso não pode derrubar o app.
  const storageFull = useSyncExternalStore(
    storageFullStore.subscribe,
    storageFullStore.snapshot,
    () => false,
  );
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, () =>
    loadWorkspace(window.localStorage),
  );

  // Ao abrir, o espaço já apareceu na tela vindo do localStorage (síncrono, sem atraso). Se o
  // espelho em IndexedDB tiver algo, ele substitui em seguida: como os dois são sempre gravados
  // juntos, o conteúdo já devia ser o mesmo, então isso não muda o que a pessoa vê na prática.
  // Precisa rodar antes do efeito de gravação abaixo: senão, a gravação do mount dispara
  // primeiro e sobrescreve no espelho o que já estava lá antes de dar tempo de lê-lo.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Espelha o mesmo texto já serializado (sem recalcular): grava em segundo plano, sem
    // poder atrapalhar o salvamento de verdade acima, que já terminou.
    const serialized = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (serialized) void indexedStoreRef.current?.set(serialized);
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
