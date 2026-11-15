import { ShelfToolIcon } from "../components/shelf-tool-icon";
import { PaperDigits } from "../components/paper-digits";
import { LibraryDialog } from "../components/library-dialog";
import { uiText, useLanguage } from "../i18n/runtime";
import { useRef, useState, type Dispatch } from "react";
import {
  createWorkspaceId,
  type LibraryFolderStyle,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import "./library-shelf-view.css";

const folderStyles = [
  ["classic", 3375],
  ["pride", 3380],
  ["mathematics", 1406],
  ["english", 523],
] as const;

export function LibraryShelfView({
  workspace,
  dispatch,
  editing,
  styles,
  removed,
  onStyle,
  onRemove,
}: {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  editing: boolean;
  styles: Partial<Record<string, LibraryFolderStyle>>;
  removed: string[];
  onStyle: (id: string, style: LibraryFolderStyle) => void;
  onRemove: (id: string) => void;
}) {
  const language = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [openFolder, setOpenFolder] = useState<string>();
  const collections = workspace.libraryCollections ?? [];
  const visibleFolders = collections.filter((folder) => !removed.includes(folder.id));
  const canCreate = collections.length < 3;
  const [folderTab, setFolderTab] = useState<"details" | "covers">("details");
  const [modal, setModal] = useState<{ id: string; title: string }>();
  const inspected =
    typeof modal === "object" ? collections.find((folder) => folder.id === modal.id) : undefined;
  const inspectedStyle = inspected
    ? (styles[inspected.id] ?? inspected.style ?? "classic")
    : "classic";
  return (
    <>
      <div
        className="notebook-display-shelf__books library-folder-row"
        data-empty={visibleFolders.length === 0}
      >
        <div className="library-shelf-candles" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {visibleFolders.map((folder) => (
          <button
            className="library-paper-folder"
            data-folder-style={styles[folder.id] ?? folder.style ?? "classic"}
            key={folder.id}
            type="button"
            aria-label={folder.title}
            aria-pressed={openFolder === folder.id}
            onClick={() =>
              editing
                ? (setFolderTab("details"), setModal(folder))
                : setOpenFolder((current) => (current === folder.id ? undefined : folder.id))
            }
          >
            {editing && (
              <span className="shelf-item-pencil" aria-hidden="true">
                <ShelfToolIcon name="pen" />
              </span>
            )}
            <span className="library-paper-folder__sheet" aria-hidden="true" />
            <span className="library-paper-folder__sheet" aria-hidden="true" />
            <span className="library-paper-folder__front" aria-hidden="true">
              {folder.title}
            </span>
          </button>
        ))}
        {canCreate && !editing && (
          <button
            className="notebook-display-shelf__create"
            type="button"
            aria-label={uiText(1354)}
            onClick={() => dialog.current?.showModal()}
          >
            <span aria-hidden="true">+</span>
          </button>
        )}
      </div>

      {modal && (
        <LibraryDialog
          className={inspected ? "shelf-wood-dialog shelf-book-dialog" : "shelf-wood-dialog"}
          title={modal.title}
          onClose={() => setModal(undefined)}
        >
          {inspected && (
            <>
              <div className="shelf-cover-tabs" role="group" aria-label={uiText(3785)}>
                <button
                  type="button"
                  className="shelf-wood-button"
                  aria-pressed={folderTab === "details"}
                  onClick={() => setFolderTab("details")}
                >
                  {uiText(1353)}
                </button>
                <button
                  type="button"
                  className="shelf-wood-button"
                  aria-pressed={folderTab === "covers"}
                  onClick={() => setFolderTab("covers")}
                >
                  {uiText(3785)}
                </button>
              </div>
              <div
                className="library-paper-folder library-folder-preview shelf-book-preview"
                data-folder-style={inspectedStyle}
                aria-hidden="true"
              >
                <span className="library-paper-folder__sheet" />
                <span className="library-paper-folder__sheet" />
                <span className="library-paper-folder__front">{inspected.title}</span>
              </div>
              {folderTab === "covers" ? (
                <div className="shelf-cover-grid library-folder-styles">
                  {folderStyles.map(([style, label]) => (
                    <button
                      type="button"
                      className="shelf-cover-choice"
                      key={style}
                      aria-pressed={style === inspectedStyle}
                      onClick={() => onStyle(inspected.id, style)}
                    >
                      <span
                        className="library-folder-swatch"
                        data-folder-style={style}
                        aria-hidden="true"
                      />
                      <strong>{uiText(label)}</strong>
                    </button>
                  ))}
                </div>
              ) : (
                <dl>
                  <div>
                    <dt>{uiText(1061)}</dt>
                    <dd>
                      <PaperDigits
                        value={String(
                          workspace.materials.filter((item) => item.collectionId === inspected.id)
                            .length,
                        )}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>{uiText(3779)}</dt>
                    <dd>
                      {inspected.createdAt && Number.isFinite(Date.parse(inspected.createdAt)) ? (
                        <PaperDigits
                          value={new Intl.DateTimeFormat(language, {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }).format(new Date(inspected.createdAt))}
                        />
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
              )}
            </>
          )}
          <div className="shelf-dialog-actions">
            {typeof modal === "object" && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  onRemove(modal.id);
                  setModal(undefined);
                }}
              >
                {uiText(3780)}
              </button>
            )}
            <button className="secondary-button" type="button" onClick={() => setModal(undefined)}>
              {uiText(155)}
            </button>
          </div>
        </LibraryDialog>
      )}
      <dialog
        className="notebook-create-dialog shelf-wood-dialog"
        ref={dialog}
        aria-labelledby="library-folder-title"
        onClose={() => dialog.current?.querySelector("form")?.reset()}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const title = String(new FormData(event.currentTarget).get("folderName") ?? "").trim();
            if (!title || !canCreate) return;
            dispatch({
              type: "library/collection-saved",
              collection: {
                id: createWorkspaceId("collection"),
                title,
                motif: "book",
                createdAt: new Date().toISOString(),
              },
            });
            dialog.current?.close();
          }}
        >
          <h2 id="library-folder-title">{uiText(1985)}</h2>
          <label>
            {uiText(713)}
            <input name="folderName" required maxLength={80} />
          </label>
          <div className="shelf-dialog-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => dialog.current?.close()}
            >
              {uiText(155)}
            </button>
            <button className="shelf-wood-button" type="submit">
              {uiText(1354)}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
