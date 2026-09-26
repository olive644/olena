import { useRef, useState, type CSSProperties, type Dispatch } from "react";
import {
  createWorkspaceId,
  type StudyNote,
  type StudyNotebook,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import { PaperActionIcon } from "./paper-action-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import "./notebook-spread.css";

type Props = {
  notebook: StudyNotebook;
  pages: StudyNote[];
  subjects: WorkspaceState["subjects"];
  dispatch: Dispatch<WorkspaceAction>;
  onOpen: (id: string) => void;
  onCreate: (subjectId: string) => void;
  onRemove: (id: string) => void;
};

export function NotebookSpread({
  notebook,
  pages,
  subjects,
  dispatch,
  onOpen,
  onCreate,
  onRemove,
}: Props) {
  const [subjectId, setSubjectId] = useState("all");
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [organizing, setOrganizing] = useState(false);
  const [name, setName] = useState("");
  const [showCover, setShowCover] = useState(false);
  const [direction, setDirection] = useState(1);
  const draggedDivider = useRef<string | null>(null);
  const touchedDivider = useRef<{ id: string; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClick = useRef(false);
  const filtered =
    subjectId === "all" ? pages : pages.filter((page) => page.subjectId === subjectId);
  const lastSpread = Math.max(0, Math.ceil(filtered.length / 2) - 1);
  const current = Math.min(spreadIndex, lastSpread);
  const visible = filtered.slice(current * 2, current * 2 + 2);
  const linked = new Set([...(notebook.subjectIds ?? []), ...pages.map((page) => page.subjectId)]);
  const divisions = [...(notebook.subjectIds ?? []), ...pages.map((page) => page.subjectId)]
    .filter((id, index, ids) => id && ids.indexOf(id) === index)
    .map((id) => subjects.find((subject) => subject.id === id))
    .filter((subject): subject is WorkspaceState["subjects"][number] => Boolean(subject));
  const bookmarks = pages.filter((page) => notebook.bookmarkedPageIds?.includes(page.id));
  function reorder(id: string, targetId: string) {
    if (id === targetId) return;
    const ids = divisions.map((division) => division.id);
    const source = ids.indexOf(id);
    const target = ids.indexOf(targetId);
    if (source < 0 || target < 0) return;
    ids.splice(source, 1);
    ids.splice(target, 0, id);
    dispatch({ type: "notebook/organized", id: notebook.id, changes: { subjectIds: ids } });
  }
  function chooseSubject(id: string) {
    setSubjectId(id);
    setSpreadIndex(0);
    setShowCover(false);
  }
  function turn(delta: number) {
    setDirection(delta);
    setSpreadIndex(Math.max(0, Math.min(lastSpread, current + delta)));
  }
  function link(id: string) {
    dispatch({ type: "notebook/subject-linked", id: notebook.id, subjectId: id });
    chooseSubject(id);
  }
  function create() {
    onCreate(subjectId === "all" ? notebook.subjectId : subjectId);
  }
  return (
    <div className="notebook-spread-workspace">
      <div className="notebook-spread-options">
        <button
          type="button"
          className="secondary-button"
          aria-pressed={showCover}
          onClick={() => setShowCover(!showCover)}
        >
          {showCover ? "Ver folhas" : "Ver capa"}
        </button>
        <button
          type="button"
          className="secondary-button"
          aria-expanded={organizing}
          onClick={() => setOrganizing(!organizing)}
        >
          <span className="notebook-divider-icon" aria-hidden="true" />
          Divisórias
        </button>
      </div>
      {organizing && (
        <section
          className="notebook-subject-manager"
          aria-label="Organizar divisórias"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOrganizing(false);
          }}
        >
          <button
            type="button"
            className="secondary-button notebook-subject-close"
            onClick={() => setOrganizing(false)}
          >
            Fechar divisórias
          </button>
          <h2>Divisórias do caderno</h2>
          <p>Crie divisórias, arraste para ordenar e marque folhas importantes no livro.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              const id = createWorkspaceId("subject");
              dispatch({
                type: "subject/added",
                id,
                name: name.trim(),
                color: ["#7C3AED", "#287D69", "#AC365E", "#866600"][divisions.length % 4]!,
              });
              link(id);
              setName("");
            }}
          >
            <label>
              Nova divisória
              <input
                value={name}
                maxLength={50}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Matemática"
              />
            </label>
            <button className="secondary-button" disabled={!name.trim()} type="submit">
              Adicionar divisória
            </button>
          </form>
          <label>
            Usar divisória existente
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) link(event.target.value);
              }}
            >
              <option value="">Escolher divisória</option>
              {subjects
                .filter((subject) => !linked.has(subject.id))
                .map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
            </select>
          </label>
          <fieldset className="notebook-divider-position">
            <legend>Onde ficam as fitas?</legend>
            <label>
              <input
                type="radio"
                name="divider-position"
                checked={notebook.dividerPosition !== "bottom"}
                onChange={() =>
                  dispatch({
                    type: "notebook/organized",
                    id: notebook.id,
                    changes: { dividerPosition: "side" },
                  })
                }
              />{" "}
              Na lateral
            </label>
            <label>
              <input
                type="radio"
                name="divider-position"
                checked={notebook.dividerPosition === "bottom"}
                onChange={() =>
                  dispatch({
                    type: "notebook/organized",
                    id: notebook.id,
                    changes: { dividerPosition: "bottom" },
                  })
                }
              />{" "}
              Embaixo
            </label>
          </fieldset>
          <div className="notebook-divider-order" aria-label="Ordenar divisórias">
            {divisions.map((division, index) => (
              <div
                key={division.id}
                className="notebook-divider-row"
                data-divider-id={division.id}
                draggable
                onPointerDown={(event) => {
                  if (
                    event.pointerType === "touch" &&
                    !(event.target as HTMLElement).closest("button")
                  )
                    touchedDivider.current = { id: division.id, y: event.clientY };
                }}
                onPointerUp={(event) => {
                  const start = touchedDivider.current;
                  touchedDivider.current = null;
                  if (!start || Math.abs(event.clientY - start.y) < 20) return;
                  const target = document
                    .elementFromPoint(event.clientX, event.clientY)
                    ?.closest<HTMLElement>("[data-divider-id]");
                  if (target?.dataset["dividerId"]) reorder(start.id, target.dataset["dividerId"]);
                }}
                onPointerCancel={() => {
                  touchedDivider.current = null;
                }}
                onDragStart={(event) => {
                  draggedDivider.current = division.id;
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggedDivider.current) reorder(draggedDivider.current, division.id);
                  draggedDivider.current = null;
                }}
                onDragEnd={() => {
                  draggedDivider.current = null;
                }}
              >
                <span className="notebook-divider-swatch" style={{ background: division.color }} />
                <strong>{division.name}</strong>
                <span aria-hidden="true">⋮⋮</span>
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={`Mover ${division.name} para cima`}
                  onClick={() => reorder(division.id, divisions[index - 1]!.id)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === divisions.length - 1}
                  aria-label={`Mover ${division.name} para baixo`}
                  onClick={() => reorder(division.id, divisions[index + 1]!.id)}
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
          <details className="notebook-subject-pages">
            <summary>Associar folhas às divisórias</summary>
            {pages.map((page, index) => (
              <label key={page.id}>
                Folha {index + 1}: {page.title}
                <select
                  aria-label={`Divisória da folha ${index + 1}`}
                  value={page.subjectId}
                  onChange={(event) => {
                    dispatch({
                      type: "note/subject-changed",
                      id: page.id,
                      subjectId: event.target.value,
                      updatedAt: new Date().toISOString(),
                    });
                    setSpreadIndex(0);
                  }}
                >
                  <option value="">Sem divisória</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </details>
        </section>
      )}
      {showCover ? (
        <div className="notebook-concept-cover">
          <img
            src="/notebook-covers/helena-estrelas.webp"
            alt="Helena alcançando uma estrela em uma capa de papel recortado"
          />
          <h2>{notebook.title}</h2>
        </div>
      ) : (
        <div className="notebook-spread-shell">
          <div
            className="notebook-paper-spread"
            tabIndex={0}
            aria-label="Prévia folheável do caderno"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                turn(event.key === "ArrowLeft" ? -1 : 1);
              }
            }}
            onPointerDown={(event) => {
              if (
                event.button !== 0 ||
                (event.target as HTMLElement).closest(
                  ".notebook-sheet-remove, .notebook-sheet-create",
                )
              )
                return;
              suppressClick.current = false;
              drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
            }}
            onPointerMove={(event) => {
              const start = drag.current;
              if (
                start &&
                start.id === event.pointerId &&
                Math.abs(event.clientX - start.x) > 12 &&
                Math.abs(event.clientX - start.x) > Math.abs(event.clientY - start.y) * 1.25
              )
                event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onPointerUp={(event) => {
              const start = drag.current;
              drag.current = null;
              if (!start || start.id !== event.pointerId) return;
              const dx = event.clientX - start.x;
              if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.25) {
                suppressClick.current = true;
                turn(dx < 0 ? 1 : -1);
              }
            }}
            onClickCapture={(event) => {
              if (suppressClick.current) {
                event.stopPropagation();
                event.preventDefault();
                suppressClick.current = false;
              }
            }}
          >
            <div
              className={`notebook-spread-pair ${direction < 0 ? "is-backward" : ""}`}
              key={`${subjectId}-${current}`}
            >
              {[0, 1].map((side) => {
                const page = visible[side];
                return (
                  <article className="notebook-sheet" key={side}>
                    {page ? (
                      <>
                        <button
                          className="notebook-sheet-open"
                          type="button"
                          onClick={() => onOpen(page.id)}
                          aria-label={`Abrir preview de ${page.title}, folha ${pages.indexOf(page) + 1}`}
                        >
                          {page.assets[0] ? (
                            <img draggable={false} src={page.assets[0].dataUrl} alt="" />
                          ) : (
                            <div className="notebook-empty-paper">
                              {page.content && <p>{page.content}</p>}
                            </div>
                          )}
                          <strong>{page.title}</strong>
                        </button>
                        <footer>
                          <span>{pages.indexOf(page) + 1}</span>
                          <button
                            type="button"
                            className="notebook-sheet-bookmark"
                            aria-label={`${notebook.bookmarkedPageIds?.includes(page.id) ? "Desmarcar" : "Marcar"} folha ${pages.indexOf(page) + 1} como importante`}
                            aria-pressed={Boolean(notebook.bookmarkedPageIds?.includes(page.id))}
                            onClick={() =>
                              dispatch({
                                type: "notebook/organized",
                                id: notebook.id,
                                changes: {
                                  bookmarkedPageIds: notebook.bookmarkedPageIds?.includes(page.id)
                                    ? notebook.bookmarkedPageIds.filter((id) => id !== page.id)
                                    : [...(notebook.bookmarkedPageIds ?? []), page.id],
                                },
                              })
                            }
                          >
                            <span aria-hidden="true">★</span>
                          </button>
                          <button
                            className="notebook-sheet-remove"
                            type="button"
                            aria-label={`Remover folha ${pages.indexOf(page) + 1}`}
                            onClick={() => onRemove(page.id)}
                          >
                            <PaperEditorIcon name="close" />
                          </button>
                        </footer>
                      </>
                    ) : side === 0 && filtered.length === 0 ? (
                      <div className="notebook-empty-paper" aria-label="Folha em branco" />
                    ) : (
                      <button
                        type="button"
                        className="notebook-sheet-create"
                        onClick={create}
                        aria-label={pages.length ? "Criar próxima folha" : "Criar primeira folha"}
                      >
                        <PaperActionIcon name="plus" />
                        <strong>{pages.length ? "Nova folha" : "Criar primeira folha"}</strong>
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
          <nav
            className={`notebook-subject-ribbons ${notebook.dividerPosition === "bottom" ? "is-bottom" : ""}`}
            aria-label="Divisórias do caderno"
          >
            {[
              { id: "all", name: "Todas", color: "#51259B" },
              { id: "", name: "Sem divisória", color: "#51465D" },
              ...divisions,
            ].map((subject) => (
              <button
                type="button"
                key={subject.id}
                style={{ "--ribbon-color": subject.color } as CSSProperties}
                aria-pressed={subjectId === subject.id}
                title={subject.name}
                onClick={() => chooseSubject(subject.id)}
              >
                {subject.name}
              </button>
            ))}
          </nav>
          {bookmarks.length > 0 && (
            <nav className="notebook-page-bookmarks" aria-label="Folhas importantes">
              {bookmarks.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  title={page.title}
                  onClick={() => {
                    setSubjectId("all");
                    setSpreadIndex(Math.floor(pages.indexOf(page) / 2));
                    setShowCover(false);
                  }}
                >
                  ★ {pages.indexOf(page) + 1}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}
      {!showCover && (
        <nav className="notebook-preview-controls" aria-label="Folhear caderno">
          <button
            className="secondary-button"
            type="button"
            disabled={current === 0}
            onClick={() => turn(-1)}
          >
            ‹ Anterior
          </button>
          <span aria-live="polite">
            {filtered.length
              ? `Folhas ${current * 2 + 1}${visible.length > 1 ? ` e ${current * 2 + 2}` : ""} de ${filtered.length}`
              : "Nenhuma folha ainda"}
          </span>
          <button
            className="secondary-button"
            type="button"
            disabled={current >= lastSpread}
            onClick={() => turn(1)}
          >
            Próxima ›
          </button>
        </nav>
      )}
      {pages.length > 0 && (
        <div className="notebook-preview-actions">
          <button
            className="notebook-preview-create"
            type="button"
            onClick={create}
            aria-label="Criar nova folha"
          >
            <PaperActionIcon name="plus" />
            <span>Nova folha</span>
          </button>
        </div>
      )}
    </div>
  );
}
