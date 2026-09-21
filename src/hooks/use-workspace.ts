import { useEffect, useReducer, useRef } from "react";
import { loadWorkspace, saveWorkspace } from "../data/local-workspace";
import { SYNCED_STORAGE_APPLIED_EVENT, SYNCED_STORAGE_EVENT } from "../data/synced-storage";
import { workspaceReducer } from "../domain/workspace";

export function useWorkspace() {
  const remoteUpdate = useRef(false);
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, () =>
    loadWorkspace(window.localStorage),
  );

  useEffect(() => {
    if (remoteUpdate.current) {
      remoteUpdate.current = false;
      return;
    }
    saveWorkspace(window.localStorage, workspace);
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

  return { workspace, dispatch };
}
