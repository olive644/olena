import type { Dispatch } from "react";
import { NotebookSpread } from "./notebook-spread";
import { readStudentResume } from "../data/student-resume";
import type { StudyNotebook, WorkspaceAction, WorkspaceState } from "../domain/workspace";
export default function StudentNotebookPreview({
  notebook,
  workspace,
  dispatch,
  onOpen,
}: {
  notebook: StudyNotebook;
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  onOpen(page?: string): void;
}) {
  const pages = notebook.pageIds.flatMap((id) => {
    const note = workspace.notes.find((item) => item.id === id);
    return note ? [note] : [];
  });
  return (
    <NotebookSpread
      readOnly
      initialPageId={readStudentResume().notebook?.page}
      notebook={notebook}
      pages={pages}
      subjects={workspace.subjects}
      dispatch={dispatch}
      onOpen={onOpen}
      onCreate={() => onOpen()}
      onRemove={() => {}}
    />
  );
}
