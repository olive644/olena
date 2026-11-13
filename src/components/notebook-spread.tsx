import { NotebookClasp } from "./notebook-clasp";
import { PaperDigits } from "./paper-digits";
import { notebookCoverTheme } from "../domain/notebook-covers";
import { uiText, useLanguage } from "../i18n/runtime";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type Dispatch } from "react";
import { isMotionReduced } from "../data/accessibility-preferences";
import {
  NotebookJourney,
  canAnimateNotebook,
  notebookPageSnapshot,
  type NotebookJourneyState,
} from "./notebook-journey";
import type {
  StudyNote,
  StudyNotebook,
  WorkspaceAction,
  WorkspaceState,
} from "../domain/workspace";
import { PaperActionIcon } from "./paper-action-icon";
import { PaperCloseIcon } from "./paper-close-icon";
import { NotebookPaperTools, notebookPaperTabs } from "./notebook-paper-tools";
import { NotebookCover } from "./notebook-cover";
import { NotebookBackCover } from "./notebook-back-cover";
import { NotebookTurnLeaf, type RidingTab } from "./notebook-turn-leaf";
import { tabsChangingSide } from "./notebook-tab-stack";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { NotebookPageThumbnail } from "./notebook-page-thumbnail";
import { NotebookToolIcon } from "./notebook-tool-icon";
import { NOTEBOOK_TURN_MS, NOTEBOOK_TURN_EASING } from "./notebook-motion";
import "./notebook-spread.css";
import "./notebook-binding-finish.css";

type Props = {
  initiallyShowCover?: boolean;
  initialPageId?: string | undefined;
  participants?: {
    id: string;
    displayName: string;
    avatarUrl?: string | undefined;
    online: boolean;
  }[];
  notebook: StudyNotebook;
  pages: StudyNote[];
  subjects: WorkspaceState["subjects"];
  dispatch: Dispatch<WorkspaceAction>;
  onOpen: (id: string) => void;
  onCreate: (subjectId: string) => void;
  onRemove: (id: string) => void;
  onBack?: () => void;
  onIndex?: () => void;
  transitioning?: boolean;
  readOnly?: boolean;
  compactPreview?: boolean;
};
type Turn = {
  from: number;
  to: number;
  direction: number;
  progress: number;
  settling: boolean;
  automatic?: boolean;
};
const reducedMotion = isMotionReduced;

function PageImage({ page }: { page?: StudyNote | undefined }) {
  useLanguage();

  return (
    <>
      {page?.assets[0] ? (
        <NotebookPageThumbnail asset={page.assets[0]} />
      ) : (
        <div className="notebook-empty-paper">{page?.content && <p>{page.content}</p>}</div>
      )}
    </>
  );
}

export function NotebookSpread({
  initiallyShowCover = false,
  initialPageId,
  participants,
  notebook,
  pages,
  subjects,
  dispatch,
  onOpen,
  onCreate,
  onRemove,
  onIndex,
  onBack,
  transitioning = false,
  readOnly = false,
  compactPreview = false,
}: Props) {
  useLanguage();
  const [showBack, setShowBack] = useState(false);
  // Barra de baixo do caderno 2D: ferramentas só com ícone, junto do "+" de nova folha.
  const [dockHost, setDockHost] = useState<HTMLElement | null>(null);
  const hasDock = !compactPreview && !readOnly;

  const [spreadIndex, setSpreadIndex] = useState(() =>
    Math.max(0, Math.floor(pages.findIndex((page) => page.id === initialPageId) / 2)),
  );
  const [showCover, setShowCover] = useState(initiallyShowCover);
  const [coverJourney, setCoverJourney] = useState<NotebookJourneyState | null>(null);
  const finishCoverJourney = useCallback(() => setCoverJourney(null), []);
  function changeCover(next: boolean) {
    if ((readOnly && !compactPreview) || busy || next === showCover) return;
    if (next && onBack) {
      onBack();
      return;
    }
    suppressClick.current = false;
    const source = document.querySelector<HTMLElement>(
      next ? ".notebook-spread-shell" : ".notebook-concept-cover .book-cover",
    );
    const rect = source?.getBoundingClientRect();
    if (rect && !compactPreview && canAnimateNotebook())
      setCoverJourney({
        notebook,
        tabs: notebookPaperTabs(notebook, pages, subjects),
        returning: next,
        destination: next ? "cover" : "spread",
        pages: next ? notebookPageSnapshot() : undefined,
        from: next
          ? { x: rect.x + rect.width / 2, y: rect.y, width: rect.width / 2, height: rect.height }
          : rect,
      });
    setShowCover(next);
  }
  function changeBack(next: boolean) {
    if (readOnly || compactPreview || busy || next === showBack) return;
    if (next && onBack) {
      onBack();
      return;
    }
    suppressClick.current = false;
    const source = document.querySelector<HTMLElement>(
      next ? ".notebook-spread-shell" : ".notebook-concept-cover .book-cover",
    );
    const rect = source?.getBoundingClientRect();
    if (rect && canAnimateNotebook())
      setCoverJourney({
        notebook,
        tabs: [],
        side: "back",
        returning: next,
        destination: next ? "cover" : "spread",
        pages: next ? notebookPageSnapshot() : undefined,
        from: next ? { x: rect.x, y: rect.y, width: rect.width / 2, height: rect.height } : rect,
      });
    setShowBack(next);
  }
  const [turning, setTurning] = useState<Turn | null>(null);
  const [removing, setRemoving] = useState<{ page: StudyNote; side: number } | null>(null);
  const drag = useRef<{ x: number; y: number; id: number; width: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const lastSpread = Math.max(0, Math.ceil(pages.length / 2) - 1);
  const current = Math.min(spreadIndex, lastSpread);
  const visible = pages.slice(current * 2, current * 2 + 2);
  const busy = Boolean(turning || removing || coverJourney || transitioning);
  const canOpenBack = !readOnly && !compactPreview && pages.length > 0;
  // Abas que acabaram de pousar na pilha nova: assentam com um pequeno movimento.
  const ridingRef = useRef<ReadonlySet<string> | undefined>(undefined);
  const [landedTabIds, setLandedTabIds] = useState<ReadonlySet<string> | undefined>();
  useEffect(() => {
    if (!turning?.settling) return;
    const timer = window.setTimeout(() => {
      const arrived = turning.progress === 1 ? ridingRef.current : undefined;
      setSpreadIndex(turning.progress === 1 ? turning.to : turning.from);
      setTurning(null);
      if (arrived) {
        setLandedTabIds(arrived);
        window.setTimeout(() => setLandedTabIds(undefined), 900);
      }
    }, NOTEBOOK_TURN_MS + 40);
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
  // Abas que trocam de lado com a folha que vira: viajam nela em vez de ficarem na camada fixa.
  const pageIds = pages.map((page) => page.id);
  const ridingTabs: RidingTab[] = turning
    ? tabsChangingSide(
        notebookPaperTabs(notebook, pages, subjects),
        pageIds,
        turning.from,
        turning.to,
      ).map((tab) => ({ tab, pageIndex: pageIds.indexOf(tab.pageId) }))
    : [];
  const ridingIds = ridingTabs.length ? new Set(ridingTabs.map(({ tab }) => tab.id)) : undefined;
  useEffect(() => {
    ridingRef.current = ridingIds;
  });
  const back = turning ? pages[turning.to * 2 + (turning.direction > 0 ? 0 : 1)] : undefined;
  return (
    <div
      className={`notebook-spread-workspace ${readOnly ? "is-readonly-preview" : ""}`}
      data-cover-theme={notebookCoverTheme(notebook.coverStyle)}
      style={
        {
          "--turn-duration": `${NOTEBOOK_TURN_MS}ms`,
          "--turn-easing": NOTEBOOK_TURN_EASING,
        } as CSSProperties
      }
    >
      {coverJourney && <NotebookJourney journey={coverJourney} onDone={finishCoverJourney} />}
      {showBack ? (
        <div className="notebook-cover-customizer">
          <button
            type="button"
            className="notebook-concept-cover is-back"
            disabled={busy}
            aria-label={uiText(3170)}
            onClick={() => changeBack(false)}
          >
            <NotebookBackCover coverStyle={notebook.coverStyle} subjectColor="#7C3AED" />
          </button>
        </div>
      ) : showCover ? (
        <div className="notebook-cover-customizer">
          <button
            type="button"
            className="notebook-concept-cover"
            disabled={busy}
            aria-label={uiText(1853, [notebook.title])}
            onPointerDown={(event) => {
              if (busy || event.button !== 0) return;
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
              if (dx < -8 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.15) {
                start.moved = true;
                event.currentTarget.setPointerCapture(event.pointerId);
              }
            }}
            onPointerUp={(event) => {
              const start = drag.current;
              drag.current = null;
              if (start?.moved && event.clientX - start.x < -40) {
                changeCover(false);
              }
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              changeCover(false);
            }}
          >
            <NotebookCover
              coverStyle={notebook.coverStyle}
              {...(participants ? { participants } : {})}
              subjectColor="#7C3AED"
              title={notebook.title}
              tabs={notebookPaperTabs(notebook, pages, subjects)}
            />
          </button>
          {compactPreview && (
            <nav className="notebook-preview-controls" aria-label={uiText(695)}>
              <button
                type="button"
                className="student-page-arrow is-next"
                aria-label={uiText(744)}
                disabled={busy}
                onClick={() => changeCover(false)}
              >
                <FocusPaperArrow />
              </button>
            </nav>
          )}
        </div>
      ) : (
        <>
          <NotebookPaperTools
            notebook={notebook}
            pages={pages}
            subjects={subjects}
            visible={visible}
            dispatch={dispatch}
            disabled={busy || readOnly}
            toolbarHost={hasDock ? dockHost : null}
            spread={current}
            {...(ridingIds ? { hiddenTabIds: ridingIds } : {})}
            {...(landedTabIds ? { landedTabIds } : {})}
            endControl={
              hasDock && pages.length > 0 ? (
                <button
                  type="button"
                  className="notebook-paper-tool"
                  disabled={busy}
                  onClick={() => onCreate(notebook.subjectId)}
                  aria-label={uiText(745)}
                >
                  <PaperActionIcon name="plus" />
                </button>
              ) : undefined
            }
            indexControl={
              onIndex && (
                <button
                  type="button"
                  className="notebook-paper-tool"
                  disabled={busy}
                  onClick={onIndex}
                  aria-label={uiText(701)}
                >
                  <NotebookToolIcon name="index" />
                  <span>{uiText(701)}</span>
                </button>
              )
            }
            coverControl={null}
            onJump={(id) => turnTo(Math.floor(pages.findIndex((page) => page.id === id) / 2))}
          >
            <div
              className={`notebook-paper-spread ${turning ? "is-turning" : ""}`}
              tabIndex={0}
              aria-label={uiText(742)}
              aria-busy={busy}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === "ArrowLeft" || event.key === "ArrowRight")
                ) {
                  event.preventDefault();
                  if (event.key === "ArrowLeft" && current === 0) changeCover(true);
                  else if (event.key === "ArrowRight" && current >= lastSpread && canOpenBack)
                    changeBack(true);
                  else turnTo(current + (event.key === "ArrowLeft" ? -1 : 1));
                }
              }}
              onPointerDown={(event) => {
                if (
                  event.button !== 0 ||
                  busy ||
                  (event.target as HTMLElement).closest("footer, input, .notebook-sheet-create")
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
                if (
                  current === 0 &&
                  direction === -1 &&
                  start.x < event.currentTarget.getBoundingClientRect().x + start.width / 2
                ) {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  return;
                }
                if (target !== current)
                  setTurning({
                    from: current,
                    to: target,
                    direction,
                    progress: Math.min(0.98, Math.abs(dx) / (start.width * 0.65)),
                    settling: false,
                  });
              }}
              onPointerUp={(event) => {
                const start = drag.current;
                drag.current = null;
                if (!start?.moved) return;
                if (
                  !turning &&
                  current === 0 &&
                  event.clientX - start.x > 40 &&
                  start.x < event.currentTarget.getBoundingClientRect().x + start.width / 2
                ) {
                  changeCover(true);
                  return;
                }
                if (!turning) return;
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
              <div className="notebook-cover-corners" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="notebook-page-stack" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <NotebookClasp className="notebook-open-clasp" />
              <div className="notebook-spread-pair">
                {basePages.map((page, side) => (
                  <article
                    className={`notebook-sheet ${!page && side === 1 ? "is-endpaper" : ""} ${removing?.side === side ? "is-revealing" : ""}`}
                    key={side}
                    data-page-id={page?.id}
                  >
                    {!page && side === 1 && (
                      <div className="notebook-endpaper" aria-hidden="true">
                        <span className="notebook-endpaper-card" />
                        <span className="notebook-endpaper-pocket" />
                      </div>
                    )}
                    {page ? (
                      <>
                        <button
                          className="notebook-sheet-open"
                          type="button"
                          disabled={busy}
                          onClick={() => onOpen(page.id)}
                          aria-label={uiText(1855, [page.title, pages.indexOf(page) + 1])}
                        >
                          <PageImage page={page} />
                        </button>
                        <footer>
                          <PaperDigits value={String(pages.indexOf(page) + 1)} />
                          {!readOnly && (
                            <button
                              className="notebook-sheet-remove"
                              type="button"
                              disabled={busy}
                              aria-label={uiText(1856, [pages.indexOf(page) + 1])}
                              onClick={() => remove(page, side)}
                            >
                              <PaperCloseIcon />
                            </button>
                          )}
                        </footer>
                      </>
                    ) : compactPreview || (side === 0 && pages.length === 0) ? (
                      <div className="notebook-empty-paper" aria-label={uiText(743)} />
                    ) : (
                      <button
                        type="button"
                        className="notebook-sheet-create"
                        disabled={busy}
                        onClick={() => onCreate(notebook.subjectId)}
                        aria-label={pages.length ? uiText(700) : uiText(1391)}
                      >
                        <PaperActionIcon name="plus" />
                        <strong>{pages.length ? uiText(746) : uiText(1391)}</strong>
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
                <NotebookTurnLeaf
                  direction={turning.direction}
                  settling={turning.settling}
                  automatic={Boolean(turning.automatic)}
                  angle={turning.direction * -180 * turning.progress}
                  front={front}
                  back={back}
                  frontNumber={front ? pages.indexOf(front) + 1 : undefined}
                  backNumber={back ? pages.indexOf(back) + 1 : undefined}
                  riding={ridingTabs}
                />
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
          <nav className="notebook-preview-controls" aria-label={uiText(695)}>
            {(!readOnly || compactPreview || current > 0) && (
              <button
                className={compactPreview ? "student-page-arrow" : "notebook-flip-arrow"}
                aria-label={current === 0 ? uiText(1857) : uiText(1858)}
                type="button"
                disabled={busy}
                onClick={() => (current === 0 ? changeCover(true) : turnTo(current - 1))}
              >
                <FocusPaperArrow />
              </button>
            )}
            <span className="visually-hidden" aria-live="polite">
              {pages.length
                ? uiText(1859, [
                    current * 2 + 1,
                    visible.length > 1 ? uiText(2570, [current * 2 + 2]) : "",
                    pages.length,
                  ])
                : uiText(1860)}
            </span>
            <button
              className={`${compactPreview ? "student-page-arrow" : "notebook-flip-arrow"} is-next`}
              aria-label={current >= lastSpread && canOpenBack ? uiText(3169) : uiText(744)}
              type="button"
              disabled={(current >= lastSpread && !canOpenBack) || busy}
              onClick={() => (current >= lastSpread ? changeBack(true) : turnTo(current + 1))}
            >
              <FocusPaperArrow />
            </button>
          </nav>
          {hasDock && <div className="notebook-2d-dock" ref={setDockHost} />}
        </>
      )}
      {!readOnly && !hasDock && !showCover && !showBack && pages.length > 0 && (
        <div className="notebook-preview-actions">
          <button
            className="notebook-preview-create"
            type="button"
            disabled={busy}
            onClick={() => onCreate(notebook.subjectId)}
            aria-label={uiText(745)}
          >
            <PaperActionIcon name="plus" />
            <span>{uiText(746)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
