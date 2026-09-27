import { afterEach, expect, it, vi } from "vitest";
import { confirmNotebookSave } from "./notebook-save-confirmation";
import { createInitialWorkspace, type StudyNote } from "../domain/workspace";
import { saveWorkspace } from "./local-workspace";
import { SYNCED_STORAGE_EVENT } from "./synced-storage";
import type { HandwritingDocument } from "../domain/handwriting";

const document: HandwritingDocument = {
  version: 1,
  paper: "ruled",
  strokes: [
    {
      id: "ink",
      tool: "pen",
      color: "#000000",
      width: 2,
      points: [{ x: 12.123, y: 24.567, pressure: 0.5678, tiltX: 0, tiltY: 12.2 }],
    },
  ],
};
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

it("aguarda a gravação compacta, incluindo normalização da caneta", async () => {
  vi.useFakeTimers();
  const confirmed = vi.fn();
  const pending = confirmNotebookSave("page", document).then(confirmed);
  await vi.advanceTimersByTimeAsync(0);
  expect(confirmed).not.toHaveBeenCalled();
  const workspace = createInitialWorkspace();
  workspace.notes.push({
    id: "page",
    title: "Página",
    content: "",
    subjectId: "",
    updatedAt: "2026-09-27",
    assets: [
      {
        id: "asset",
        kind: "drawing",
        name: "Folha",
        createdAt: "2026-09-27",
        dataUrl: "data:image/png;base64,YQ==",
        handwriting: document,
      },
    ],
  } satisfies StudyNote);
  saveWorkspace(localStorage, workspace);
  window.dispatchEvent(new Event(SYNCED_STORAGE_EVENT));
  await pending;
  expect(confirmed).toHaveBeenCalledOnce();
});

it("não confirma uma folha ausente ou cuja gravação falhou", async () => {
  vi.useFakeTimers();
  const pending = expect(confirmNotebookSave("missing", document)).rejects.toThrow(
    "Não foi possível confirmar",
  );
  await vi.advanceTimersByTimeAsync(2000);
  await pending;
});
