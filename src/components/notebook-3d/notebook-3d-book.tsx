import { useRef, useState, type Dispatch } from "react";
import { uiText } from "../../i18n/runtime";
import type {
  StudyNote,
  StudyNotebook,
  WorkspaceAction,
  WorkspaceState,
} from "../../domain/workspace";
import { FocusPaperArrow } from "../focus-paper-arrow";
import {
  NotebookPaperTools,
  notebookPaperTabs,
  type PlacementResolver,
} from "../notebook-paper-tools";
import { NotebookToolIcon } from "../notebook-tool-icon";
import { PaperActionIcon } from "../paper-action-icon";
import { PaperEditorIcon } from "../paper-editor-icon";
import { Notebook3dView } from "./notebook-3d-view";
import type { BookView } from "./notebook-3d-model";

export type NotebookSpread3dProps = {
  notebook: StudyNotebook;
  pages: StudyNote[];
  subjects: WorkspaceState["subjects"];
  dispatch: Dispatch<WorkspaceAction>;
  transitioning: boolean;
  returningFromPageId: string | undefined;
  jump: { pageId: string; nonce: number } | undefined;
  /** Páginas visíveis na dupla atual e o índice dela. */
  visible: StudyNote[];
  current: number;
  lastSpread: number;
  showCover: boolean;
  showBack: boolean;
  setShowCover: (value: boolean) => void;
  setShowBack: (value: boolean) => void;
  setSpreadIndex: (value: number) => void;
  onOpen: (id: string) => void;
  onCreate: (subjectId: string) => void;
  onIndex: (() => void) | undefined;
  onUnavailable: () => void;
};

/** Caderno em 3D com as mesmas ferramentas, navegação e atalhos de teclado da vitrine 2D. */
export function NotebookSpread3d({
  notebook,
  pages,
  subjects,
  dispatch,
  transitioning,
  returningFromPageId,
  jump,
  visible,
  current,
  lastSpread,
  showCover,
  showBack,
  setShowCover,
  setShowBack,
  setSpreadIndex,
  onOpen,
  onCreate,
  onIndex,
  onUnavailable,
}: NotebookSpread3dProps) {
  const sceneResolver = useRef<PlacementResolver | null>(null);
  const [openRequest, setOpenRequest] = useState<{ pageId: string; nonce: number } | undefined>();
  const view: BookView = { cover: showCover, back: showBack, spread: current };
  const setView = (next: BookView) => {
    setShowCover(next.cover);
    setShowBack(next.back);
    if (!next.cover && !next.back) setSpreadIndex(Math.max(0, Math.min(lastSpread, next.spread)));
  };
  const closed = showCover || showBack;
  const previousLabel = showBack ? uiText(3170) : current === 0 ? uiText(1857) : uiText(1858);
  const nextLabel = !showCover && current >= lastSpread ? uiText(3169) : uiText(744);
  return (
    <div className="notebook-spread-workspace is-3d" data-notebook-3d="">
      <NotebookPaperTools
        notebook={notebook}
        pages={pages}
        subjects={subjects}
        visible={closed ? [] : visible}
        dispatch={dispatch}
        disabled={Boolean(transitioning) || closed}
        scene
        resolverRef={sceneResolver}
        indexControl={
          onIndex && (
            <button
              type="button"
              className="notebook-paper-tool"
              disabled={Boolean(transitioning)}
              onClick={onIndex}
              aria-label={uiText(701)}
              title={uiText(701)}
            >
              <NotebookToolIcon name="index" />
              <span>{uiText(701)}</span>
            </button>
          )
        }
        coverControl={null}
        onJump={(id) => {
          setShowCover(false);
          setShowBack(false);
          setSpreadIndex(Math.floor(pages.findIndex((page) => page.id === id) / 2));
        }}
      >
        {(tools) => (
          <Notebook3dView
            title={notebook.title}
            pages={pages}
            tabs={notebookPaperTabs(notebook, pages, subjects)}
            view={view}
            placing={tools.tool}
            editingTabs={tools.editing}
            selectedTabId={tools.selectedId}
            busy={Boolean(transitioning)}
            returningFromPageId={returningFromPageId}
            jump={jump}
            openRequest={openRequest}
            resolverRef={sceneResolver}
            onView={setView}
            onOpen={onOpen}
            onCreate={() => onCreate(notebook.subjectId)}
            onTabActivate={tools.activateTab}
            onTabMoved={(id, result) => {
              const tab = notebookPaperTabs(notebook, pages, subjects).find(
                (item) => item.id === id,
              );
              if (tab) tools.placeResolved(tab.kind, result, id);
            }}
            onPlace={(kind, result) => tools.placeResolved(kind, result)}
            onUnavailable={() => onUnavailable()}
          />
        )}
      </NotebookPaperTools>
      <nav className="notebook-preview-controls is-3d" aria-label={uiText(695)}>
        <button
          className="focus-mode-arrow focus-mode-arrow--previous notebook-3d-arrow"
          type="button"
          disabled={showCover || Boolean(transitioning)}
          aria-label={previousLabel}
          title={previousLabel}
          onClick={() =>
            showBack
              ? setShowBack(false)
              : current === 0
                ? setShowCover(true)
                : setSpreadIndex(current - 1)
          }
        >
          <FocusPaperArrow />
        </button>
        <span aria-live="polite">
          {showCover
            ? uiText(3178)
            : showBack
              ? uiText(3168)
              : pages.length
                ? uiText(1859, [
                    current * 2 + 1,
                    visible.length > 1 ? uiText(2570, [current * 2 + 2]) : "",
                    pages.length,
                  ])
                : uiText(1860)}
        </span>
        <button
          className="focus-mode-arrow focus-mode-arrow--next notebook-3d-arrow"
          type="button"
          disabled={showBack || Boolean(transitioning)}
          aria-label={nextLabel}
          title={nextLabel}
          onClick={() =>
            showCover
              ? setShowCover(false)
              : current >= lastSpread
                ? setShowBack(true)
                : setSpreadIndex(current + 1)
          }
        >
          <FocusPaperArrow />
        </button>
      </nav>
      <div className="notebook-preview-actions">
        {/* Abrir é tocar na folha; estes botões só aparecem para quem navega pelo teclado. */}
        {!closed &&
          visible.map((page) => (
            <button
              key={page.id}
              className="notebook-preview-open"
              type="button"
              disabled={Boolean(transitioning)}
              aria-label={uiText(1855, [page.title, pages.indexOf(page) + 1])}
              onClick={() =>
                setOpenRequest((previous) => ({
                  pageId: page.id,
                  nonce: (previous?.nonce ?? 0) + 1,
                }))
              }
            >
              <PaperEditorIcon name="pen" />
              <span>{uiText(3171, [pages.indexOf(page) + 1])}</span>
            </button>
          ))}
        <button
          className="notebook-preview-create"
          type="button"
          disabled={Boolean(transitioning)}
          onClick={() => onCreate(notebook.subjectId)}
          aria-label={pages.length ? uiText(745) : uiText(1391)}
        >
          <PaperActionIcon name="plus" />
          <span>{pages.length ? uiText(746) : uiText(1391)}</span>
        </button>
      </div>
    </div>
  );
}
