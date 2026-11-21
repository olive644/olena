import { shelfSkinRequirement, shelfSkinUnlocked } from "../domain/shelf-skins";
import { LibraryTypewriter } from "../components/library-typewriter";
import { LibraryFolderSources } from "../components/library-folder-sources";
import { libraryFolderShapes } from "../domain/library-folder-shapes";

import { PaperCloseIcon } from "../components/paper-close-icon";

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
  ["blood-moon", "Lua Sangrenta"],
  ["solar-eclipse", "Eclipse Solar"],
  ["lunar-eclipse", "Eclipse Lunar"],
] as const;

export function LibraryShelfView({
  workspace,
  dispatch,
  editing,
  styles,
  removed,
  onOpen,
  onStyle,
  onRemove,
  earned = new Set<string>(),
}: {
  earned?: ReadonlySet<string>;
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  editing: boolean;
  styles: Partial<Record<string, LibraryFolderStyle>>;
  removed: string[];
  onOpen: (id: string) => void;
  onStyle: (id: string, style: LibraryFolderStyle) => void;
  onRemove: (id: string) => void;
}) {
  const language = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);

  const allCollections = workspace.libraryCollections ?? [];
  const collections = allCollections.filter((item) => item.kind !== "typewriter");
  const typewriter = allCollections.find((item) => item.kind === "typewriter");
  const [createChoice, setCreateChoice] = useState<"folder" | "typewriter" | undefined>();
  const shapes = libraryFolderShapes(collections);
  const visibleFolders = collections.filter((folder) => !removed.includes(folder.id));
  const canCreate = collections.length < 3;
  const [folderTab, setFolderTab] = useState<"details" | "covers">("details");
  const [modal, setModal] = useState<{ id: string; title: string }>();
  const inspected =
    typeof modal === "object" ? allCollections.find((folder) => folder.id === modal.id) : undefined;
  const inspectedStyle = inspected
    ? (styles[inspected.id] ?? inspected.style ?? "classic")
    : "classic";
  return (
    <>
      <div
        className="notebook-display-shelf__books library-folder-row"
        data-empty={visibleFolders.length === 0 && !typewriter}
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
            data-folder-shape={shapes.get(folder.id)}
            key={folder.id}
            type="button"
            aria-label={folder.title}
            onClick={() =>
              editing ? (setFolderTab("details"), setModal(folder)) : onOpen(folder.id)
            }
          >
            {editing && (
              <span className="shelf-item-pencil" aria-hidden="true">
                <ShelfToolIcon name="pen" />
              </span>
            )}
            <LibraryFolderSources materials={workspace.materials} collectionId={folder.id} />
            <span className="library-paper-folder__front" aria-hidden="true">
              {folder.title}
            </span>
          </button>
        ))}
        {typewriter && !removed.includes(typewriter.id) && (
          <button
            type="button"
            className="library-shelf-typewriter"
            aria-label={uiText("Redação e vestibulares")}
            onClick={() => (editing ? setModal(typewriter) : onOpen(typewriter.id))}
          >
            <LibraryTypewriter style={styles[typewriter.id] ?? typewriter.style ?? "classic"} />
            {editing && (
              <span className="shelf-item-pencil">
                <ShelfToolIcon name="pen" />
              </span>
            )}
          </button>
        )}
        {(canCreate || !typewriter) && !editing && (
          <button
            className="notebook-display-shelf__create"
            type="button"
            aria-label={uiText("Criar na prateleira")}
            onClick={() => {
              setCreateChoice(undefined);
              dialog.current?.showModal();
            }}
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
              <div
                className="shelf-cover-tabs"
                role="group"
                aria-label={inspected.kind === "typewriter" ? uiText("Skins") : uiText(3785)}
              >
                <button
                  type="button"
                  className="shelf-wood-button"
                  aria-pressed={folderTab === "details"}
                  onClick={() => setFolderTab("details")}
                >
                  {inspected.kind === "typewriter" ? uiText("Detalhes") : uiText(1353)}
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
              {inspected.kind === "typewriter" ? (
                <div className="library-machine-preview shelf-book-preview">
                  <LibraryTypewriter style={inspectedStyle} />
                </div>
              ) : (
                <div
                  className="library-paper-folder library-folder-preview shelf-book-preview"
                  data-folder-style={inspectedStyle}
                  data-folder-shape={inspected && shapes.get(inspected.id)}
                  aria-hidden="true"
                >
                  <LibraryFolderSources
                    materials={workspace.materials}
                    collectionId={inspected.id}
                  />
                  <span className="library-paper-folder__front">{inspected.title}</span>
                </div>
              )}
              {folderTab === "covers" ? (
                <div className="shelf-cover-grid library-folder-styles">
                  {folderStyles.map(([style, label]) => (
                    <button
                      type="button"
                      className="shelf-cover-choice"
                      key={style}
                      aria-pressed={style === inspectedStyle}
                      disabled={
                        !shelfSkinUnlocked(
                          inspected.kind === "typewriter" ? "typewriter" : "folder",
                          style,
                          earned,
                        )
                      }
                      onClick={() => onStyle(inspected.id, style)}
                    >
                      {inspected.kind === "typewriter" ? (
                        <span className="library-machine-swatch">
                          <LibraryTypewriter style={style} />
                        </span>
                      ) : (
                        <span
                          className="library-folder-swatch"
                          data-folder-style={style}
                          aria-hidden="true"
                        />
                      )}
                      <small>
                        {uiText(
                          shelfSkinRequirement(
                            inspected.kind === "typewriter" ? "typewriter" : "folder",
                            style,
                          ) || "Gratuita",
                        )}
                      </small>
                      <strong>
                        {inspected.kind === "typewriter" && style === "classic"
                          ? uiText("Clássica")
                          : uiText(label)}
                      </strong>
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
        <button
          type="button"
          className="library-icon library-create-close"
          aria-label={uiText("Fechar")}
          onClick={() => dialog.current?.close()}
        >
          <PaperCloseIcon />
        </button>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const title = String(new FormData(event.currentTarget).get("folderName") ?? "").trim();
            if (!title || (createChoice === "folder" ? !canCreate : !!typewriter)) return;
            dispatch({
              type: "library/collection-saved",
              collection: {
                id: createWorkspaceId("collection"),
                kind: createChoice ?? "folder",
                title,
                motif: "book",
                createdAt: new Date().toISOString(),
              },
            });
            dialog.current?.close();
          }}
        >
          <h2 id="library-folder-title">
            {uiText(
              createChoice
                ? createChoice === "folder"
                  ? "Criar pasta"
                  : "Criar máquina de escrever"
                : "O que você quer criar?",
            )}
          </h2>
          {!createChoice ? (
            <div className="library-create-choices">
              <button
                type="button"
                className="shelf-wood-button"
                disabled={!canCreate}
                onClick={() => setCreateChoice("folder")}
              >
                <span className="library-choice-folder" aria-hidden="true" />
                <strong>{uiText("Pasta")}</strong>
                <small>{collections.length}/3</small>
              </button>
              <button
                type="button"
                className="shelf-wood-button"
                disabled={!!typewriter}
                onClick={() => setCreateChoice("typewriter")}
              >
                <LibraryTypewriter />
                <strong>{uiText("Redação e vestibulares")}</strong>
                <small>{typewriter ? "1/1" : "0/1"}</small>
              </button>
            </div>
          ) : (
            <>
              <label>
                {uiText(createChoice === "typewriter" ? "Nome da máquina" : "Nome da pasta")}
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
                  {uiText(createChoice === "typewriter" ? "Criar máquina" : "Criar pasta")}
                </button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </>
  );
}
