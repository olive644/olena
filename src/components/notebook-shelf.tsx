import { useEffect, useRef, useState, type Dispatch } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import type { StudyNotebook, WorkspaceAction, WorkspaceState } from "../domain/workspace";
import { NotebookCover } from "./notebook-cover";
import { notebookPaperTabs } from "./notebook-paper-tools";
import { ShelfToolIcon } from "./shelf-tool-icon";
import { PaperDigits } from "./paper-digits";
import { PaperArrow } from "./paper-arrow";
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
  const [covers, setCovers] = useState<Record<string, NotebookCoverStyle>>({});
  const [category, setCategory] = useState<"details" | "covers">("details");
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
  const name = editing ? draftName : (workspace.notebookShelfName ?? "");
  const changed =
    Object.keys(covers).length > 0 ||
    draftName !== (workspace.notebookShelfName ?? "") ||
    removed.length > 0;
  function finish(save: boolean) {
    if (save) {
      dispatch({ type: "notebook/shelf-named", name: draftName });
      for (const [id, coverStyle] of Object.entries(covers)) {
        if (!removed.includes(id) && notebookCoverUnlocked(coverStyle, earned))
          dispatch({ type: "notebook/organized", id, changes: { coverStyle } });
      }
      if (removed.length) dispatch({ type: "notebook/removed", ids: removed });
    }
    setCovers({});
    setEditing(false);
    setRemoved([]);
  }
  function begin() {
    setCovers({});
    setInstalling(0);
    setDraftName(workspace.notebookShelfName ?? "");
    setRemoved([]);
    setEditing(true);
  }
  return (
    <section
      className={`notebooks-showcase${editing ? " is-editing-shelf" : ""}`}
      aria-label={uiText(1364)}
    >
      <div className="notebook-shelves">
        {(books.length > 0 || editing) && (
          <div className="shelf-editor-tools" role="group" aria-label={uiText(3769)}>
            {editing && (
              <button
                className="shelf-back"
                aria-label={uiText(3770)}
                onClick={() => finish(false)}
              >
                <PaperArrow back />
              </button>
            )}
            <div className="shelf-editor-cluster" key={editing ? "editing" : "resting"}>
              <button
                className="shelf-wood-button"
                aria-label={uiText(editing ? 3771 : 3772)}
                disabled={editing && !changed}
                onClick={() => (editing ? finish(true) : begin())}
              >
                <ShelfToolIcon name={editing ? "save" : "pen"} />
              </button>
              {editing && (
                <>
                  <button
                    className="shelf-wood-button shelf-name-tool"
                    aria-label={uiText(3773)}
                    onClick={() => {
                      setInputName(draftName);
                      setModal("name");
                    }}
                  >
                    <ShelfToolIcon name="text" />
                    <span>{uiText(3773)}</span>
                  </button>
                  <button
                    className="shelf-wood-button shelf-trash"
                    aria-label={uiText(3774)}
                    onClick={() => setModal("delete")}
                  >
                    <ShelfToolIcon name="trash" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        <section className="notebook-display-shelf" aria-label={uiText(1991, [1])}>
          {["left", "right"].map((side) => (
            <span key={side} className={`notebook-shelf-vines is-${side}`} aria-hidden="true">
              {Array.from({ length: 16 }, (_, index) => (
                <i key={index} style={{ top: index * 12 }} />
              ))}
            </span>
          ))}
          {name && (
            <div
              key={`${name}-${installing}`}
              className={`shelf-wood-sign${installing ? " is-installing" : ""}`}
              aria-live="polite"
            >
              <span>{name}</span>
              <i className="shelf-nail" />
              <i className="shelf-hammer" aria-hidden="true" />
            </div>
          )}
          <div className="notebook-display-shelf__books">
            {visible.map((notebook) => (
              <button
                className="notebook-card notebook-spine"
                data-cover-theme={notebookCoverTheme(covers[notebook.id] ?? notebook.coverStyle)}
                data-notebook-drop={notebook.id}
                type="button"
                key={notebook.id}
                aria-label={
                  editing ? uiText(3775, [notebook.title]) : uiText(1813, [notebook.title])
                }
                onClick={() =>
                  editing ? (setCategory("details"), setModal(notebook)) : onOpen(notebook)
                }
              >
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
            <img
              className="notebook-shelf-cat"
              src="/olena-shelf-sleeping.webp"
              alt=""
              draggable={false}
            />
          </div>
        </section>
        {books.length >= 5 && (
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
          <div className="shelf-dialog-actions">
            <button className="secondary-button" onClick={closeModal}>
              {uiText("Cancelar")}
            </button>
            <button
              className="shelf-wood-button"
              onClick={() => {
                setRemoved(books.map((book) => book.id));
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
