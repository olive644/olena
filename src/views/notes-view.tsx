import { NotebookPageBook } from "../components/notebook-page-book";
import { NotebookSearch } from "../components/notebook-search";
import { NotebookFolder } from "../components/notebook-folder";
import { useNotebookShelfDrag } from "../hooks/use-notebook-shelf-drag";
import { useNotebookCollaboration } from "../hooks/use-notebook-collaboration";
import { mergeNotebookPages, type NotebookCollabPage } from "../domain/notebook-collab";
import { NotebookPageIndex } from "../components/notebook-page-index";
import { NotebookPageThumbnail } from "../components/notebook-page-thumbnail";
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
        <NotebookPageThumbnail asset={page.assets[0]} />
      ) : (
        <p>{page.content || "Folha em branco"}</p>
      )}
      <strong>{page.title}</strong>
    </>
  );
}

type NotesViewProps = {
  initialJoinCode?: string;
  initialNotebookId?: string;
  cloud?: CloudSyncState;
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

function notebookTitle(workspace: WorkspaceState): string {
  const base = "Meu caderno";
  const matches = workspace.notebooks.filter((notebook) => notebook.title.startsWith(base)).length;
  return matches === 0 ? base : `${base} ${matches + 1}`;
}

export function NotesView({
  workspace,
  dispatch,
  cloud,
  initialJoinCode,
  initialNotebookId,
}: NotesViewProps) {
  const createDialog = useRef<HTMLDialogElement>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [openFolderIds, setOpenFolderIds] = useState<string[]>([]);
  const bookDrag = useNotebookShelfDrag(workspace.notebooks, (id, folderId) =>
    dispatch({ type: "notebook/stored", id, folderId }),
  );

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
  const [createFolder, setCreateFolder] = useState(false);
  const [folderShelf, setFolderShelf] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(
    initialNotebookId ?? null,
  );
  const [sharedNotebookId, setSharedNotebookId] = useState(initialNotebookId ?? "");
  const [sharedDocument, setSharedDocument] = useState<{
    pageId: string;
    document: HandwritingDocument;
    author?: string;
  }>();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [journey, setJourney] = useState<NotebookJourneyState | null>(null);
  const finishJourney = useCallback(() => setJourney(null), []);
  const [pageJourney, setPageJourney] = useState<NotebookPageJourneyState | null>(null);
  const finishPageJourney = useCallback(() => setPageJourney(null), []);
  function animatePageEntry(source: HTMLElement | null | undefined, blank = false) {
    const preview = document.querySelector<HTMLElement>(".notebook-entry-preview");
    if (!source || !preview || !canAnimateNotebook()) return;
    const { x, y, width, height } = preview.getBoundingClientRect();
    const paper = blank ? document.createElement("div") : (source.cloneNode(true) as HTMLElement);
    if (blank) {
      paper.className = "notebook-sheet-open";
      const sheet = document.createElement("div");
      sheet.className = "notebook-empty-paper";
      paper.append(sheet);
    }
    setPageJourney({
      from: source.getBoundingClientRect(),
      paper,
      background: { element: preview.cloneNode(true) as HTMLElement, x, y, width, height },
    });
  }
  function openPreviewPage(id: string) {
    if (journey || pageJourney) return;
    const source = Array.from(document.querySelectorAll<HTMLElement>(".notebook-sheet"))
      .find((sheet) => sheet.dataset["pageId"] === id)
      ?.querySelector<HTMLElement>(".notebook-sheet-open");
    animatePageEntry(source);
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
  const shelfItems = workspace.notebooks.filter(
    (item) => !item.parentId && item.kind !== "collection",
  );
  const collections = workspace.notebooks.filter((item) => item.kind === "collection");
  const shelfCount = Math.max(
    1,
    Math.ceil(shelfItems.length / 4),
    ...collections.map((item) => (item.shelf ?? 0) + 1),
  );
  const folderLimit = collections.filter((item) => (item.shelf ?? 0) === folderShelf).length >= 3;
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
  const collaborationNotebookId = activeNotebookId ?? sharedNotebookId;
  const collaborationBook = workspace.notebooks.find((book) => book.id === collaborationNotebookId);
  // Cópias recebidas por convite não reutilizam IDs de folhas de outro caderno local.
  const sharedPrefix = collaborationNotebookId.startsWith("shared-")
    ? `${collaborationNotebookId}:`
    : "";
  const remotePageId = (id: string) =>
    sharedPrefix && id.startsWith(sharedPrefix) ? id.slice(sharedPrefix.length) : id;
  const localPageId = (id: string) =>
    sharedPrefix && !collaborationBook?.pageIds.includes(id) ? `${sharedPrefix}${id}` : id;
  const sharedPages = (collaborationBook?.pageIds ?? []).flatMap((id) => {
    const page = workspace.notes.find((note) => note.id === id);
    const asset = page?.assets[0];
    const document: HandwritingDocument | undefined =
      page?.assets.find((item) => item.handwriting)?.handwriting ??
      (asset?.kind === "scan"
        ? {
            version: 1,
            paper: "blank",
            strokes: [],
            background: asset.dataUrl,
          }
        : undefined);
    return page
      ? [{ id: remotePageId(id), title: page.title, ...(document ? { document } : {}) }]
      : [];
  });
  const remoteIndexes = useRef(new Map<string, NotebookCollabPage[]>());
  const collaboration = useNotebookCollaboration({
    notebookId: collaborationNotebookId,
    ...(activePageId ? { pageId: remotePageId(activePageId) } : {}),
    pages: sharedPages,
    title: collaborationBook?.title ?? "Caderno compartilhado",
    onRemoteDocument: (document, author) => {
      if (activePageId)
        setSharedDocument({ pageId: activePageId, document, ...(author ? { author } : {}) });
    },
    onRoom: (room) => {
      const received =
        room.pages ??
        (room.document
          ? [{ id: `shared-${room.code}`, title: "Folha compartilhada", document: room.document }]
          : undefined);
      if (received) {
        const before = remoteIndexes.current.get(room.code);
        const next = before ? mergeNotebookPages(before, sharedPages, received) : received;
        remoteIndexes.current.set(room.code, received);
        dispatch({
          type: "notebook/shared-received",
          notebookId: collaborationNotebookId,
          pages: next.map((page) => ({ ...page, id: localPageId(page.id) })),
          ...(room.title ? { title: room.title } : {}),
          ...(activePageId ? { editingPageId: activePageId } : {}),
        });
      }
    },
  });
  const joinedRef = useRef(false);
  const joinNotebook = collaboration.join;
  useEffect(() => {
    if (!initialJoinCode || !cloud?.authenticated || joinedRef.current) return;
    joinedRef.current = true;
    void joinNotebook(initialJoinCode, cloud.displayName || cloud.email || "Participante");
  }, [initialJoinCode, cloud?.authenticated, cloud?.displayName, cloud?.email, joinNotebook]);
  const pageIndexSignature = JSON.stringify(sharedPages.map(({ id, title }) => ({ id, title })));
  const roomIndexSignature = JSON.stringify(
    collaboration.state.room?.pages?.map(({ id, title }) => ({ id, title })),
  );
  useEffect(() => {
    const base = collaboration.state.room?.pages;
    if (
      !base ||
      collaboration.state.status !== "online" ||
      !collaboration.state.code ||
      pageIndexSignature === roomIndexSignature
    )
      return;
    const timer = setTimeout(() => void collaboration.syncPages(sharedPages, base), 350);
    return () => clearTimeout(timer);
    // Documents have their own edit channel; only the index triggers this update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pageIndexSignature,
    roomIndexSignature,
    collaboration.state.code,
    collaboration.state.status,
    collaboration.syncPages,
  ]);

  function createNotebook() {
    if (createFolder && folderLimit) return;
    const id = createWorkspaceId("notebook");
    dispatch({
      type: "notebook/added",
      id,
      title: newNotebookName.trim() || (createFolder ? "Minha pasta" : notebookTitle(workspace)),
      ...(createFolder ? { kind: "collection" as const, shelf: folderShelf } : {}),
      subjectId: "",
      createdAt: new Date().toISOString(),
    });
    setActiveNotebookId(createFolder ? null : id);
    if (!createFolder) setSharedNotebookId(id);
    setNotebookSection("pages");
    createDialog.current?.close();
    setNewNotebookName("");
    setActivePageId(null);
  }

  function openNotebook(notebook: StudyNotebook) {
    if (bookDrag.consumeClick(notebook.id)) return;
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
    setSharedNotebookId(notebook.id);
    setActivePageId(null);
    setNotebookSection(notebook.kind === "folder" ? "notes" : "pages");
    setPreviewPageIndex(0);
  }

  function movePage(pageId: string, direction: -1 | 1) {
    if (!activeNotebook) return;
    dispatch({ type: "notebook/page-moved", notebookId: activeNotebook.id, pageId, direction });
  }

  // Arrastar a miniatura no índice: mesma troca de lugar, mas indo direto para o alvo.
  function reorderPage(pageId: string, toIndex: number) {
    if (!activeNotebook) return;
    dispatch({ type: "notebook/page-reordered", notebookId: activeNotebook.id, pageId, toIndex });
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
    if (!activeNotebook || journey || pageJourney) return;
    animatePageEntry(
      document.querySelector<HTMLElement>(".notebook-sheet-create") ??
        document.querySelector<HTMLElement>(".notebook-sheet:last-child .notebook-sheet-open") ??
        document.querySelector<HTMLElement>(".notebook-concept-cover .book-cover"),
      true,
    );
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
      {initialJoinCode && collaboration.state.error && (
        <div role="alert">
          <p>{collaboration.state.error}</p>
          {!collaboration.state.code && (
            <button
              type="button"
              onClick={() =>
                void joinNotebook(
                  initialJoinCode,
                  cloud?.displayName || cloud?.email || "Participante",
                )
              }
            >
              Tentar entrar novamente
            </button>
          )}
        </div>
      )}
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
          <h2>{createFolder ? "Nova pasta" : "Novo caderno"}</h2>
          <div className="notebook-detail-actions">
            <button
              type="button"
              aria-pressed={!createFolder}
              onClick={() => setCreateFolder(false)}
            >
              Caderno
            </button>
            <button type="button" aria-pressed={createFolder} onClick={() => setCreateFolder(true)}>
              Pasta
            </button>
          </div>
          {createFolder && (
            <label>
              Vitrine
              <select
                aria-label="Vitrine da pasta"
                value={folderShelf}
                onChange={(event) => setFolderShelf(Number(event.target.value))}
              >
                {Array.from({ length: shelfCount }, (_, index) => (
                  <option key={index} value={index}>
                    Coleção {index + 1}
                  </option>
                ))}
              </select>
              <small>
                {folderLimit
                  ? "Esta vitrine já tem 3 pastas."
                  : "Até 3 pastas por vitrine e 3 cadernos por pasta."}
              </small>
            </label>
          )}
          <label>
            Nome
            <input
              aria-label="Nome"
              value={newNotebookName}
              maxLength={80}
              placeholder={createFolder ? "Minha pasta" : "Meu caderno"}
              onChange={(event) => setNewNotebookName(event.target.value)}
            />
          </label>
          <div className="notebook-detail-actions">
            <button type="button" onClick={() => createDialog.current?.close()}>
              Cancelar
            </button>
            <button className="primary-button" type="submit" disabled={createFolder && folderLimit}>
              {createFolder ? "Criar pasta" : "Criar caderno"}
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
                        selectedNotebookIds.length === shelfItems.length + collections.length
                          ? []
                          : [...shelfItems, ...collections].map((notebook) => notebook.id),
                      )
                    }
                  >
                    {selectedNotebookIds.length === shelfItems.length + collections.length
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
            <span className="sr-only" role="status">
              {bookDrag.message}
            </span>
            {bookDrag.moving && (
              <div
                className="notebook-shelf-drag-ghost"
                aria-hidden="true"
                style={{ left: bookDrag.moving.x + 16, top: bookDrag.moving.y - 45 }}
              >
                <NotebookArtwork
                  subjectColor="#7c3aed"
                  title={
                    workspace.notebooks.find((book) => book.id === bookDrag.moving?.id)?.title ??
                    "Caderno"
                  }
                />
              </div>
            )}
            {workspace.notebooks.length === 0 ? (
              <div className="notebooks-empty">
                <NotebookArtwork subjectColor="#7C3AED" />
                <h2>Sua estante está pronta</h2>
                <p>Um lugar para suas ideias. Crie um caderno e preencha suas primeiras folhas.</p>
              </div>
            ) : (
              <div className="notebook-shelves">
                {Array.from({ length: shelfCount }, (_, shelfIndex) => (
                  <section
                    className="notebook-shelf notebook-shelf--objects"
                    key={shelfIndex}
                    aria-label={`Prateleira ${shelfIndex + 1}`}
                  >
                    <span className="notebook-shelf__label">
                      Coleção {String(shelfIndex + 1).padStart(2, "0")}
                    </span>
                    <div className="notebook-grid">
                      {collections
                        .filter((folder) => (folder.shelf ?? 0) === shelfIndex)
                        .map((folder) => (
                          <NotebookFolder
                            key={folder.id}
                            folder={folder}
                            notebooks={workspace.notebooks}
                            onOpen={openNotebook}
                            open={openFolderIds.includes(folder.id)}
                            selectionMode={selectionMode}
                            selected={selectedNotebookIds.includes(folder.id)}
                            onToggle={() =>
                              selectionMode
                                ? openNotebook(folder)
                                : setOpenFolderIds((ids) =>
                                    ids.includes(folder.id)
                                      ? ids.filter((id) => id !== folder.id)
                                      : [...ids, folder.id],
                                  )
                            }
                            drag={bookDrag}
                          />
                        ))}
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
                            {...(!notebook.kind && !selectionMode
                              ? bookDrag.handlers(notebook.id)
                              : {})}
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
                                participants={
                                  notebook.id === collaborationNotebookId
                                    ? (collaboration.state.room?.participants ?? [])
                                    : []
                                }
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
                      <div className="notebook-shelf__rail" aria-hidden="true" />
                    </div>
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
              onReorder={reorderPage}
              onClose={() => setIndexOpen(false)}
            />
          )}
          <NotebookSpread
            participants={collaboration.state.room?.participants ?? []}
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
                  sharedCollaboration={collaboration}
                  {...(sharedDocument?.pageId === activePage.id
                    ? {
                        sharedDocument: sharedDocument.document,
                        sharedAuthor: sharedDocument.author ?? "",
                      }
                    : {})}
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
                    finishPageJourney();
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
                    onMove={movePage}
                    onReorder={reorderPage}
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
