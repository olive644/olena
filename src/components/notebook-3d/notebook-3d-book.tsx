import { useId, useRef, useState, type Dispatch } from "react";
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
  // Sem folhas a barra já abre, para o "+" de criar a primeira folha estar à vista.
  const [toolsOpen, setToolsOpen] = useState(pages.length === 0);
  const toolsId = useId();
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
  const status = showCover
    ? uiText(3178)
    : showBack
      ? uiText(3168)
      : pages.length
        ? uiText(1859, [
            current * 2 + 1,
            visible.length > 1 ? uiText(2570, [current * 2 + 2]) : "",
            pages.length,
          ])
        : uiText(1860);
  const goPrevious = () =>
    showBack
      ? setShowBack(false)
      : current === 0
        ? setShowCover(true)
        : setSpreadIndex(current - 1);
  const goNext = () =>
    showCover
      ? setShowCover(false)
      : current >= lastSpread
        ? setShowBack(true)
        : setSpreadIndex(current + 1);
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
        endControl={
          <button
            type="button"
            className="notebook-paper-tool"
            disabled={Boolean(transitioning)}
            onClick={() => onCreate(notebook.subjectId)}
            aria-label={pages.length ? uiText(745) : uiText(1391)}
            title={pages.length ? uiText(745) : uiText(1391)}
          >
            <PaperActionIcon name="plus" />
          </button>
        }
        coverControl={null}
        onJump={(id) => {
          setShowCover(false);
          setShowBack(false);
          setSpreadIndex(Math.floor(pages.findIndex((page) => page.id === id) / 2));
        }}
      >
        {(tools) => (
          <>
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
            <div className="notebook-3d-dock">
              <p className="notebook-3d-status" aria-live="polite">
                {tools.tool || tools.editing ? tools.hint : status}
              </p>
              <div className="notebook-3d-bar">
                <button
                  className="focus-mode-arrow notebook-3d-tools-toggle"
                  type="button"
                  aria-label={uiText(toolsOpen ? 3181 : 3182)}
                  title={uiText(toolsOpen ? 3181 : 3182)}
                  aria-expanded={toolsOpen}
                  aria-controls={toolsId}
                  onClick={() => {
                    if (toolsOpen) tools.cancel();
                    setToolsOpen(!toolsOpen);
                  }}
                >
                  <FocusPaperArrow />
                </button>
                <div className="notebook-3d-tray" id={toolsId} hidden={!toolsOpen}>
                  {tools.toolbar}
                </div>
              </div>
              {/* Virar a folha é arrastar ou tocar na borda; estes botões servem ao teclado e ao leitor de tela. */}
              <nav className="notebook-3d-keys" aria-label={uiText(695)}>
                <button
                  type="button"
                  disabled={showCover || Boolean(transitioning)}
                  onClick={goPrevious}
                >
                  {previousLabel}
                </button>
                <button
                  type="button"
                  disabled={showBack || Boolean(transitioning)}
                  onClick={goNext}
                >
                  {nextLabel}
                </button>
                {!closed &&
                  visible.map((page) => (
                    <button
                      key={page.id}
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
                      {uiText(3171, [pages.indexOf(page) + 1])}
                    </button>
                  ))}
              </nav>
            </div>
          </>
        )}
      </NotebookPaperTools>
    </div>
  );
}
