import { NotebookShelf } from "../components/notebook-shelf";
import { uiText, useLanguage } from "../i18n/runtime";
import { saveStudentResume } from "../data/student-resume";
import { NotebookPageBook } from "../components/notebook-page-book";
import { TextNoteEditor } from "../components/text-note";
import { NoteFlashcardTools } from "../components/library-links";
import { useNotebookCollaboration } from "../hooks/use-notebook-collaboration";
import { mergeNotebookPages, type NotebookCollabPage } from "../domain/notebook-collab";
import { NotebookPageIndex } from "../components/notebook-page-index";
import { NotebookPageThumbnail } from "../components/notebook-page-thumbnail";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type Dispatch } from "react";
import {
  NotebookJourney,
  canAnimateNotebook,
  notebookShelfCover,
  notebookShelfPose,
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
import type { ImportedPage } from "../components/page-import";
import type { HandwritingDocument } from "../domain/handwriting";
import { openPrintWindow } from "../data/print-window";
import { brandedExportCanvas, loadPaperExportMascot } from "../data/paper-export-art";
import "./notebook-shelf.css";
import type { CloudSyncState } from "../hooks/use-cloud-sync";
import {
  createWorkspaceId,
  type StudyNotebook,
  type StudyNote,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";

const NOTEBOOK_LIMIT = 5;

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
  const [moveMessage, setMoveMessage] = useState("");
  const [newNotebookName, setNewNotebookName] = useState("");
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
  const shelfItems = workspace.notebooks.filter((item) => !item.kind);
  const canCreateNotebook = shelfItems.length < NOTEBOOK_LIMIT;
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
    if (!canCreateNotebook) return;
    const id = createWorkspaceId("notebook");
    dispatch({
      type: "notebook/added",
      id,
      title: newNotebookName.trim() || notebookTitle(workspace),
      subjectId: "",
      createdAt: new Date().toISOString(),
    });
    setNotebookSection("pages");
    createDialog.current?.close();
    setNewNotebookName("");
    setActivePageId(null);
  }

  function openNotebook(notebook: StudyNotebook) {
    const cover = notebookShelfCover(notebook.id);
    if (notebook.kind !== "note" && cover && canAnimateNotebook()) {
      const pose = notebookShelfPose(cover);
      setJourney({
        notebook,
        returning: false,
        from: pose.rect,
        shelfAngle: pose.angle,
        tabs: notebookPaperTabs(notebook, workspace.notes, workspace.subjects),
      });
    }
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
      <PageHeader showUpdates={false} />
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
      <p className="shelf-move-status" role="status">
        {moveMessage}
      </p>
      <dialog
        key={createDialogVersion}
        ref={createDialog}
        className="notebook-create-dialog shelf-wood-dialog"
        aria-label={uiText(1348)}
      >
        <form
          method="dialog"
          onSubmit={(event) => {
            event.preventDefault();
            createNotebook();
          }}
        >
          <h2 tabIndex={-1}>{uiText(1987)}</h2>
          <label>
            {uiText(713)}
            <input
              aria-label={uiText(713)}
              value={newNotebookName}
              maxLength={80}
              placeholder={uiText(1974)}
              onChange={(event) => setNewNotebookName(event.target.value)}
            />
          </label>
          <div className="notebook-detail-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                createDialog.current?.close();
                setCreateDialogVersion((version) => version + 1);
              }}
            >
              {uiText(155)}
            </button>
            <button className="shelf-wood-button" type="submit" disabled={!canCreateNotebook}>
              {uiText(1350)}
            </button>
          </div>
        </form>
      </dialog>

      {!activeNotebook ? (
        <>
          <NotebookShelf
            workspace={workspace}
            dispatch={dispatch}
            onOpen={openNotebook}
            onCreate={() => {
              createDialog.current?.showModal();
              createDialog.current
                ?.querySelector<HTMLHeadingElement>("h2")
                ?.focus({ preventScroll: true });
            }}
          />
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
          <div className="notebook-preview-heading is-left">
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
            <h1 className="visually-hidden">{activeNotebook.title}</h1>
          </div>
          {indexOpen && (
            <NotebookPageIndex
              pages={notebookPages}
              currentPageId=""
              onSelect={(pageId) => {
                setActivePageId(pageId);
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
              openPreviewPage(pageId);
            }}
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
