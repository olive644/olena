import { uiText, useLanguage } from "../i18n/runtime";
import { saveStudentResume } from "../data/student-resume";
import { NotebookPageBook } from "../components/notebook-page-book";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { notebookShelves, SHELF_CAPACITY } from "../domain/notebook-shelves";
import { PaperObjectIcon } from "../components/paper-object-icon";
import { NotebookSearch } from "../components/notebook-search";
import { NotebookFolder } from "../components/notebook-folder";
import { TextNoteEditor, TextNotePreview } from "../components/text-note";
import { NoteFlashcardTools } from "../components/library-links";
import { useNotebookShelfDrag } from "../hooks/use-notebook-shelf-drag";
import { useNotebookCollaboration } from "../hooks/use-notebook-collaboration";
import { mergeNotebookPages, type NotebookCollabPage } from "../domain/notebook-collab";
import {
  closeNotebook3d,
  notebook3dCoverRect,
  prefetchNotebook3d,
  useNotebook3d,
} from "../components/notebook-3d/notebook-3d-support";
import { NotebookPageIndex } from "../components/notebook-page-index";
import { NotebookFolderMovePicker } from "../components/notebook-folder-move-picker";
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
import { brandedExportCanvas, loadPaperExportMascot } from "../data/paper-export-art";
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
  useLanguage();

  return (
    <>
      {page.assets[0] ? (
        <NotebookPageThumbnail asset={page.assets[0]} />
      ) : (
        <p>{page.content || uiText(743)}</p>
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
  const base = uiText(1974);
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
  useLanguage();

  const createDialog = useRef<HTMLDialogElement>(null);
  const [createDialogVersion, setCreateDialogVersion] = useState(0);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [openFolderIds, setOpenFolderIds] = useState<string[]>(() => {
    const id = new URLSearchParams(window.location.search).get("pasta");
    return id && workspace.notebooks.some((item) => item.id === id && item.kind === "collection")
      ? [id]
      : [];
  });
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
      uiText(1975, [workspace.notebooks.find((item) => item.id === target)?.title ?? "caderno"]),
    );
    setDraggedFolder(null);
    setDropTarget(null);
  }
  const [newNotebookName, setNewNotebookName] = useState("");
  const [createFolder, setCreateFolder] = useState(false);
  const [createNote, setCreateNote] = useState(false);
  const [folderShelf, setFolderShelf] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([]);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(
    initialNotebookId ??
      new URLSearchParams(window.location.search).get("caderno")?.slice(0, 160) ??
      null,
  );
  const [sharedNotebookId, setSharedNotebookId] = useState(initialNotebookId ?? "");
  const [sharedDocument, setSharedDocument] = useState<{
    pageId: string;
    document: HandwritingDocument;
    author?: string;
  }>();
  const [activePageId, setActivePageId] = useState<string | null>(() => {
    const id = new URLSearchParams(window.location.search).get("folha")?.slice(0, 160);
    return id &&
      workspace.notebooks.find((book) => book.id === activeNotebookId)?.pageIds.includes(id) &&
      workspace.notes.some((page) => page.id === id)
      ? id
      : null;
  });
  const [indexOpen, setIndexOpen] = useState(false);
  const notebook3d = useNotebook3d();
  const onShelf = !activeNotebookId;
  useEffect(() => {
    if (!notebook3d || !onShelf) return;
    const timer = window.setTimeout(() => prefetchNotebook3d(), 1500);
    return () => window.clearTimeout(timer);
  }, [notebook3d, onShelf]);
  // Ao sair de uma folha, o caderno reabre nela (o 3D faz a folha voltar para o lugar).
  const [returnedPageId, setReturnedPageId] = useState<string>();
  const [pageJump, setPageJump] = useState<{ pageId: string; nonce: number }>();
  const resumeNotebookId = workspace.notebooks.find(
    (book) =>
      book.id === activeNotebookId &&
      book.kind !== "folder" &&
      book.kind !== "collection" &&
      book.kind !== "note",
  )?.id;
  useEffect(() => {
    if (resumeNotebookId)
      saveStudentResume({
        notebook: {
          id: resumeNotebookId,
          ...(activePageId ? { page: activePageId } : {}),
          at: Date.now(),
        },
      });
  }, [resumeNotebookId, activePageId]);
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
    const background = preview.cloneNode(true) as HTMLElement;
    // Canvas copiado sai em branco: o caderno 3D deixa uma foto do quadro para o fundo.
    for (const scene of background.querySelectorAll<HTMLCanvasElement>("canvas[data-snapshot]")) {
      const photo = document.createElement("img");
      photo.src = scene.dataset["snapshot"] ?? "";
      photo.className = scene.className;
      scene.replaceWith(photo);
    }
    setPageJourney({
      from: source.getBoundingClientRect(),
      paper,
      background: { element: background, x, y, width, height },
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
  const [notebookSection, setNotebookSection] = useState<"pages" | "notes">(() =>
    workspace.notebooks.find((item) => item.id === activeNotebookId)?.kind === "folder"
      ? "notes"
      : "pages",
  );

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
  const shelves = notebookShelves(workspace.notebooks);
  const shelfCount = shelves.length;
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
    title: collaborationBook?.title ?? uiText(1332),
    onRemoteDocument: (document, author) => {
      if (activePageId)
        setSharedDocument({ pageId: activePageId, document, ...(author ? { author } : {}) });
    },
    onRoom: (room) => {
      const received =
        room.pages ??
        (room.document
          ? [{ id: `shared-${room.code}`, title: uiText(1976), document: room.document }]
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
    void joinNotebook(initialJoinCode, cloud.displayName || cloud.email || uiText(2299));
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
      title:
        newNotebookName.trim() ||
        (createFolder ? uiText(1977) : createNote ? uiText(1044) : notebookTitle(workspace)),
      ...(createFolder ? { kind: "collection" as const, shelf: folderShelf } : {}),
      ...(createNote ? { kind: "note" as const } : {}),
      subjectId: "",
      createdAt: new Date().toISOString(),
    });
    if (createNote) {
      dispatch({
        type: "note/added",
        id: createWorkspaceId("note"),
        notebookId: id,
        subjectId: "",
        kind: "note",
        updatedAt: new Date().toISOString(),
      });
    }
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
    if (notebook.kind !== "note" && cover && canAnimateNotebook())
      setJourney({
        notebook,
        returning: false,
        from: cover.getBoundingClientRect(),
        tabs: notebookPaperTabs(notebook, workspace.notes, workspace.subjects),
      });
    setActiveNotebookId(notebook.id);
    setSharedNotebookId(notebook.id);
    setActivePageId(null);
    setReturnedPageId(undefined);
    setPageJump(undefined);
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

  // Favoritar no índice: junta ou tira da lista de folhas favoritas do caderno.
  function toggleFavoritePage(pageId: string) {
    if (!activeNotebook) return;
    const current = activeNotebook.bookmarkedPageIds ?? [];
    const bookmarkedPageIds = current.includes(pageId)
      ? current.filter((id) => id !== pageId)
      : [...current, pageId];
    dispatch({
      type: "notebook/organized",
      id: activeNotebook.id,
      changes: { bookmarkedPageIds },
    });
  }

  function returnToShelf() {
    if (journey) return;
    const scene3d = document.querySelector<HTMLElement>("[data-notebook-3d] .notebook-3d");
    if (activeNotebook && scene3d && canAnimateNotebook()) {
      const notebook = activeNotebook;
      const tabs = notebookPaperTabs(notebook, notebookPages, workspace.subjects);
      setIndexOpen(false);
      // O caderno 3D folheia até a capa e fecha; a capa fechada é que viaja até a estante.
      void closeNotebook3d().then((rect) => {
        setJourney({
          notebook,
          returning: true,
          closed: true,
          tabs,
          from: rect ?? notebook3dCoverRect(scene3d),
        });
        setActiveNotebookId(null);
      });
      return;
    }
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

  // Alternativa por teclado a arrastar um caderno para dentro de uma pasta: move a seleção
  // inteira de uma vez, respeitando o limite de três itens por pasta que o arrastar já respeita.
  function moveSelectedNotebooksToFolder(folderId: string | null) {
    const eligible = selectedNotebookIds.filter((id) => {
      const item = workspace.notebooks.find((notebook) => notebook.id === id);
      return item && (!item.kind || item.kind === "note");
    });
    if (eligible.length === 0) return;
    setSelectedNotebookIds([]);
    setSelectionMode(false);
    if (!folderId) {
      eligible.forEach((id) => dispatch({ type: "notebook/stored", id, folderId: null }));
      setMoveMessage(eligible.length === 1 ? uiText(1341) : uiText(1978, [eligible.length]));
      return;
    }
    const folder = workspace.notebooks.find((notebook) => notebook.id === folderId);
    const already = workspace.notebooks.filter(
      (item) => item.parentId === folderId && !eligible.includes(item.id),
    ).length;
    const capacity = Math.max(0, 3 - already);
    const toMove = eligible.slice(0, capacity);
    toMove.forEach((id) => dispatch({ type: "notebook/stored", id, folderId }));
    if (toMove.length === 0) {
      setMoveMessage(uiText(1979, [folder?.title ?? ""]));
    } else if (toMove.length < eligible.length) {
      setMoveMessage(uiText(1980, [toMove.length, eligible.length, folder?.title ?? "a pasta"]));
    } else {
      setMoveMessage(
        toMove.length === 1
          ? uiText(1981, [folder?.title ?? "a pasta"])
          : uiText(1982, [toMove.length, folder?.title ?? "a pasta"]),
      );
    }
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
        title: uiText(1983, [index + 1]),
        content: "",
        updatedAt: createdAt,
      });
      dispatch({
        type: "note/asset-added",
        noteId: id,
        kind: "drawing",
        name: uiText(1983, [index + 1]),
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
      .map((page) => ({ title: page.title || uiText(2068), image: page.assets[0]?.dataUrl }))
      .filter((page): page is { title: string; image: string } => Boolean(page.image));
    if (pages.length === 0) {
      setMoveMessage(uiText(1342));
      return;
    }
    const printWindow = openPrintWindow();
    if (!printWindow) {
      setMoveMessage(uiText(1343));
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
    printWindow.document.title = activeNotebook?.title ?? uiText(100);
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
    )
      .then(async () => {
        const mascot = await loadPaperExportMascot();
        for (const image of images) {
          if (!image.naturalWidth) throw new Error(uiText(1344));
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          if (!context) throw new Error(uiText(1345));
          context.drawImage(image, 0, 0);
          image.src = brandedExportCanvas(canvas, mascot).toDataURL("image/png");
          await image.decode();
        }
        printWindow.focus();
        printWindow.print();
      })
      .catch((caught) => {
        printWindow.close();
        setMoveMessage(caught instanceof Error ? caught.message : uiText(1346));
      });
  }

  return (
    <main
      className="main-content notebooks-main"
      id="main-content"
      aria-busy={Boolean(journey)}
      data-notebook-open={Boolean(activeNotebookId)}
    >
      {journey && <NotebookJourney journey={journey} onDone={finishJourney} />}
      {pageJourney && <NotebookPageJourney journey={pageJourney} onDone={finishPageJourney} />}
      <PageHeader />
      {(() => {
        const note = workspace.notes.find(
          (item) =>
            item.id ===
            (activePage?.id ?? (activeNotebook?.kind === "note" ? activeNotebook.pageIds[0] : "")),
        );
        return note ? (
          <NoteFlashcardTools key={note.id} note={note} workspace={workspace} dispatch={dispatch} />
        ) : null;
      })()}
      {initialJoinCode && collaboration.state.error && (
        <div role="alert">
          <p>{collaboration.state.error}</p>
          {!collaboration.state.code && (
            <button
              type="button"
              onClick={() =>
                void joinNotebook(
                  initialJoinCode,
                  cloud?.displayName || cloud?.email || uiText(2299),
                )
              }
            >
              {uiText(1347)}
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
        {draggedFolder ? uiText(1984) : moveMessage}
      </p>
      <dialog
        key={createDialogVersion}
        ref={createDialog}
        className="notebook-create-dialog"
        aria-label={uiText(1348)}
      >
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            createNotebook();
          }}
        >
          <h2>{createFolder ? uiText(1985) : createNote ? uiText(1986) : uiText(1987)}</h2>
          <div className="paper-choice-row" role="group" aria-label={uiText(1349)}>
            <button
              type="button"
              aria-label={uiText(100)}
              title={uiText(1350)}
              aria-pressed={!createFolder && !createNote}
              onClick={() => {
                setCreateFolder(false);
                setCreateNote(false);
              }}
            >
              <PaperObjectIcon name="notebook" />
              <span>{uiText(100)}</span>
            </button>
            <button
              type="button"
              aria-label={uiText(1351)}
              title={uiText(1352)}
              aria-pressed={createNote}
              onClick={() => {
                setCreateFolder(false);
                setCreateNote(true);
              }}
            >
              <PaperObjectIcon name="note" />
              <span>{uiText(1351)}</span>
            </button>
            <button
              type="button"
              aria-label={uiText(1353)}
              title={uiText(1354)}
              aria-pressed={createFolder}
              onClick={() => {
                setCreateFolder(true);
                setCreateNote(false);
              }}
            >
              <PaperObjectIcon name="folder" />
              <span>{uiText(1353)}</span>
            </button>
          </div>
          {createNote && <p>{uiText(1355)}</p>}
          {createFolder && (
            <label>
              {uiText(1356)}
              <select
                aria-label={uiText(1357)}
                value={folderShelf}
                onChange={(event) => setFolderShelf(Number(event.target.value))}
              >
                {Array.from({ length: shelfCount + 1 }, (_, index) => (
                  <option key={index} value={index}>
                    {index === shelfCount ? uiText(1988) : uiText(1989, [index + 1])}
                  </option>
                ))}
              </select>
              <small>{folderLimit ? uiText(1358) : uiText(1359)}</small>
            </label>
          )}
          <label>
            {uiText(713)}
            <input
              aria-label={uiText(713)}
              value={newNotebookName}
              maxLength={80}
              placeholder={createFolder ? uiText(1977) : createNote ? uiText(1044) : uiText(1974)}
              onChange={(event) => setNewNotebookName(event.target.value)}
            />
          </label>
          <div className="notebook-detail-actions">
            <button
              type="button"
              onClick={() => {
                createDialog.current?.close();
                setCreateDialogVersion((version) => version + 1);
              }}
            >
              {uiText(155)}
            </button>
            <button className="primary-button" type="submit" disabled={createFolder && folderLimit}>
              {createFolder ? uiText(1354) : createNote ? uiText(1352) : uiText(1350)}
            </button>
          </div>
        </form>
      </dialog>

      {!activeNotebook ? (
        <>
          <header className="view-heading view-heading--with-action notebooks-heading">
            <div>
              <h1>{uiText(1360)}</h1>
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
                  {selectionMode ? uiText(1361) : uiText(359)}
                </button>
              )}
              <button
                className="primary-button"
                type="button"
                onClick={() => createDialog.current?.showModal()}
              >
                <PaperActionIcon name="plus" /> <span>{uiText(1348)}</span>
              </button>
              {selectionMode && (
                <div className="notebook-selection-actions" role="group" aria-label={uiText(1362)}>
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
                      ? uiText(1990)
                      : uiText(199)}
                  </button>
                  <button
                    type="button"
                    disabled={selectedNotebookIds.length === 0}
                    onClick={() => setFolderPickerOpen(true)}
                  >
                    {uiText(689)}{" "}
                    {selectedNotebookIds.length > 0 ? `(${selectedNotebookIds.length})` : ""}
                  </button>
                  <button
                    type="button"
                    disabled={selectedNotebookIds.length === 0}
                    onClick={removeSelectedNotebooks}
                  >
                    {uiText(1363)}{" "}
                    {selectedNotebookIds.length > 0 ? `(${selectedNotebookIds.length})` : ""}
                  </button>
                </div>
              )}
              {folderPickerOpen && (
                <NotebookFolderMovePicker
                  count={selectedNotebookIds.length}
                  folders={collections}
                  onMove={moveSelectedNotebooksToFolder}
                  onClose={() => setFolderPickerOpen(false)}
                />
              )}
            </div>
          </header>

          {workspace.notebooks.length > 0 && (
            <NotebookSearch workspace={workspace} onOpen={openSearchHit} />
          )}

          <section className="notebooks-showcase" aria-label={uiText(1364)}>
            <span className="sr-only" role="status">
              {bookDrag.message}
            </span>
            {bookDrag.moving && (
              <div
                className="notebook-shelf-drag-ghost"
                aria-hidden="true"
                style={{ left: bookDrag.moving.x + 16, top: bookDrag.moving.y - 45 }}
              >
                {workspace.notebooks.find((book) => book.id === bookDrag.moving?.id)?.kind ===
                "note" ? (
                  <TextNotePreview
                    title={
                      workspace.notebooks.find((book) => book.id === bookDrag.moving?.id)?.title ??
                      uiText(1351)
                    }
                  />
                ) : (
                  <NotebookArtwork
                    subjectColor="#7c3aed"
                    title={
                      workspace.notebooks.find((book) => book.id === bookDrag.moving?.id)?.title ??
                      uiText(100)
                    }
                  />
                )}
              </div>
            )}
            {workspace.notebooks.length === 0 ? (
              <div className="notebooks-empty">
                <NotebookArtwork subjectColor="#7C3AED" />
                <h2>{uiText(1365)}</h2>
                <p>{uiText(1366)}</p>
              </div>
            ) : (
              <div className="notebook-shelves">
                {Array.from({ length: shelfCount }, (_, shelfIndex) => (
                  <section
                    className="notebook-shelf notebook-shelf--objects"
                    key={shelfIndex}
                    aria-label={uiText(1991, [shelfIndex + 1])}
                  >
                    <span className="notebook-shelf__label">
                      {uiText(1367)} {String(shelfIndex + 1).padStart(2, "0")}
                      <small>
                        {shelves[shelfIndex]!.length}/{SHELF_CAPACITY} {uiText(1368)}
                      </small>
                    </span>
                    <div className="notebook-grid">
                      {shelves[shelfIndex]!.filter((folder) => folder.kind === "collection").map(
                        (folder) => (
                          <NotebookFolder
                            key={folder.id}
                            folder={folder}
                            notebooks={workspace.notebooks}
                            pages={workspace.notes}
                            subjects={workspace.subjects}
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
                        ),
                      )}
                      {shelves[shelfIndex]!.filter((item) => item.kind !== "collection").map(
                        (notebook) => {
                          const coverIndex =
                            [...notebook.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
                          return (
                            <button
                              className={`notebook-card ${dropTarget === notebook.id ? "is-drop-target" : ""} ${draggedFolder === notebook.id ? "is-dragging-folder" : ""}`}
                              data-notebook-drop={
                                notebook.kind !== "folder" ? notebook.id : undefined
                              }
                              style={
                                notebook.kind === "folder" ? { touchAction: "none" } : undefined
                              }
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
                                if (
                                  notebook.kind !== "folder" ||
                                  selectionMode ||
                                  event.button !== 0
                                )
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
                              {...((!notebook.kind || notebook.kind === "note") && !selectionMode
                                ? bookDrag.handlers(notebook.id)
                                : {})}
                              type="button"
                              onClick={() => openNotebook(notebook)}
                              aria-label={uiText(1813, [notebook.title])}
                              aria-pressed={
                                selectionMode
                                  ? selectedNotebookIds.includes(notebook.id)
                                  : undefined
                              }
                              key={notebook.id}
                            >
                              {selectionMode && (
                                <span
                                  className={`notebook-card__check ${selectedNotebookIds.includes(notebook.id) ? "is-selected" : ""}`}
                                  aria-hidden="true"
                                >
                                  {selectedNotebookIds.includes(notebook.id) ? (
                                    <PaperCheckIcon />
                                  ) : null}
                                </span>
                              )}
                              {notebook.kind === "note" ? (
                                <TextNotePreview
                                  title={notebook.title}
                                  content={
                                    workspace.notes.find((note) => note.id === notebook.pageIds[0])
                                      ?.content ?? ""
                                  }
                                />
                              ) : notebook.kind === "folder" ? (
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
                                    <small>{uiText(1369)}</small>
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
                                  {notebook.kind === "note" ? uiText(1992) : ""}
                                  {notebook.pageIds.length}{" "}
                                  {notebook.kind === "folder" ? uiText(2592) : uiText(1817)}
                                  {notebook.pageIds.length === 1 ? "" : "s"}
                                </small>
                              </span>
                            </button>
                          );
                        },
                      )}
                      <div className="notebook-shelf__rail" aria-hidden="true" />
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        </>
      ) : activeNotebook.kind === "note" ? (
        <TextNoteEditor
          notebook={activeNotebook}
          note={workspace.notes.find((note) => note.id === activeNotebook.pageIds[0])}
          onBack={returnToShelf}
          onTitle={(title) =>
            dispatch({ type: "notebook/organized", id: activeNotebook.id, changes: { title } })
          }
          onContent={(content) => {
            const note = workspace.notes.find((item) => item.id === activeNotebook.pageIds[0]);
            if (!note) return;
            dispatch({
              type: "note/updated",
              id: note.id,
              title: activeNotebook.title,
              content,
              updatedAt: new Date().toISOString(),
            });
          }}
        />
      ) : !activePage && activeNotebook.kind !== "folder" ? (
        <section className="notebook-entry-preview" aria-label={uiText(1370)}>
          <div className={`notebook-preview-heading${notebook3d ? " is-3d" : ""}`}>
            <button
              type="button"
              className="notebook-paper-tool notebook-back-tool"
              aria-label={uiText(1360)}
              title={uiText(1371)}
              disabled={Boolean(journey)}
              onClick={returnToShelf}
            >
              <img src="/paper-arrow.svg" alt="" />
            </button>
            {/* No 3D o nome do caderno está na capa; o título fica só para leitores de tela. */}
            <h1 className={notebook3d ? "visually-hidden" : undefined}>{activeNotebook.title}</h1>
          </div>
          <p>
            {notebookPages.length} {notebookPages.length === 1 ? uiText(1993) : uiText(1994)}
          </p>
          {indexOpen && (
            <NotebookPageIndex
              pages={notebookPages}
              currentPageId=""
              onSelect={(pageId) => {
                // No 3D o caderno folheia até a folha; na vitrine 2D a folha abre direto, como antes.
                if (!notebook3d) return setActivePageId(pageId);
                setIndexOpen(false);
                setPageJump((current) => ({ pageId, nonce: (current?.nonce ?? 0) + 1 }));
              }}
              onMove={movePage}
              onReorder={reorderPage}
              favoritePageIds={activeNotebook.bookmarkedPageIds ?? []}
              onToggleFavorite={toggleFavoritePage}
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
            onOpen={(pageId) => {
              setPageJump(undefined);
              setReturnedPageId(undefined);
              openPreviewPage(pageId);
            }}
            // Só o caderno 3D reabre na dupla da folha de onde a pessoa saiu; a vitrine 2D segue como era.
            initialPageId={notebook3d ? returnedPageId : undefined}
            returningFromPageId={returnedPageId}
            jump={pageJump}
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
            <button
              className="back-button"
              type="button"
              onClick={() => {
                setReturnedPageId(activePage.id);
                setActivePageId(null);
              }}
            >
              <span aria-hidden="true">‹</span>{" "}
              {activePage.kind === "note" ? uiText(1372) : uiText(1995)}
            </button>
            <div>
              <span>{activeNotebook.title}</span>
            </div>
          </header>
          <section className="note-editor note-editor--page" aria-label={uiText(1373)}>
            <div className="note-editor__meta">
              <span>{uiText(1374)}</span>
              <small>{uiText(1375)}</small>
            </div>
            {activePage.kind !== "note" && (
              <Suspense fallback={<HelenaLoading label={uiText(1376)} compact />}>
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
                    setReturnedPageId(activePage.id);
                    setActivePageId(null);
                  }}
                />
              </Suspense>
            )}
            <input
              className="note-title-input"
              aria-label={uiText(1377)}
              value={activePage.title}
              onChange={(event) => updatePage(event.target.value, activePage.content)}
            />
            {(activePage.kind === "note" || activePage.content.length > 0) && (
              <textarea
                aria-label={uiText(1378)}
                value={activePage.content}
                onChange={(event) => updatePage(activePage.title, event.target.value)}
                placeholder={activePage.kind === "note" ? uiText(1046) : uiText(1379)}
              />
            )}
            {activePage.assets.length > 0 && (
              <section className="note-assets" aria-label={uiText(1380)}>
                <h2>{uiText(262)}</h2>
                <div>
                  {activePage.assets.map((asset) => (
                    <figure key={asset.id}>
                      <img src={asset.dataUrl} alt={asset.name} />
                      <figcaption>
                        <span>
                          <strong>{asset.name}</strong>
                          <small>{asset.kind === "scan" ? uiText(1381) : uiText(1382)}</small>
                        </span>
                        {asset.kind === "drawing" && (
                          <button
                            type="button"
                            aria-label={uiText(1813, [asset.name])}
                            onClick={() => setEditingAssetId(asset.id)}
                          >
                            {asset.handwriting ? uiText(1996) : uiText(1383)}
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={uiText(1756, [asset.name])}
                          onClick={() =>
                            dispatch({
                              type: "note/asset-removed",
                              noteId: activePage.id,
                              assetId: asset.id,
                              updatedAt: new Date().toISOString(),
                            })
                          }
                        >
                          {uiText(44)}
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
                <span aria-hidden="true">‹</span> {uiText(1360)}
              </button>
              <h1>{activeNotebook.title}</h1>
              <p>{activeNotebook.kind === "folder" ? uiText(1997) : uiText(1998)}</p>
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
                      {uiText(1384)}
                    </button>
                  )}
                  <button className="secondary-button" type="button" onClick={createTextNote}>
                    <PaperActionIcon name="plus" /> <span>{uiText(1385)}</span>
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
                    <PaperActionIcon name="book" /> <span>{uiText(1386)}</span>
                  </button>
                  <button className="primary-button" type="button" onClick={createPage}>
                    <PaperActionIcon name="plus" /> <span>{uiText(746)}</span>
                  </button>
                </>
              )}
            </div>
          </header>
          {activeNotebook.kind !== "folder" && (notebookNotes.length > 0 || folders.length > 0) && (
            <div className="notebook-section-tabs" role="tablist" aria-label={uiText(1387)}>
              <button
                type="button"
                role="tab"
                aria-selected={notebookSection === "pages"}
                onClick={() => setNotebookSection("pages")}
              >
                {uiText(1388)} <small>{notebookPages.length}</small>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={notebookSection === "notes"}
                onClick={() => setNotebookSection("notes")}
              >
                {uiText(1372)} <small>{notebookNotes.length + folders.length}</small>
              </button>
            </div>
          )}
          {notebookSection === "pages" ? (
            <section
              className="notebook-pages notebook-pages--opening"
              aria-label={uiText(1999, [activeNotebook.title])}
            >
              {notebookPages.length === 0 ? (
                <div className="notebook-pages__empty">
                  <span className="paper-stack" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <h2>{uiText(1389)}</h2>
                  <p>{uiText(1390)}</p>
                  <button className="primary-button" type="button" onClick={createPage}>
                    <PaperActionIcon name="plus" /> <span>{uiText(1391)}</span>
                  </button>
                </div>
              ) : (
                <div className="notebook-bound-preview">
                  <button
                    type="button"
                    className="notebook-preview-book"
                    aria-label={uiText(1384)}
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
                    favoritePageIds={activeNotebook.bookmarkedPageIds ?? []}
                    onToggleFavorite={toggleFavoritePage}
                  />
                </div>
              )}
            </section>
          ) : (
            <section
              className="notebook-text-notes"
              aria-label={uiText(2000, [activeNotebook.title])}
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
                    <span>
                      {uiText(1392)} {folder.pageIds.length} {uiText(1393)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "notebook/folder-moved", id: folder.id, parentId: null })
                    }
                  >
                    {uiText(1394)}
                  </button>
                </div>
              ))}
              {notebookNotes.length === 0 && folders.length === 0 ? (
                <div className="notebook-pages__empty">
                  <h2>{uiText(1395)}</h2>
                  <p>{activeNotebook.kind === "folder" ? uiText(1396) : uiText(1397)}</p>
                  {activeNotebook.kind === "folder" && (
                    <button className="primary-button" type="button" onClick={createTextNote}>
                      {uiText(1398)}
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
                    <strong>{note.title || uiText(2280)}</strong>
                    <span>{note.content || uiText(1046)}</span>
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
