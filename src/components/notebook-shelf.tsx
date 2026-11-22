import { shelfSkinUnlocked } from "../domain/shelf-skins";
import { flushSync } from "react-dom";
import { LibraryShelfView } from "../views/library-shelf-view";
import { HelenaLoading } from "./helena-loading";
import type { LibraryFolderStyle } from "../domain/workspace";
import { ShelfEditorTools } from "./shelf-editor-tools";
import { ShelfToolIcon } from "./shelf-tool-icon";
import { NotebookShelfFrame } from "./notebook-shelf-frame";
import { lazy, Suspense, useEffect, useRef, useState, type Dispatch } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import type { StudyNotebook, WorkspaceAction, WorkspaceState } from "../domain/workspace";
import { NotebookCover } from "./notebook-cover";
import { notebookPaperTabs } from "./notebook-paper-tools";
import { PaperDigits } from "./paper-digits";
import { LibraryDialog } from "./library-dialog";
import { cosmeticAchievements } from "../domain/cosmetic-achievements";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { useEnglishProgress } from "../hooks/use-english-progress";
import {
  NOTEBOOK_COVERS,
  notebookCoverTheme,
  notebookCoverUnlocked,
  type NotebookCoverStyle,
} from "../domain/notebook-covers";
import { PaperCheckIcon } from "./paper-check-icon";
import { PaperCardTitle } from "./paper-card-title";

// Mesa de redação e conteúdo da pasta só são necessários ao abrir uma pasta da Biblioteca: ficam em
// chunks próprios para a estante abrir sem baixar o editor de redação, as propostas e os leitores
// de quiz e simulado.
const TypewriterDesk = lazy(() =>
  import("./typewriter-desk").then((module) => ({ default: module.TypewriterDesk })),
);
const LibraryFolderContents = lazy(() =>
  import("../views/library-folder-contents").then((module) => ({
    default: module.LibraryFolderContents,
  })),
);

export function NotebookShelf({
  workspace,
  dispatch,
  onOpen,
  onCreate,
}: {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  onOpen: (notebook: StudyNotebook) => void;
  onCreate: () => void;
}) {
  const language = useLanguage();
  const [profile] = useStoredProfile();
  const english = useEnglishProgress(workspace.practiceActivities);
  const earned = cosmeticAchievements(english, profile.achievementHistory);
  const [openFolderId, setOpenFolderId] = useState<string>();
  const [covers, setCovers] = useState<Record<string, NotebookCoverStyle>>({});
  const [category, setCategory] = useState<"details" | "covers">("details");
  const [folderStyles, setFolderStyles] = useState<Partial<Record<string, LibraryFolderStyle>>>({});
  const [removedFolders, setRemovedFolders] = useState<string[]>([]);
  const folders = workspace.libraryCollections ?? [];
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const [modal, setModal] = useState<"name" | "delete" | StudyNotebook | null>(null);
  const [inputName, setInputName] = useState("");
  const [installing, setInstalling] = useState(0);
  const [closing, setClosing] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  function closeModal() {
    if (closeTimer.current) return;
    setClosing(true);
    const delay =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset["reduceMotion"] === "true"
        ? 0
        : 220;
    closeTimer.current = setTimeout(() => {
      setModal(null);
      setConfirmRemoval(false);
      setClosing(false);
      closeTimer.current = undefined;
    }, delay);
  }
  const books = workspace.notebooks.filter((book) => !book.kind);
  const visible = books.filter((book) => !removed.includes(book.id));
  const shelfName = workspace.notebookShelfName ?? workspace.libraryShelfName ?? "";
  const name = editing ? draftName : shelfName;
  const changed =
    Object.keys(covers).length > 0 ||
    draftName !== shelfName ||
    removed.length > 0 ||
    removedFolders.length > 0 ||
    Object.keys(folderStyles).length > 0;
  function finish(save: boolean) {
    if (save) {
      dispatch({ type: "notebook/shelf-named", name: draftName });
      for (const [id, coverStyle] of Object.entries(covers)) {
        if (!removed.includes(id) && notebookCoverUnlocked(coverStyle, earned))
          dispatch({ type: "notebook/organized", id, changes: { coverStyle } });
      }
      for (const folder of folders) {
        const style = folderStyles[folder.id];
        if (
          style &&
          !removedFolders.includes(folder.id) &&
          shelfSkinUnlocked(folder.kind === "typewriter" ? "typewriter" : "folder", style, earned)
        )
          dispatch({ type: "library/collection-saved", collection: { ...folder, style } });
      }
      for (const id of removedFolders) dispatch({ type: "library/collection-removed", id });
      if (removed.length) dispatch({ type: "notebook/removed", ids: removed });
    }
    setCovers({});
    setEditing(false);
    setFolderStyles({});
    setRemovedFolders([]);
    setRemoved([]);
  }
  function begin() {
    setCovers({});
    setInstalling(0);
    setDraftName(shelfName);
    setRemoved([]);
    setEditing(true);
  }
  function navigateFolder(id?: string) {
    if (
      !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset["reduceMotion"] === "true"
    ) {
      setOpenFolderId(id);
      return;
    }
    document.startViewTransition(() => flushSync(() => setOpenFolderId(id)));
  }
  const openFolder = workspace.libraryCollections?.find((folder) => folder.id === openFolderId);
  if (openFolder?.kind === "typewriter")
    return (
      <div className="library-typewriter-view">
        <Suspense fallback={<HelenaLoading />}>
          <TypewriterDesk
            key={openFolder.id}
            workspace={workspace}
            collectionId={openFolder.id}
            dispatch={dispatch}
            onBack={() => navigateFolder()}
          />
        </Suspense>
      </div>
    );
  if (openFolder) {
    return (
      <Suspense fallback={<HelenaLoading />}>
        <LibraryFolderContents
          key={openFolder.id}
          folder={openFolder}
          materials={workspace.materials.filter(
            (material) => material.collectionId === openFolder.id && !material.archived,
          )}
          subjectId={workspace.subjects[0]?.id ?? ""}
          libraryChars={workspace.materials.reduce((sum, item) => sum + item.content.length, 0)}
          flashcards={workspace.flashcards.filter((card) =>
            workspace.materials.some(
              (material) =>
                material.id === card.materialId && material.collectionId === openFolder.id,
            ),
          )}
          dispatch={dispatch}
          onBack={() => navigateFolder()}
        />
      </Suspense>
    );
  }
  return (
    <section
      className={`notebooks-showcase${editing ? " is-editing-shelf" : ""}`}
      aria-label={uiText(1364)}
    >
      <div className="notebook-shelves">
        {(books.length > 0 || folders.length > 0 || editing) && (
          <ShelfEditorTools
            editing={editing}
            changed={changed}
            onBack={() => finish(false)}
            onPrimary={() => (editing ? finish(true) : begin())}
            onName={() => {
              setInputName(draftName);
              setModal("name");
            }}
            onDelete={() => setModal("delete")}
          />
        )}
        <NotebookShelfFrame
          lowerShelf={
            <LibraryShelfView
              earned={earned}
              workspace={workspace}
              dispatch={dispatch}
              editing={editing}
              onOpen={navigateFolder}
              styles={folderStyles}
              removed={removedFolders}
              onStyle={(id, style) => {
                const folder = folders.find((item) => item.id === id);
                if (
                  folder &&
                  shelfSkinUnlocked(
                    folder.kind === "typewriter" ? "typewriter" : "folder",
                    style,
                    earned,
                  )
                )
                  setFolderStyles((current) => ({ ...current, [id]: style }));
              }}
              onRemove={(id) => setRemovedFolders((current) => [...current, id])}
            />
          }
          label={uiText(1991, [1])}
          sign={
            name && (
              <div
                key={`${name}-${installing}`}
                className={`shelf-wood-sign${installing ? " is-installing" : ""}`}
                aria-live="polite"
              >
                <span>{name}</span>
                <i className="shelf-nail" />
                <i className="shelf-hammer" aria-hidden="true" />
              </div>
            )
          }
        >
          {visible.map((notebook) => (
            <button
              className="notebook-card notebook-spine"
              data-cover-theme={notebookCoverTheme(covers[notebook.id] ?? notebook.coverStyle)}
              data-notebook-drop={notebook.id}
              type="button"
              key={notebook.id}
              aria-label={editing ? uiText(3775, [notebook.title]) : uiText(1813, [notebook.title])}
              onClick={() =>
                editing ? (setCategory("details"), setModal(notebook)) : onOpen(notebook)
              }
            >
              {editing && (
                <span className="shelf-edit-hint" aria-hidden="true" data-shelf-edit-hint>
                  <ShelfToolIcon name="pen" />
                </span>
              )}
              <span className="notebook-spine__inspection" aria-hidden="true">
                <span className="notebook-spine__body book-cover__spine">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="notebook-spine__front">
                  <strong>{notebook.title}</strong>
                  <NotebookCover
                    coverStyle={covers[notebook.id] ?? notebook.coverStyle}
                    subjectColor="#7C3AED"
                    title={notebook.title}
                    tabs={notebookPaperTabs(notebook, workspace.notes, workspace.subjects)}
                  />
                </span>
              </span>
            </button>
          ))}
          {!editing && books.length < 5 && (
            <button
              className="notebook-display-shelf__create"
              aria-label={uiText(1348)}
              onClick={onCreate}
            >
              <span aria-hidden="true">+</span>
            </button>
          )}
        </NotebookShelfFrame>
        {(books.length >= 5 ||
          folders.filter((item) => item.kind !== "typewriter").length >= 3) && (
          <p className="notebook-shelf-pro">
            <PaperCardTitle value="EM BREVE OLENA PRO" />
          </p>
        )}
      </div>
      {modal === "name" && (
        <LibraryDialog
          className={`shelf-wood-dialog${closing ? " is-closing" : ""}`}
          title={uiText(3773)}
          onClose={closeModal}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setDraftName(inputName.trim());
              setInstalling((count) => count + 1);
              closeModal();
            }}
          >
            <label>
              {uiText("Nome")}
              <input
                autoFocus
                maxLength={40}
                value={inputName}
                onChange={(event) => setInputName(event.target.value)}
                placeholder={uiText(3776)}
              />
            </label>
            <div className="shelf-dialog-actions">
              <button type="button" className="secondary-button" onClick={closeModal}>
                {uiText("Cancelar")}
              </button>
              <button type="submit" className="shelf-wood-button">
                {uiText("Salvar")}
              </button>
            </div>
          </form>
        </LibraryDialog>
      )}
      {modal === "delete" && (
        <LibraryDialog
          className={`shelf-wood-dialog${closing ? " is-closing" : ""}`}
          title={uiText(3777)}
          onClose={closeModal}
        >
          <p>
            {uiText(
              "Ao salvar, o nome, todos os cadernos desta prateleira e suas páginas serão excluídos. Esta ação não pode ser desfeita.",
            )}
          </p>
          <p>{uiText(2946)}</p>
          <div className="shelf-dialog-actions">
            <button className="secondary-button" onClick={closeModal}>
              {uiText("Cancelar")}
            </button>
            <button
              className="shelf-wood-button"
              onClick={() => {
                setRemoved(books.map((book) => book.id));
                setRemovedFolders(folders.map((folder) => folder.id));
                setDraftName("");
                closeModal();
              }}
            >
              {uiText(1512)}
            </button>
          </div>
        </LibraryDialog>
      )}
      {modal && typeof modal === "object" && (
        <LibraryDialog
          key={`${modal.id}-${confirmRemoval}`}
          className={`shelf-wood-dialog shelf-book-dialog${closing ? " is-closing" : ""}`}
          title={confirmRemoval ? uiText(3782) : modal.title}
          onClose={confirmRemoval ? () => setConfirmRemoval(false) : closeModal}
        >
          {confirmRemoval ? (
            <>
              <p>{uiText(3783, [modal.title])}</p>
              <div className="shelf-dialog-actions">
                <button className="secondary-button" onClick={() => setConfirmRemoval(false)}>
                  {uiText("Cancelar")}
                </button>
                <button
                  className="shelf-wood-button"
                  onClick={() => {
                    setRemoved((ids) => [...ids, modal.id]);
                    closeModal();
                  }}
                >
                  {uiText("Remover")}
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className="shelf-cover-tabs"
                role="tablist"
                aria-label={uiText("Personalizar caderno")}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? "details"
                      : event.key === "End"
                        ? "covers"
                        : category === "covers"
                          ? "details"
                          : "covers";
                  setCategory(next);
                  event.currentTarget
                    .querySelectorAll<HTMLButtonElement>('[role="tab"]')
                    [next === "details" ? 0 : 1]?.focus();
                }}
              >
                {(["details", "covers"] as const).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={category === tab}
                    tabIndex={category === tab ? 0 : -1}
                    className="shelf-wood-button"
                    onClick={() => setCategory(tab)}
                  >
                    {uiText(tab === "details" ? "Caderno" : "Capas")}
                  </button>
                ))}
              </div>
              <div className="shelf-book-preview">
                <NotebookCover
                  coverStyle={covers[modal.id] ?? modal.coverStyle}
                  subjectColor="#7C3AED"
                  title={modal.title}
                  tabs={notebookPaperTabs(modal, workspace.notes, workspace.subjects)}
                />
              </div>
              {category === "covers" ? (
                <div className="shelf-cover-options">
                  {NOTEBOOK_COVERS.map((cover) => {
                    const unlocked = notebookCoverUnlocked(cover.id, earned);
                    const selected =
                      (covers[modal.id] ?? modal.coverStyle ?? "helena-estrelas") === cover.id ||
                      (cover.id === "helena-estrelas" &&
                        modal.coverStyle === "oliver-estrelas" &&
                        !covers[modal.id]);
                    return (
                      <button
                        key={cover.id}
                        className="shelf-cover-choice"
                        aria-pressed={selected}
                        aria-disabled={!unlocked}
                        onClick={() => {
                          if (!unlocked) return;
                          setCovers((current) => {
                            const next = { ...current };
                            if (cover.id === (modal.coverStyle ?? "helena-estrelas"))
                              delete next[modal.id];
                            else next[modal.id] = cover.id;
                            return next;
                          });
                        }}
                      >
                        <NotebookCover
                          subjectColor="#7C3AED"
                          coverStyle={cover.id}
                          title=""
                          tabs={[]}
                        />
                        <strong>{uiText(cover.name)}</strong>
                        {selected && <PaperCheckIcon />}
                        {!unlocked && <small>{uiText(cover.requirement)}</small>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <dl>
                    <div>
                      <dt>{uiText("Páginas")}</dt>
                      <dd>
                        <PaperDigits value={String(modal.pageIds.length)} />
                      </dd>
                    </div>
                    <div>
                      <dt>{uiText(3779)}</dt>
                      <dd>
                        {Number.isFinite(Date.parse(modal.createdAt)) ? (
                          <PaperDigits
                            value={new Intl.DateTimeFormat(
                              language === "en-US" ? "en-US" : "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                            ).format(new Date(modal.createdAt))}
                          />
                        ) : (
                          uiText("Não informado")
                        )}
                      </dd>
                    </div>
                  </dl>
                  <button className="shelf-wood-button" onClick={() => setConfirmRemoval(true)}>
                    {uiText(3780)}
                  </button>
                </>
              )}
            </>
          )}
        </LibraryDialog>
      )}
    </section>
  );
}
