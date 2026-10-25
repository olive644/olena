import { useState, type Dispatch } from "react";
import { uiText } from "../i18n/runtime";
import type { StudyNote, WorkspaceAction, WorkspaceState } from "../domain/workspace";
import { toDateKey } from "../domain/workspace";
import { PaperChoice } from "./agenda-paper-fields";
import { PaperEditorIcon } from "./paper-editor-icon";
import { LibraryDialog } from "./library-dialog";
import "./library-links.css";

export function LibraryLinks({
  workspace,
  dispatch,
  kind,
  item,
}: {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  kind: "note" | "task" | "event";
  item: { id: string; materialIds?: string[] };
}) {
  const [selecting, setSelecting] = useState(false);
  return (
    <div className="library-linked-materials">
      <button type="button" className="text-button" onClick={() => setSelecting(!selecting)}>
        <PaperEditorIcon name="add" />
        {uiText("Vincular material")}
      </button>
      {selecting && (
        <PaperChoice
          label={uiText("Material da Biblioteca")}
          value=""
          onChange={(materialId) => {
            if (materialId) dispatch({ type: "library/linked", id: item.id, kind, materialId });
            setSelecting(false);
          }}
          options={[
            { value: "", label: uiText("Escolher material") },
            ...workspace.materials
              .filter((material) => !material.archived && !item.materialIds?.includes(material.id))
              .map((material) => ({ value: material.id, label: material.title })),
          ]}
        />
      )}
      {workspace.materials
        .filter((material) => item.materialIds?.includes(material.id))
        .map((material) => (
          <div key={material.id} className="library-tools">
            <a href={`/biblioteca?material=${encodeURIComponent(material.id)}`}>{material.title}</a>
            <button
              type="button"
              className="library-icon"
              aria-label={uiText("Desvincular material")}
              onClick={() =>
                dispatch({
                  type: "library/linked",
                  kind,
                  id: item.id,
                  materialId: material.id,
                  remove: true,
                })
              }
            >
              <PaperEditorIcon name="trash" />
            </button>
          </div>
        ))}
    </div>
  );
}

export function NoteFlashcardTools({
  note,
  workspace,
  dispatch,
}: {
  note: StudyNote;
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
}) {
  const [open, setOpen] = useState(false),
    [front, setFront] = useState(""),
    [back, setBack] = useState(""),
    [deck, setDeck] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="library-note-tools">
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          const selected = window.getSelection();
          const active = document.querySelector<HTMLTextAreaElement>(
            ".text-note-workspace textarea, .note-editor textarea",
          );
          const text =
            active instanceof HTMLTextAreaElement
              ? active.value.slice(active.selectionStart, active.selectionEnd)
              : selected?.toString();
          setFront((text || note.content || note.title).slice(0, 10000));
          setBack("");
          setSaved(false);
          setOpen(true);
        }}
      >
        <PaperEditorIcon name="review" />
        {uiText("Criar flashcard do trecho")}
      </button>
      {saved && <p role="status">{uiText("Flashcard criado.")}</p>}
      <LibraryLinks workspace={workspace} dispatch={dispatch} kind="note" item={note} />
      {open && (
        <LibraryDialog title={uiText("Criar flashcard do trecho")} onClose={() => setOpen(false)}>
          <form
            className="compact-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!front.trim() || !back.trim()) return;
              dispatch({
                type: "flashcard/added",
                front: front.trim(),
                back: back.trim(),
                deck: deck.trim(),
                noteId: note.id,
                subjectId: note.subjectId,
                createdOn: toDateKey(new Date()),
              });
              setSaved(true);
              setOpen(false);
            }}
          >
            <p>
              {uiText("Fonte")}: {note.title}
            </p>
            <label className="field">
              <span>{uiText("Frente")}</span>
              <textarea
                required
                maxLength={10000}
                value={front}
                onChange={(event) => setFront(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{uiText("Verso")}</span>
              <textarea
                required
                maxLength={10000}
                value={back}
                onChange={(event) => setBack(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{uiText("Baralho")}</span>
              <input
                maxLength={160}
                value={deck}
                onChange={(event) => setDeck(event.target.value)}
              />
            </label>
            <button type="submit" className="primary-button">
              {uiText("Criar flashcard")}
            </button>
          </form>
        </LibraryDialog>
      )}
    </div>
  );
}
