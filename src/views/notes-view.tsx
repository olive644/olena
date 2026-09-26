import { NotebookPageBook } from "../components/notebook-page-book";
import { NotebookSearch } from "../components/notebook-search";
import { NotebookPageIndex } from "../components/notebook-page-index";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type Dispatch } from "react";
import {
  NotebookJourney,
  canAnimateNotebook,
  notebookShelfCover,
  notebookPageSnapshot,
  type NotebookJourneyState,
} from "../components/notebook-journey";
import { PageHeader } from "../components/app-navigation";
import { HelenaLoading } from "../components/helena-loading";
import { PaperActionIcon } from "../components/paper-action-icon";
import { NotebookSpread } from "../components/notebook-spread";
import {
  NotebookPageJourney,
  type NotebookPageJourneyState,
} from "../components/notebook-page-journey";
import { notebookPaperTabs } from "../components/notebook-paper-tools";
import { NotebookCover as NotebookArtwork } from "../components/notebook-cover";
import type { ImportedPage } from "../components/page-import";
import type { SearchHit } from "../domain/notebook-search";
import type { HandwritingDocument } from "../domain/handwriting";
import { openPrintWindow } from "../data/print-window";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import {
  createWorkspaceId,
  type StudyNotebook,
  type StudyNote,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";

const NoteCaptureTools = lazy(() => import("../components/note-capture-tools"));

function PreviewContent({ page }: { page: StudyNote }) {
  return (
    <>
      {page.assets[0] ? (
        <img src={page.assets[0].dataUrl} alt="" />
      ) : (
        <p>{page.content || "Folha em branco"}</p>
      )}
      <strong>{page.title}</strong>
    </>
  );
}

type NotesViewProps = {
  cloud?: CloudSyncState;
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

function notebookTitle(workspace: WorkspaceState): string {
  const base = "Meu caderno";
  const matches = workspace.notebooks.filter((notebook) => notebook.title.startsWith(base)).length;
  return matches === 0 ? base : `${base} ${matches + 1}`;
}

export function NotesView({ workspace, dispatch, cloud }: NotesViewProps) {
  const createDialog = useRef<HTMLDialogElement>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);

  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [moveMessage, setMoveMessage] = useState("");
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const skipClick = useRef<string | null>(null);
  function moveFolder(id: string, target: string) {
    dispatch({ type: "notebook/folder-moved", id, parentId: target });
    setMoveMessage(
      `Pasta guardada em ${workspace.notebooks.find((item) => item.id === target)?.title ?? "caderno"}.`,
    );
    setDraggedFolder(null);
    setDropTarget(null);
  }
  const [newNotebookName, setNewNotebookName] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [journey, setJourney] = useState<NotebookJourneyState | null>(null);
  const finishJourney = useCallback(() => setJourney(null), []);
  const [pageJourney, setPageJourney] = useState<NotebookPageJourneyState | null>(null);
  const finishPageJourney = useCallback(() => setPageJourney(null), []);
  function openPreviewPage(id: string) {
    if (journey || pageJourney) return;
    const source = Array.from(document.querySelectorAll<HTMLElement>(".notebook-sheet"))
      .find((sheet) => sheet.dataset["pageId"] === id)
      ?.querySelector<HTMLElement>(".notebook-sheet-open");
    const preview = document.querySelector<HTMLElement>(".notebook-entry-preview");
    if (source && preview && canAnimateNotebook()) {
      const { x, y, width, height } = preview.getBoundingClientRect();
      setPageJourney({
        from: source.getBoundingClientRect(),
        paper: source.cloneNode(true) as HTMLElement,
        background: { element: preview.cloneNode(true) as HTMLElement, x, y, width, height },
      });
    }
    setActivePageId(id);
  }
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [notebookSection, setNotebookSection] = useState<"pages" | "notes">("pages");

  useEffect(() => {
    if (navigator.userAgent.includes("jsdom")) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeNotebookId, activePageId]);

  const activeNotebook =
    workspace.notebooks.find((notebook) => notebook.id === activeNotebookId) ?? null;
  const shelfItems = workspace.notebooks.filter((item) => !item.parentId);
  const folders = workspace.notebooks.filter(
    (item) => item.kind === "folder" && item.parentId === activeNotebookId,
  );
  const notebookPages = activeNotebook
    ? activeNotebook.pageIds.flatMap((id) => {
        const page = workspace.notes.find((note) => note.id === id);
        return page && page.kind !== "note" ? [page] : [];
      })
    : [];
  const notebookNotes = activeNotebook
    ? activeNotebook.pageIds.flatMap((id) => {
        const note = workspace.notes.find((item) => item.id === id);
        return note?.kind === "note" ? [note] : [];
      })
    : [];
  const activePage =
    [...notebookPages, ...notebookNotes].find((page) => page.id === activePageId) ?? null;
  const editingAsset = activePage?.assets.find((asset) => asset.id === editingAssetId) ?? null;

  function createNotebook() {
    const id = createWorkspaceId("notebook");
    dispatch({
      type: "notebook/added",
      id,
      title: newNotebookName.trim() || notebookTitle(workspace),
      subjectId: "",
      createdAt: new Date().toISOString(),
    });
    setActiveNotebookId(id);
    setNotebookSection("pages");
    createDialog.current?.close();
    setNewNotebookName("");
    setActivePageId(null);
  }

  function openNotebook(notebook: StudyNotebook) {
    if (skipClick.current === notebook.id) {
      skipClick.current = null;
      return;
    }
    if (draggedFolder && notebook.kind !== "folder") {
      moveFolder(draggedFolder, notebook.id);
      return;
    }
    if (selectionMode) {
      setSelectedNotebookIds((ids) =>
        ids.includes(notebook.id) ? ids.filter((id) => id !== notebook.id) : [...ids, notebook.id],
      );
      return;
    }
    const cover = notebookShelfCover(notebook.id);
    if (cover && canAnimateNotebook())
      setJourney({
        notebook,
        returning: false,
        from: cover.getBoundingClientRect(),
        tabs: notebookPaperTabs(notebook, workspace.notes, workspace.subjects),
      });
    setActiveNotebookId(notebook.id);
    setActivePageId(null);
    setNotebookSection(notebook.kind === "folder" ? "notes" : "pages");
    setPreviewPageIndex(0);
  }

  function movePage(pageId: string, direction: -1 | 1) {
    if (!activeNotebook) return;
    dispatch({ type: "notebook/page-moved", notebookId: activeNotebook.id, pageId, direction });
  }

  function returnToShelf() {
    if (journey) return;
    const spread = document.querySelector<HTMLElement>(".notebook-paper-spread");
    const cover = document.querySelector<HTMLElement>(".notebook-concept-cover .book-cover");
    const rect = (spread ?? cover)?.getBoundingClientRect();
    if (activeNotebook && rect && canAnimateNotebook())
      setJourney({
        notebook: activeNotebook,
        returning: true,
        closed: !spread,
        pages: notebookPageSnapshot(),
        tabs: notebookPaperTabs(activeNotebook, notebookPages, workspace.subjects),
        from: spread
          ? { x: rect.x + rect.width / 2, y: rect.y, width: rect.width / 2, height: rect.height }
          : rect,
      });
    setActiveNotebookId(null);
    setIndexOpen(false);
  }

  function openSearchHit(hit: SearchHit) {
    const target = workspace.notebooks.find((notebook) => notebook.id === hit.notebookId);
    if (!target) return;
    setJourney(null);
    setActiveNotebookId(target.id);
    setActivePageId(hit.pageId);
    setNotebookSection(target.kind === "folder" ? "notes" : "pages");
    setPreviewPageIndex(0);
  }

  function removeSelectedNotebooks() {
    if (selectedNotebookIds.length === 0) return;
    dispatch({ type: "notebook/removed", ids: selectedNotebookIds });
    setSelectedNotebookIds([]);
    setSelectionMode(false);
  }

  function createPageAtEnd() {
    addPage(true);
  }

  function createPage() {
    addPage(false);
  }

  function removePage(id: string) {
    if (!activeNotebook) return;
    const index = notebookPages.findIndex((page) => page.id === id);
    dispatch({ type: "note/removed", notebookId: activeNotebook.id, noteId: id });
    setEditingAssetId(null);
    setActivePageId(null);
    setPreviewPageIndex(Math.max(0, Math.min(index, notebookPages.length - 2)));
  }

  function addPage(append: boolean, subjectId?: string) {
    if (!activeNotebook) return;
    const id = createWorkspaceId("note");
    dispatch({
      type: "note/added",
      append,
      id,
      notebookId: activeNotebook.id,
      subjectId: subjectId ?? activePage?.subjectId ?? activeNotebook.subjectId,
      updatedAt: new Date().toISOString(),
    });
    setActivePageId(id);
  }

  function createTextNote() {
    if (!activeNotebook) return;
    const id = createWorkspaceId("note");
    dispatch({
      type: "note/added",
      id,
      notebookId: activeNotebook.id,
      subjectId: "",
      updatedAt: new Date().toISOString(),
      kind: "note",
    });
    setNotebookSection("notes");
    setActivePageId(id);
  }

  function updatePage(title: string, content: string) {
    if (!activePage) return;
    dispatch({
      type: "note/updated",
      id: activePage.id,
      title,
      content,
      updatedAt: new Date().toISOString(),
    });
  }

  function saveAsset(
    kind: "scan" | "drawing",
    name: string,
    dataUrl: string,
    handwriting?: HandwritingDocument,
  ) {
    if (!activePage) return;
    const assetId = createWorkspaceId("asset");
    dispatch({
      type: "note/asset-added",
      assetId,
      noteId: activePage.id,
      kind,
      name,
      dataUrl,
      createdAt: new Date().toISOString(),
      ...(handwriting ? { handwriting } : {}),
    });
    return assetId;
  }

  function importPages(pages: ImportedPage[]) {
    if (!activeNotebook || pages.length === 0) return;
    let lastPageId: string | null = null;
    const createdAt = new Date().toISOString();
    pages.forEach((page, index) => {
      const id = createWorkspaceId("note");
      const handwriting: HandwritingDocument = {
        version: 1,
        paper: "blank",
        paperColor: "light",
        background: page.image,
        backgroundFrame: page.frame,
        strokes: [],
        stickies: [],
      };
      dispatch({
        type: "note/added",
        id,
        notebookId: activeNotebook.id,
        subjectId: activeNotebook.subjectId,
        updatedAt: createdAt,
      });
      dispatch({
        type: "note/updated",
        id,
        title: `Página importada ${index + 1}`,
        content: "",
        updatedAt: createdAt,
      });
      dispatch({
        type: "note/asset-added",
        noteId: id,
        kind: "drawing",
        name: `Página importada ${index + 1}`,
        dataUrl: page.image,
        createdAt,
        handwriting,
      });
      lastPageId = id;
    });
    setNotebookSection("pages");
    setActivePageId(lastPageId);
  }

  function updateAsset(assetId: string, dataUrl: string, handwriting: HandwritingDocument) {
    if (!activePage) return;
    dispatch({
      type: "note/asset-updated",
      noteId: activePage.id,
      assetId,
      dataUrl,
      handwriting,
      updatedAt: new Date().toISOString(),
    });
  }

  function exportNotebookPdf() {
    const pages = notebookPages
      .map((page) => ({ title: page.title || "Folha sem título", image: page.assets[0]?.dataUrl }))
      .filter((page): page is { title: string; image: string } => Boolean(page.image));
    if (pages.length === 0) {
      setMoveMessage("Adicione pelo menos uma folha com conteúdo antes de exportar.");
      return;
    }
    const printWindow = openPrintWindow();
    if (!printWindow) {
      setMoveMessage("Permita pop-ups para exportar o caderno em PDF.");
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><title></title><style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; background: #fff; }
      .notebook-export-page { width: 210mm; min-height: 297mm; padding: 10mm; display: grid; place-items: center; break-after: page; }
      .notebook-export-page:last-child { break-after: auto; }
      .notebook-export-page img { display: block; max-width: 190mm; max-height: 277mm; object-fit: contain; }
    </style></head><body></body></html>`);
    printWindow.document.title = activeNotebook?.title ?? "Caderno";
    for (const page of pages) {
      const wrapper = printWindow.document.createElement("section");
      wrapper.className = "notebook-export-page";
      const image = printWindow.document.createElement("img");
      image.alt = page.title;
      image.src = page.image;
      wrapper.append(image);
      printWindow.document.body.append(wrapper);
    }
    printWindow.document.close();
    const images = Array.from(printWindow.document.images);
    void Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    ).then(() => {
      printWindow.focus();
      printWindow.print();
    });
  }

  return (
    <main className="main-content notebooks-main" id="main-content" aria-busy={Boolean(journey)}>
      {journey && <NotebookJourney journey={journey} onDone={finishJourney} />}
      {pageJourney && <NotebookPageJourney journey={pageJourney} onDone={finishPageJourney} />}
      <PageHeader />
      {draggedFolder && dragPosition && (
        <div
          className="folder-drag-preview"
          aria-hidden="true"
          style={{ left: dragPosition.x + 12, top: dragPosition.y + 12 }}
        >
          {workspace.notebooks.find((item) => item.id === draggedFolder)?.title}
        </div>
      )}
      <p className="shelf-move-status" role="status">
        {draggedFolder
          ? "Solte a pasta sobre um caderno. Pelo teclado, escolha o caderno e pressione Enter. Escape cancela."
          : moveMessage}
      </p>
      <dialog ref={createDialog} className="notebook-create-dialog" aria-label="Crie">
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            createNotebook();
          }}
        >
          <h2>Novo caderno</h2>
          <label>
            Nome
            <input
              aria-label="Nome"
              value={newNotebookName}
              maxLength={80}
              placeholder="Meu caderno"
              onChange={(event) => setNewNotebookName(event.target.value)}
            />
          </label>
          <div className="notebook-detail-actions">
            <button type="button" onClick={() => createDialog.current?.close()}>
              Cancelar
            </button>
            <button className="primary-button" type="submit">
              Criar caderno
            </button>
          </div>
        </form>
      </dialog>

      {!activeNotebook ? (
        <>
          <header className="view-heading view-heading--with-action notebooks-heading">
            <div>
              <h1>Meus Cadernos</h1>
            </div>
            <div className="new-note-action">
              {workspace.notebooks.length > 0 && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setSelectionMode((enabled) => !enabled);
                    setSelectedNotebookIds([]);
                  }}
                >
                  {selectionMode ? "Concluir seleção" : "Selecionar"}
                </button>
              )}
              <button
                className="primary-button"
                type="button"
                onClick={() => createDialog.current?.showModal()}
              >
                <PaperActionIcon name="plus" /> <span>Crie</span>
              </button>
              {selectionMode && (
                <div
                  className="notebook-selection-actions"
                  role="group"
                  aria-label="Ações dos cadernos"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedNotebookIds(
                        selectedNotebookIds.length === shelfItems.length
                          ? []
                          : shelfItems.map((notebook) => notebook.id),
                      )
                    }
                  >
                    {selectedNotebookIds.length === shelfItems.length
                      ? "Limpar tudo"
                      : "Selecionar tudo"}
                  </button>
                  <button
                    type="button"
                    disabled={selectedNotebookIds.length === 0}
                    onClick={removeSelectedNotebooks}
                  >
                    Excluir{" "}
                    {selectedNotebookIds.length > 0 ? `(${selectedNotebookIds.length})` : ""}
                  </button>
                </div>
              )}
            </div>
          </header>

          {workspace.notebooks.length > 0 && (
            <NotebookSearch workspace={workspace} onOpen={openSearchHit} />
          )}

          <section className="notebooks-showcase" aria-label="Meus cadernos">
            {workspace.notebooks.length === 0 ? (
              <div className="notebooks-empty">
                <NotebookArtwork subjectColor="#7C3AED" />
                <h2>Sua estante está pronta</h2>
                <p>Um lugar para suas ideias. Crie um caderno e preencha suas primeiras folhas.</p>
              </div>
            ) : (
              <div className="notebook-shelves">
                {Array.from({ length: Math.ceil(shelfItems.length / 4) }, (_, shelfIndex) => (
                  <section
                    className="notebook-shelf"
                    key={shelfIndex}
                    aria-label={`Prateleira ${shelfIndex + 1}`}
                  >
                    <span className="notebook-shelf__label">
                      Coleção {String(shelfIndex + 1).padStart(2, "0")}
                    </span>
                    <div className="notebook-grid">
                      {shelfItems.slice(shelfIndex * 4, shelfIndex * 4 + 4).map((notebook) => {
                        const coverIndex =
                          [...notebook.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
                        return (
                          <button
                            className={`notebook-card ${dropTarget === notebook.id ? "is-drop-target" : ""} ${draggedFolder === notebook.id ? "is-dragging-folder" : ""}`}
                            data-notebook-drop={
                              notebook.kind !== "folder" ? notebook.id : undefined
                            }
                            style={notebook.kind === "folder" ? { touchAction: "none" } : undefined}
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                setDraggedFolder(null);
                                setDropTarget(null);
                              }
                              if (
                                event.key === " " &&
                                notebook.kind === "folder" &&
                                !selectionMode
                              ) {
                                event.preventDefault();
                                setDraggedFolder(notebook.id);
                              }
                            }}
                            onPointerDown={(event) => {
                              if (notebook.kind !== "folder" || selectionMode || event.button !== 0)
                                return;
                              drag.current = {
                                id: notebook.id,
                                x: event.clientX,
                                y: event.clientY,
                                moved: false,
                              };
                              event.currentTarget.setPointerCapture(event.pointerId);
                            }}
                            onPointerMove={(event) => {
                              const current = drag.current;
                              if (!current) return;
                              if (
                                Math.hypot(event.clientX - current.x, event.clientY - current.y) <
                                  8 &&
                                !current.moved
                              )
                                return;
                              current.moved = true;
                              setDragPosition({ x: event.clientX, y: event.clientY });
                              setDraggedFolder(current.id);
                              const target = document
                                .elementFromPoint(event.clientX, event.clientY)
                                ?.closest<HTMLElement>("[data-notebook-drop]");
                              setDropTarget(target?.dataset["notebookDrop"] ?? null);
                              const shelf = document
                                .elementFromPoint(event.clientX, event.clientY)
                                ?.closest(".notebook-shelf");
                              if (shelf) {
                                const bounds = shelf.getBoundingClientRect();
                                if (event.clientX > bounds.right - 45) shelf.scrollLeft += 24;
                                if (event.clientX < bounds.left + 45) shelf.scrollLeft -= 24;
                              }
                            }}
                            onPointerUp={(event) => {
                              const current = drag.current;
                              drag.current = null;
                              setDragPosition(null);
                              if (!current?.moved) return;
                              skipClick.current = current.id;
                              const target = document
                                .elementFromPoint(event.clientX, event.clientY)
                                ?.closest<HTMLElement>("[data-notebook-drop]")?.dataset[
                                "notebookDrop"
                              ];
                              if (target) moveFolder(current.id, target);
                              else {
                                setDraggedFolder(null);
                                setDropTarget(null);
                              }
                            }}
                            onPointerCancel={() => {
                              drag.current = null;
                              setDraggedFolder(null);
                              setDropTarget(null);
                            }}
                            type="button"
                            onClick={() => openNotebook(notebook)}
                            aria-label={`Abrir ${notebook.title}`}
                            aria-pressed={
                              selectionMode ? selectedNotebookIds.includes(notebook.id) : undefined
                            }
                            key={notebook.id}
                          >
                            {selectionMode && (
                              <span
                                className={`notebook-card__check ${selectedNotebookIds.includes(notebook.id) ? "is-selected" : ""}`}
                                aria-hidden="true"
                              >
                                {selectedNotebookIds.includes(notebook.id) ? "✓" : ""}
                              </span>
                            )}
                            {notebook.kind === "folder" ? (
                              <span className="annotation-folder" aria-hidden="true">
                                <span className="annotation-folder__back" />
                                {[0, 1, 2].map((index) => (
                                  <span
                                    key={index}
                                    className={`annotation-folder__paper annotation-folder__paper--${index}`}
                                  />
                                ))}
                                <span className="annotation-folder__front">
                                  <strong>{notebook.title}</strong>
                                  <small>ANOTAÇÕES</small>
                                </span>
                              </span>
                            ) : (
                              <NotebookArtwork
                                subjectColor={
                                  ["#7C3AED", "#22665F", "#A44050", "#315A83"][coverIndex] ??
                                  "#7C3AED"
                                }
                                title={notebook.title}
                                tabs={notebookPaperTabs(
                                  notebook,
                                  notebook.pageIds.flatMap(
                                    (id) => workspace.notes.find((note) => note.id === id) ?? [],
                                  ),
                                  workspace.subjects,
                                )}
                              />
                            )}
                            <span className="notebook-card__copy">
                              <strong>{notebook.title}</strong>
                              <small>
                                {notebook.pageIds.length}{" "}
                                {notebook.kind === "folder" ? "nota" : "folha"}
                                {notebook.pageIds.length === 1 ? "" : "s"}
                              </small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="notebook-shelf__rail" aria-hidden="true" />
                  </section>
                ))}
              </div>
            )}
          </section>
        </>
      ) : !activePage && activeNotebook.kind !== "folder" ? (
        <section className="notebook-entry-preview" aria-label="Preview do caderno">
          <h1>{activeNotebook.title}</h1>
          <p>
            {notebookPages.length}{" "}
            {notebookPages.length === 1 ? "folha guardada" : "folhas guardadas"}
          </p>
          {indexOpen && (
            <NotebookPageIndex
              pages={notebookPages}
              currentPageId=""
              onSelect={setActivePageId}
              onMove={movePage}
              onClose={() => setIndexOpen(false)}
            />
          )}
          <NotebookSpread
            key={activeNotebook.id}
            notebook={activeNotebook}
            pages={notebookPages}
            subjects={workspace.subjects}
            dispatch={dispatch}
            onOpen={openPreviewPage}
            transitioning={Boolean(journey)}
            onCreate={(subjectId) => addPage(true, subjectId)}
            onRemove={removePage}
            onBack={returnToShelf}
            onIndex={() => setIndexOpen(true)}
          />
        </section>
      ) : activePage ? (
        <>
          <header className="notebook-inner-heading">
            <button className="back-button" type="button" onClick={() => setActivePageId(null)}>
              <span aria-hidden="true">‹</span>{" "}
              {activePage.kind === "note" ? "Anotações" : "Folhas do caderno"}
            </button>
            <div>
              <span>{activeNotebook.title}</span>
            </div>
          </header>
          <section className="note-editor note-editor--page" aria-label="Editor de folha">
            <div className="note-editor__meta">
              <span>Suas anotações</span>
              <small>Salva automaticamente</small>
            </div>
            {activePage.kind !== "note" && (
              <Suspense fallback={<HelenaLoading label="Abrindo ferramentas…" compact />}>
                <NoteCaptureTools
                  key={activePage.id}
                  {...(cloud ? { cloud } : {})}
                  notebookPages={notebookPages}
                  autoOpen
                  onSelectPage={(id) => {
                    setEditingAssetId(null);
                    setActivePageId(id);
                  }}
                  onCreatePage={() => {
                    setEditingAssetId(null);
                    createPageAtEnd();
                  }}
                  onRemovePage={removePage}
                  onMovePage={movePage}
                  draftPageKey={activePage.id}
                  onSave={saveAsset}
                  onUpdate={updateAsset}
                  onImportPages={importPages}
                  editingAsset={editingAsset}
                  onCloseEditing={() => setEditingAssetId(null)}
                  onClosePage={() => {
                    setEditingAssetId(null);
                    setActivePageId(null);
                  }}
                />
              </Suspense>
            )}
            <input
              className="note-title-input"
              aria-label="Título da folha"
              value={activePage.title}
              onChange={(event) => updatePage(event.target.value, activePage.content)}
            />
            {(activePage.kind === "note" || activePage.content.length > 0) && (
              <textarea
                aria-label="Conteúdo da folha"
                value={activePage.content}
                onChange={(event) => updatePage(activePage.title, event.target.value)}
                placeholder={
                  activePage.kind === "note"
                    ? "Comece a escrever..."
                    : "Adicione uma descrição ou referência para esta folha..."
                }
              />
            )}
            {activePage.assets.length > 0 && (
              <section className="note-assets" aria-label="Imagens da folha">
                <h2>Imagens</h2>
                <div>
                  {activePage.assets.map((asset) => (
                    <figure key={asset.id}>
                      <img src={asset.dataUrl} alt={asset.name} />
                      <figcaption>
                        <span>
                          <strong>{asset.name}</strong>
                          <small>{asset.kind === "scan" ? "Digitalização" : "Escrita à mão"}</small>
                        </span>
                        {asset.kind === "drawing" && (
                          <button
                            type="button"
                            aria-label={`Abrir ${asset.name}`}
                            onClick={() => setEditingAssetId(asset.id)}
                          >
                            {asset.handwriting ? "Continuar escrita" : "Abrir folha"}
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Remover ${asset.name}`}
                          onClick={() =>
                            dispatch({
                              type: "note/asset-removed",
                              noteId: activePage.id,
                              assetId: asset.id,
                              updatedAt: new Date().toISOString(),
                            })
                          }
                        >
                          Remover
                        </button>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}
          </section>
        </>
      ) : (
        <>
          <header className="view-heading view-heading--with-action notebook-detail-heading">
            <div>
              <button
                className="back-button"
                type="button"
                onClick={() => setActiveNotebookId(null)}
              >
                <span aria-hidden="true">‹</span> Meus Cadernos
              </button>
              <h1>{activeNotebook.title}</h1>
              <p>
                {activeNotebook.kind === "folder"
                  ? "Suas ideias reunidas."
                  : "Abra uma folha ou comece uma nova."}
              </p>
            </div>
            <div className="notebook-detail-actions">
              {activeNotebook.kind === "folder" ? (
                <>
                  {activeNotebook.parentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNotebookId(activeNotebook.parentId ?? null);
                        setNotebookSection("notes");
                      }}
                    >
                      Abrir caderno
                    </button>
                  )}
                  <button className="secondary-button" type="button" onClick={createTextNote}>
                    <PaperActionIcon name="plus" /> <span>Nova nota</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!notebookPages.some((page) => page.assets[0])}
                    onClick={exportNotebookPdf}
                  >
                    <PaperActionIcon name="book" /> <span>Exportar PDF</span>
                  </button>
                  <button className="primary-button" type="button" onClick={createPage}>
                    <PaperActionIcon name="plus" /> <span>Nova folha</span>
                  </button>
                </>
              )}
            </div>
          </header>
          {activeNotebook.kind !== "folder" && (notebookNotes.length > 0 || folders.length > 0) && (
            <div className="notebook-section-tabs" role="tablist" aria-label="Conteúdo do caderno">
              <button
                type="button"
                role="tab"
                aria-selected={notebookSection === "pages"}
                onClick={() => setNotebookSection("pages")}
              >
                Folhas <small>{notebookPages.length}</small>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={notebookSection === "notes"}
                onClick={() => setNotebookSection("notes")}
              >
                Anotações <small>{notebookNotes.length + folders.length}</small>
              </button>
            </div>
          )}
          {notebookSection === "pages" ? (
            <section
              className="notebook-pages notebook-pages--opening"
              aria-label={`Folhas de ${activeNotebook.title}`}
            >
              {notebookPages.length === 0 ? (
                <div className="notebook-pages__empty">
                  <span className="paper-stack" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <h2>Este caderno ainda está em branco</h2>
                  <p>Crie uma folha para começar a escrever, digitalizar ou desenhar.</p>
                  <button className="primary-button" type="button" onClick={createPage}>
                    <PaperActionIcon name="plus" /> <span>Criar primeira folha</span>
                  </button>
                </div>
              ) : (
                <div className="notebook-bound-preview">
                  <button
                    type="button"
                    className="notebook-preview-book"
                    aria-label="Abrir caderno"
                    onClick={() => {
                      setActivePageId(notebookPages[previewPageIndex]?.id ?? notebookPages[0]!.id);
                    }}
                  >
                    <span className="notebook-preview-inside">
                      <strong>{activeNotebook.title}</strong>
                    </span>
                    <span className="notebook-preview-leaves">
                      <span className="notebook-preview-leaf">
                        <PreviewContent
                          page={notebookPages[previewPageIndex] ?? notebookPages[0]!}
                        />
                      </span>
                    </span>
                  </button>
                  <NotebookPageBook
                    pages={notebookPages}
                    currentPageId={notebookPages[previewPageIndex]?.id ?? notebookPages[0]!.id}
                    onSelect={(id) =>
                      setPreviewPageIndex(notebookPages.findIndex((page) => page.id === id))
                    }
                    onCreate={createPageAtEnd}
                  />
                </div>
              )}
            </section>
          ) : (
            <section
              className="notebook-text-notes"
              aria-label={`Notas de ${activeNotebook.title}`}
            >
              {folders.map((folder) => (
                <div key={folder.id}>
                  <button
                    className="text-note-card folder-link"
                    type="button"
                    key={folder.id}
                    onClick={() => openNotebook(folder)}
                  >
                    <strong>{folder.title}</strong>
                    <span>Pasta · {folder.pageIds.length} notas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "notebook/folder-moved", id: folder.id, parentId: null })
                    }
                  >
                    Devolver à vitrine
                  </button>
                </div>
              ))}
              {notebookNotes.length === 0 && folders.length === 0 ? (
                <div className="notebook-pages__empty">
                  <h2>Este caderno ainda não tem notas</h2>
                  <p>
                    {activeNotebook.kind === "folder"
                      ? "Crie uma nota para guardar ideias rápidas em texto."
                      : "Arraste uma pasta da vitrine para a capa deste caderno."}
                  </p>
                  {activeNotebook.kind === "folder" && (
                    <button className="primary-button" type="button" onClick={createTextNote}>
                      Criar primeira nota
                    </button>
                  )}
                </div>
              ) : (
                notebookNotes.map((note) => (
                  <button
                    className="text-note-card"
                    type="button"
                    key={note.id}
                    onClick={() => {
                      setNotebookSection("notes");
                      setActivePageId(note.id);
                    }}
                  >
                    <strong>{note.title || "Nota sem título"}</strong>
                    <span>{note.content || "Comece a escrever..."}</span>
                  </button>
                ))
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default NotesView;
