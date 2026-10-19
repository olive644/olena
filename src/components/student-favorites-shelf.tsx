import { useEffect, useRef, useState, type Dispatch } from "react";
import { uiText } from "../i18n/runtime";
import type { AppView } from "./app-navigation";
import type { StudyNotebook, WorkspaceAction, WorkspaceState } from "../domain/workspace";
import {
  isNotebookFolder,
  notebookShelves,
  studentNotebookFavorites,
} from "../domain/notebook-shelves";
import { NotebookCover } from "./notebook-cover";
import { TextNotePreview } from "./text-note";
import { PaperMoonMark } from "./notebook-paper-tools";
import { PaperActionIcon } from "./paper-action-icon";
import { PaperCloseIcon } from "./paper-close-icon";
import NotebookPreview from "./student-notebook-preview";
import "./notebook-folder.css";
import "./student-favorites-shelf.css";

function Artwork({ item, workspace }: { item: StudyNotebook; workspace: WorkspaceState }) {
  if (isNotebookFolder(item))
    return (
      <span className="favorite-folder-art" aria-hidden="true">
        <span className="paper-folder-back" />
        <span className="paper-folder-front">
          <span className="paper-folder-moon">
            <PaperMoonMark compact motif="moon" stitched />
          </span>
          <span className="paper-folder-sun">
            <PaperMoonMark compact motif="sun" stitched />
          </span>
          <img className="paper-folder-star" src="/favicon-star.svg" alt="" />
        </span>
      </span>
    );
  if (item.kind === "note")
    return (
      <TextNotePreview
        title={item.title}
        content={workspace.notes.find((page) => page.id === item.pageIds[0])?.content ?? ""}
      />
    );
  return <NotebookCover subjectColor="#7c3aed" title={item.title} coverStyle={item.coverStyle} />;
}

export default function StudentFavoritesShelf({
  workspace,
  dispatch,
  onNavigate,
}: {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  onNavigate(view: AppView): void;
}) {
  const favorites = studentNotebookFavorites(workspace.notebooks);
  const [selecting, setSelecting] = useState(false);
  const [activeId, setActiveId] = useState<string>();
  const active = workspace.notebooks.find((item) => item.id === activeId);
  const add = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!selecting) return;
    const element = dialog.current;
    const trigger = add.current;
    element?.showModal();
    return () => {
      element?.close();
      trigger?.focus();
    };
  }, [selecting]);
  function open(item: StudyNotebook, page?: string) {
    onNavigate("notes");
    window.history.replaceState(
      null,
      "",
      `/cadernos?${item.kind === "collection" ? "pasta" : "caderno"}=${encodeURIComponent(item.id)}${page ? `&folha=${encodeURIComponent(page)}` : ""}`,
    );
  }
  return (
    <section className="student-favorites" aria-label={uiText("Sua prateleira")}>
      <header>
        <h2>{uiText("Sua prateleira")}</h2>
        <button
          ref={add}
          type="button"
          className="student-favorites-add"
          onClick={() => setSelecting(true)}
          aria-label={uiText("Escolher favoritos")}
        >
          <PaperActionIcon name="plus" />
        </button>
      </header>
      <div className="notebook-shelf student-favorites-rail">
        <div className="student-favorites-books">
          {favorites.map((item) => (
            <button
              type="button"
              key={item.id}
              className="favorite-book"
              aria-label={uiText("Ver {0}", [item.title])}
              aria-pressed={activeId === item.id}
              onClick={() =>
                isNotebookFolder(item)
                  ? open(item)
                  : setActiveId(activeId === item.id ? undefined : item.id)
              }
            >
              <Artwork item={item} workspace={workspace} />
              <span>{item.title}</span>
            </button>
          ))}
        </div>
        <div className="notebook-shelf__rail" aria-hidden="true" />
        {!favorites.length && <p>{uiText("Escolha até três favoritos para esta prateleira.")}</p>}
      </div>
      {active && (
        <section className="student-favorite-preview" key={active.id} aria-label={active.title}>
          <header>
            <h3>{active.title}</h3>
            <button
              type="button"
              aria-label={uiText("Fechar")}
              onClick={() => setActiveId(undefined)}
            >
              <PaperCloseIcon />
            </button>
          </header>
          {active.kind === "note" ? (
            <div className="student-favorite-note">
              <TextNotePreview
                title={active.title}
                content={
                  workspace.notes.find((page) => page.id === active.pageIds[0])?.content ?? ""
                }
              />
              <button type="button" onClick={() => open(active)}>
                {uiText("Abrir")}
              </button>
            </div>
          ) : (
            <div className="student-notebook-preview student-favorite-spread">
              <NotebookPreview
                notebook={active}
                workspace={workspace}
                dispatch={dispatch}
                onOpen={(page) => open(active, page)}
              />
            </div>
          )}
        </section>
      )}
      {selecting && (
        <dialog
          ref={dialog}
          className="student-favorites-picker"
          aria-labelledby="student-favorites-title"
          onCancel={(event) => {
            event.preventDefault();
            setSelecting(false);
          }}
        >
          <header>
            <h2 id="student-favorites-title">{uiText("Escolher favoritos")}</h2>
            <button type="button" aria-label={uiText("Fechar")} onClick={() => setSelecting(false)}>
              <PaperCloseIcon />
            </button>
          </header>
          <p>{uiText("Até três itens no total, com no máximo uma pasta.")}</p>
          <p role="status">{uiText("{0} de 3 favoritos", [favorites.length])}</p>
          <div className="student-favorites-picker-shelves">
            {notebookShelves(
              workspace.notebooks.map((item) => {
                const copy = { ...item };
                delete copy.parentId;
                return copy;
              }),
            )
              .filter((shelf) => shelf.length)
              .map((shelf, index) => (
                <section
                  className="notebook-shelf"
                  key={index}
                  aria-label={uiText(1991, [index + 1])}
                >
                  <div className="student-favorites-picker-books">
                    {shelf.map((item) => {
                      const selected = favorites.some((book) => book.id === item.id);
                      const disabled =
                        !selected &&
                        (favorites.length === 3 ||
                          (isNotebookFolder(item) && favorites.some(isNotebookFolder)));
                      return (
                        <button
                          className="favorite-book"
                          type="button"
                          key={item.id}
                          aria-label={uiText("Favorito: {0}", [item.title])}
                          aria-pressed={selected}
                          disabled={disabled}
                          onClick={() =>
                            dispatch({ type: "notebook/favorite-toggled", id: item.id })
                          }
                        >
                          <Artwork item={item} workspace={workspace} />
                          <img className="favorite-star" src="/favicon-star.svg" alt="" />
                          <span>{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="notebook-shelf__rail" aria-hidden="true" />
                </section>
              ))}
            {!workspace.notebooks.length && <p>{uiText("Nenhum caderno ou Note disponível.")}</p>}
          </div>
          <footer>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSelecting(false);
                onNavigate("notes");
              }}
            >
              {uiText("Meus cadernos")}
            </button>
            <button type="button" className="primary-button" onClick={() => setSelecting(false)}>
              {uiText("Concluir")}
            </button>
          </footer>
        </dialog>
      )}
    </section>
  );
}
