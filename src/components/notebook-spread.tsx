import { useEffect, useRef, useState, type CSSProperties, type Dispatch } from "react";
import type {
  StudyNote,
  StudyNotebook,
  WorkspaceAction,
  WorkspaceState,
} from "../domain/workspace";
import { PaperActionIcon } from "./paper-action-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import { NotebookPaperTools } from "./notebook-paper-tools";
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
type Turn = {
  from: number;
  to: number;
  direction: number;
  progress: number;
  settling: boolean;
  automatic?: boolean;
};
const reducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function PageImage({ page }: { page?: StudyNote | undefined }) {
  return (
    <>
      {page?.assets[0] ? (
        <img draggable={false} src={page.assets[0].dataUrl} alt="" />
      ) : (
        <div className="notebook-empty-paper">{page?.content && <p>{page.content}</p>}</div>
      )}
      <strong>{page?.title ?? ""}</strong>
    </>
  );
}

export function NotebookSpread({
  notebook,
  pages,
  subjects,
  dispatch,
  onOpen,
  onCreate,
  onRemove,
}: Props) {
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [showCover, setShowCover] = useState(false);
  const [turning, setTurning] = useState<Turn | null>(null);
  const [removing, setRemoving] = useState<{ page: StudyNote; side: number } | null>(null);
  const drag = useRef<{ x: number; y: number; id: number; width: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const lastSpread = Math.max(0, Math.ceil(pages.length / 2) - 1);
  const current = Math.min(spreadIndex, lastSpread);
  const visible = pages.slice(current * 2, current * 2 + 2);
  const busy = Boolean(turning || removing);
  useEffect(() => {
    if (!turning?.settling) return;
    const timer = window.setTimeout(() => {
      setSpreadIndex(turning.progress === 1 ? turning.to : turning.from);
      setTurning(null);
    }, 560);
    return () => window.clearTimeout(timer);
  }, [turning]);
  useEffect(() => {
    if (!removing) return;
    const timer = window.setTimeout(() => setRemoving(null), 850);
    return () => window.clearTimeout(timer);
  }, [removing]);
  function turnTo(index: number) {
    const target = Math.max(0, Math.min(lastSpread, index));
    if (target === current || busy) return;
    if (reducedMotion()) {
      setSpreadIndex(target);
      return;
    }
    setTurning({
      from: current,
      to: target,
      direction: target > current ? 1 : -1,
      progress: 1,
      settling: true,
      automatic: true,
    });
  }
  function remove(page: StudyNote, side: number) {
    if (busy) return;
    if (!reducedMotion()) setRemoving({ page, side });
    onRemove(page.id);
  }
  const basePages = turning
    ? [
        pages[(turning.direction > 0 ? turning.from : turning.to) * 2],
        pages[(turning.direction > 0 ? turning.to : turning.from) * 2 + 1],
      ]
    : [visible[0], visible[1]];
  const front = turning ? pages[turning.from * 2 + (turning.direction > 0 ? 1 : 0)] : undefined;
  const back = turning ? pages[turning.to * 2 + (turning.direction > 0 ? 0 : 1)] : undefined;
  return (
    <div className="notebook-spread-workspace">
      {showCover && (
        <div className="notebook-spread-options">
          <button
            type="button"
            className="secondary-button"
            aria-pressed={showCover}
            disabled={busy}
            onClick={() => setShowCover(!showCover)}
          >
            {showCover ? "Ver folhas" : "Ver capa"}
          </button>
        </div>
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
        <>
          <NotebookPaperTools
            notebook={notebook}
            pages={pages}
            subjects={subjects}
            visible={visible}
            dispatch={dispatch}
            disabled={busy}
            coverControl={
              <button
                type="button"
                className="notebook-paper-tool"
                disabled={busy}
                onClick={() => setShowCover(true)}
              >
                Ver capa
              </button>
            }
            onJump={(id) => turnTo(Math.floor(pages.findIndex((page) => page.id === id) / 2))}
          >
            <div
              className={`notebook-paper-spread ${turning ? "is-turning" : ""}`}
              tabIndex={0}
              aria-label="Prévia folheável do caderno"
              aria-busy={busy}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === "ArrowLeft" || event.key === "ArrowRight")
                ) {
                  event.preventDefault();
                  turnTo(current + (event.key === "ArrowLeft" ? -1 : 1));
                }
              }}
              onPointerDown={(event) => {
                if (
                  event.button !== 0 ||
                  busy ||
                  (event.target as HTMLElement).closest("footer, .notebook-sheet-create")
                )
                  return;
                suppressClick.current = false;
                drag.current = {
                  x: event.clientX,
                  y: event.clientY,
                  id: event.pointerId,
                  width: event.currentTarget.clientWidth,
                  moved: false,
                };
              }}
              onPointerMove={(event) => {
                const start = drag.current;
                if (!start || start.id !== event.pointerId) return;
                const dx = event.clientX - start.x;
                if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(event.clientY - start.y) * 1.15)
                  return;
                start.moved = true;
                suppressClick.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                const direction = dx < 0 ? 1 : -1;
                const target = Math.max(0, Math.min(lastSpread, current + direction));
                if (target !== current)
                  setTurning({
                    from: current,
                    to: target,
                    direction,
                    progress: Math.min(0.98, Math.abs(dx) / (start.width * 0.65)),
                    settling: false,
                  });
              }}
              onPointerUp={() => {
                const start = drag.current;
                drag.current = null;
                if (!start?.moved || !turning) return;
                if (reducedMotion()) {
                  setSpreadIndex(turning.progress > 0.18 ? turning.to : turning.from);
                  setTurning(null);
                } else
                  setTurning({
                    ...turning,
                    progress: turning.progress > 0.18 ? 1 : 0,
                    settling: true,
                  });
              }}
              onPointerCancel={() => {
                drag.current = null;
                setTurning(null);
              }}
              onClickCapture={(event) => {
                if (suppressClick.current || busy) {
                  event.stopPropagation();
                  event.preventDefault();
                  suppressClick.current = false;
                }
              }}
            >
              <div className="notebook-spread-pair">
                {basePages.map((page, side) => (
                  <article
                    className={`notebook-sheet ${removing?.side === side ? "is-revealing" : ""}`}
                    key={side}
                    data-page-id={page?.id}
                  >
                    {page ? (
                      <>
                        <button
                          className="notebook-sheet-open"
                          type="button"
                          disabled={busy}
                          onClick={() => onOpen(page.id)}
                          aria-label={`Abrir preview de ${page.title}, folha ${pages.indexOf(page) + 1}`}
                        >
                          <PageImage page={page} />
                        </button>
                        <footer>
                          <span>{pages.indexOf(page) + 1}</span>
                          <button
                            className="notebook-sheet-remove"
                            type="button"
                            disabled={busy}
                            aria-label={`Remover folha ${pages.indexOf(page) + 1}`}
                            onClick={() => remove(page, side)}
                          >
                            <PaperEditorIcon name="close" />
                          </button>
                        </footer>
                      </>
                    ) : side === 0 && pages.length === 0 ? (
                      <div className="notebook-empty-paper" aria-label="Folha em branco" />
                    ) : (
                      <button
                        type="button"
                        className="notebook-sheet-create"
                        disabled={busy}
                        onClick={() => onCreate(notebook.subjectId)}
                        aria-label={pages.length ? "Criar próxima folha" : "Criar primeira folha"}
                      >
                        <PaperActionIcon name="plus" />
                        <strong>{pages.length ? "Nova folha" : "Criar primeira folha"}</strong>
                      </button>
                    )}
                  </article>
                ))}
              </div>
              <div className="notebook-binding" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              {turning && (
                <div
                  className={`notebook-turn-leaf ${turning.direction < 0 ? "is-backward" : ""} ${turning.settling ? "is-settling" : "is-dragging"} ${turning.automatic ? "is-automatic" : ""}`}
                  aria-hidden="true"
                  style={
                    {
                      "--turn-angle": `${turning.direction * -180 * turning.progress}deg`,
                    } as CSSProperties
                  }
                >
                  <div className="notebook-turn-face is-front">
                    <PageImage page={front} />
                    <span>{front ? pages.indexOf(front) + 1 : ""}</span>
                  </div>
                  <div className="notebook-turn-face is-back">
                    <PageImage page={back} />
                    <span>{back ? pages.indexOf(back) + 1 : ""}</span>
                  </div>
                </div>
              )}
              {removing && (
                <div className={`notebook-crumple is-side-${removing.side}`} aria-hidden="true">
                  <div className="notebook-crumple-sheet">
                    <PageImage page={removing.page} />
                    <div className="notebook-paper-creases" />
                  </div>
                  <div className="notebook-paper-ball">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              )}
            </div>
          </NotebookPaperTools>
          <nav className="notebook-preview-controls" aria-label="Folhear caderno">
            <button
              className="secondary-button"
              type="button"
              disabled={current === 0 || busy}
              onClick={() => turnTo(current - 1)}
            >
              ‹ Anterior
            </button>
            <span aria-live="polite">
              {pages.length
                ? `Folhas ${current * 2 + 1}${visible.length > 1 ? ` e ${current * 2 + 2}` : ""} de ${pages.length}`
                : "Nenhuma folha ainda"}
            </span>
            <button
              className="secondary-button"
              type="button"
              disabled={current >= lastSpread || busy}
              onClick={() => turnTo(current + 1)}
            >
              Próxima ›
            </button>
          </nav>
        </>
      )}
      {pages.length > 0 && (
        <div className="notebook-preview-actions">
          <button
            className="notebook-preview-create"
            type="button"
            disabled={busy}
            onClick={() => onCreate(notebook.subjectId)}
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
