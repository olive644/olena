import { loadWorkspace } from "./local-workspace";
import { SYNCED_STORAGE_EVENT } from "./synced-storage";
import type { HandwritingDocument } from "../domain/handwriting";
import { packDocument, unpackDocument } from "./handwriting-pack";

const persistedDocument = (document: HandwritingDocument | undefined) =>
  JSON.stringify(unpackDocument(packDocument(document)));

/** Confirm the persisted document, not just the React dispatch. No cloud claim. */
export function confirmNotebookSave(pageId: string, document: HandwritingDocument): Promise<void> {
  const expected = persistedDocument(document);
  return new Promise((resolve, reject) => {
    const matches = () => {
      try {
        return (
          loadWorkspace(window.localStorage)
            .notes.find((page) => page.id === pageId)
            ?.assets.some((asset) => persistedDocument(asset.handwriting) === expected) ?? false
        );
      } catch {
        return false;
      }
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.clearTimeout(initialCheck);
      window.removeEventListener(SYNCED_STORAGE_EVENT, check);
    };
    const check = () => {
      if (!matches()) return;
      cleanup();
      resolve();
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      if (matches()) resolve();
      else
        reject(
          new Error(
            "Não foi possível confirmar o salvamento neste dispositivo. Tente novamente ou baixe uma cópia.",
          ),
        );
    }, 2000);
    const initialCheck = window.setTimeout(check, 0);
    window.addEventListener(SYNCED_STORAGE_EVENT, check);
  });
}
