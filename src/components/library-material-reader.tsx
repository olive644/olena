import { lazy, Suspense, useCallback, useEffect, useRef, useState, type Dispatch } from "react";
import { uiText } from "../i18n/runtime";
import {
  createWorkspaceId,
  type StudyMaterial,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import { safeMaterialUrl } from "../domain/library";
import { LibraryDialog } from "./library-dialog";
import { HelenaLoading } from "./helena-loading";
import { PaperChoice } from "./agenda-paper-fields";
import { PaperEditorIcon } from "./paper-editor-icon";

const PdfReader = lazy(() => import("./library-pdf-reader"));
const NotebookSpread = lazy(() =>
  import("./notebook-spread").then((module) => ({ default: module.NotebookSpread })),
);
export default function MaterialReader({
  material,
  workspace,
  dispatch,
  scope,
  onClose,
  onFocus,
  onNotebook,
  onFlashcard,
}: {
  material: StudyMaterial;
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  scope: string;
  onClose: () => void;
  onFocus?: ((id: string) => void) | undefined;
  onNotebook?: ((id: string, page?: string) => void) | undefined;
  onFlashcard: (text: string, page: number) => void;
}) {
  const [excerpt, setExcerpt] = useState("");
  const [page, setPage] = useState(material.page ?? 1);
  const [note, setNote] = useState("");
  const [notebookId, setNotebookId] = useState("");
  const [message, setMessage] = useState("");
  const reader = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [initialScroll] = useState(material.scroll ?? 0);
  const scrollReady = useRef(material.kind !== "pdf");
  const restorePdfScroll = useCallback(() => {
    if (!scrollReady.current && reader.current) {
      scrollReady.current = true;
      reader.current.scrollTop = initialScroll;
    }
  }, [initialScroll]);
  const update = (changes: Partial<StudyMaterial>) =>
    dispatch({ type: "material/updated", id: material.id, changes });
  const notebooks = workspace.notebooks.filter(
    (item) => !["folder", "collection"].includes(item.kind ?? ""),
  );
  const notebook = notebooks.find((item) => item.id === notebookId);
  useEffect(() => {
    dispatch({
      type: "material/updated",
      id: material.id,
      changes: { openedAt: new Date().toISOString() },
    });
  }, [dispatch, material.id]);
  useEffect(() => {
    if (reader.current) reader.current.scrollTop = initialScroll;
    return () => clearTimeout(scrollTimer.current);
  }, [initialScroll]);
  function flushScroll() {
    clearTimeout(scrollTimer.current);
    if (!scrollReady.current) return;
    if (reader.current && Math.round(reader.current.scrollTop) !== material.scroll)
      update({ scroll: Math.round(reader.current.scrollTop) });
  }
  function sendExcerpt() {
    if (!notebook || !excerpt.trim()) return;
    const id = createWorkspaceId("note");
    const at = new Date().toISOString();
    dispatch({
      type: "note/added",
      id,
      notebookId: notebook.id,
      subjectId: material.subjectId,
      updatedAt: at,
      append: true,
    });
    dispatch({
      type: "note/updated",
      id,
      title: material.title,
      content: `${excerpt}\n\n${uiText("Fonte")}: ${material.title} (${uiText("Página")} ${page})\n${window.location.origin}/biblioteca?material=${encodeURIComponent(material.id)}`,
      updatedAt: at,
    });
    setMessage(uiText("Trecho enviado ao caderno."));
  }
  return (
    <LibraryDialog
      title={material.title}
      onClose={() => {
        flushScroll();
        onClose();
      }}
    >
      <div className={`library-study-layout ${notebook ? "with-notebook" : ""}`}>
        <div
          className="library-reader"
          ref={reader}
          onScroll={() => {
            clearTimeout(scrollTimer.current);
            scrollTimer.current = setTimeout(flushScroll, 400);
          }}
        >
          <div className="library-tools">
            {onFocus && (
              <button
                className="secondary-button"
                onClick={() => {
                  flushScroll();
                  onFocus(material.id);
                }}
              >
                <PaperEditorIcon name="review" />
                {uiText("Estudar com Pomodoro")}
              </button>
            )}
          </div>
          {material.kind === "pdf" ? (
            <Suspense fallback={<HelenaLoading compact label={uiText("Abrindo PDF")} />}>
              <PdfReader
                onReady={restorePdfScroll}
                material={material}
                scope={scope}
                onChange={update}
                onExcerpt={(text, sourcePage) => {
                  setExcerpt(text);
                  setPage(sourcePage);
                }}
              />
            </Suspense>
          ) : material.kind === "link" ? (
            <div className="library-readable">
              <p>{uiText("Abra o site em outra aba e mantenha suas anotações aqui.")}</p>
              {safeMaterialUrl(material.content) ? (
                <a
                  href={safeMaterialUrl(material.content)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {material.content}
                </a>
              ) : (
                <p role="alert">{uiText("Link inválido")}</p>
              )}
            </div>
          ) : (
            <div
              className="library-readable"
              onMouseUp={(event) => {
                const selection = window.getSelection();
                if (
                  selection?.toString().trim() &&
                  selection.anchorNode &&
                  event.currentTarget.contains(selection.anchorNode) &&
                  selection.focusNode &&
                  event.currentTarget.contains(selection.focusNode)
                ) {
                  setExcerpt(selection.toString().slice(0, 10000));
                  setPage(1);
                }
              }}
            >
              {material.content}
            </div>
          )}
          <section className="library-excerpts">
            <h3>{uiText("Trechos e anotações")}</h3>
            <label className="field">
              <span>{uiText("Trecho selecionado ou digitado")}</span>
              <textarea
                rows={3}
                maxLength={10000}
                value={excerpt}
                onChange={(event) => {
                  setExcerpt(event.target.value);
                  setPage(material.page ?? 1);
                }}
              />
            </label>
            <label className="field">
              <span>{uiText("Sua anotação")}</span>
              <textarea
                maxLength={10000}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setPage(material.page ?? 1);
                }}
              />
            </label>
            <div className="library-tools">
              <button
                className="secondary-button"
                disabled={!excerpt.trim() && !note.trim()}
                onClick={() => {
                  update({
                    annotations: [
                      ...(material.annotations ?? []),
                      {
                        id: createWorkspaceId("annotation"),
                        page,
                        quote: excerpt.trim(),
                        note: note.trim(),
                      },
                    ],
                  });
                  setNote("");
                  setExcerpt("");
                  setMessage(uiText("Anotação salva."));
                }}
              >
                <PaperEditorIcon name="highlighter" />
                {uiText("Salvar anotação")}
              </button>
              <button
                className="secondary-button"
                disabled={!excerpt.trim()}
                onClick={() => onFlashcard(excerpt, page)}
              >
                {uiText("Criar flashcard do trecho")}
              </button>
            </div>
            {message && <p role="status">{message}</p>}
            {material.annotations?.map((item) => (
              <blockquote key={item.id}>
                <mark>{item.quote}</mark>
                <p>{item.note}</p>
                <div className="library-tools">
                  <button
                    className="text-button"
                    onClick={() => {
                      setExcerpt(item.quote);
                      setPage(item.page);
                      update({ page: item.page });
                    }}
                  >
                    {uiText("Página")} {item.page}
                  </button>
                  <button
                    className="library-icon"
                    aria-label={uiText("Excluir anotação")}
                    onClick={() =>
                      update({
                        annotations: (material.annotations ?? []).filter(
                          (entry) => entry.id !== item.id,
                        ),
                      })
                    }
                  >
                    <PaperEditorIcon name="trash" />
                  </button>
                </div>
              </blockquote>
            ))}
          </section>
          <PaperChoice
            label={uiText("Estudar com um caderno")}
            value={notebookId}
            onChange={setNotebookId}
            options={[
              { value: "", label: uiText("Escolher caderno") },
              ...notebooks.map((item) => ({ value: item.id, label: item.title })),
            ]}
          />
          <button
            className="secondary-button"
            disabled={!notebook || !excerpt.trim()}
            onClick={sendExcerpt}
          >
            {uiText("Enviar trecho ao caderno")}
          </button>
          {!notebooks.length && (
            <p>{uiText("Crie um caderno na aba Cadernos para guardar seus trechos.")}</p>
          )}
        </div>
        {notebook && (
          <aside className="library-notebook">
            <h3>{notebook.title}</h3>
            <Suspense fallback={<HelenaLoading compact label={uiText("Abrindo caderno")} />}>
              <NotebookSpread
                key={notebook.id}
                notebook={notebook}
                pages={notebook.pageIds.flatMap(
                  (id) => workspace.notes.find((item) => item.id === id) ?? [],
                )}
                subjects={workspace.subjects}
                dispatch={dispatch}
                readOnly
                compactPreview
                onOpen={(id) => onNotebook?.(notebook.id, id)}
                onCreate={() => {}}
                onRemove={() => {}}
              />
            </Suspense>
            <button className="secondary-button" onClick={() => onNotebook?.(notebook.id)}>
              {uiText("Abrir caderno")}
            </button>
          </aside>
        )}
      </div>
    </LibraryDialog>
  );
}
