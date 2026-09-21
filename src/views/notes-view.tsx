import { lazy, Suspense, useEffect, useState, type CSSProperties, type Dispatch } from "react";
import { PageHeader } from "../components/app-navigation";
import { HelenaLoading } from "../components/helena-loading";
import { PaperActionIcon } from "../components/paper-action-icon";
import type { HandwritingDocument } from "../domain/handwriting";
import {
  createWorkspaceId,
  type StudyNotebook,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";

const NoteCaptureTools = lazy(() => import("../components/note-capture-tools"));

type NotesViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

function notebookTitle(workspace: WorkspaceState): string {
  const base = "Meu caderno";
  const matches = workspace.notebooks.filter((notebook) => notebook.title.startsWith(base)).length;
  return matches === 0 ? base : `${base} ${matches + 1}`;
}

function NotebookArtwork({
  subjectColor,
  title = "Ideias em papel",
}: {
  subjectColor: string;
  title?: string;
}) {
  return (
    <span
      className="book-cover"
      style={{ "--notebook-accent": subjectColor } as CSSProperties}
      aria-hidden="true"
    >
      <span className="book-cover__pages" />
      <span className="book-cover__face">
        <span className="book-cover__edition">MEU UNIVERSO PARTICULAR</span>
        <span className="book-cover__title">{title}</span>
        <svg className="book-cover__art" viewBox="0 0 180 150">
          <path fill="#51465D" d="M8 137 44 51 94 137Z" />
          <path fill="#A779EF" d="m44 51 9 86h41Z" />
          <path fill="#FFF9EF" d="m39 63 5-12 20 34-17-7Z" />
          <path fill="#292432" d="m66 137 60-103 46 103Z" />
          <path fill="#FFE88D" d="m126 34 46 103-59-28Z" />
          <path fill="#FACC15" d="m124 10 6 13 15 2-11 10 2 15-12-7-13 7 3-15-11-10 15-2Z" />
          <path fill="#FFF9EF" d="m10 19 15-9-4 22 16-7-5 19-23-8Z" />
          <path fill="#A779EF" d="m10 19 11 13-12 4Z" />
        </svg>
        <span className="book-cover__footer">ESCREVA • DESCUBRA • GUARDE</span>
      </span>
      <span className="book-cover__spine" />
      <span className="book-cover__ribbon" />
    </span>
  );
}

export function NotesView({ workspace, dispatch }: NotesViewProps) {
  const [newNotebookName, setNewNotebookName] = useState("");
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.userAgent.includes("jsdom")) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeNotebookId, activePageId]);

  const activeNotebook =
    workspace.notebooks.find((notebook) => notebook.id === activeNotebookId) ?? null;
  const notebookPages = activeNotebook
    ? activeNotebook.pageIds.flatMap((id) => {
        const page = workspace.notes.find((note) => note.id === id);
        return page ? [page] : [];
      })
    : [];
  const activePage = notebookPages.find((page) => page.id === activePageId) ?? null;
  const activePageIndex = notebookPages.findIndex((page) => page.id === activePageId);
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
    setNewNotebookName("");
    setActivePageId(null);
  }

  function openNotebook(notebook: StudyNotebook) {
    setActiveNotebookId(notebook.id);
    setActivePageId(null);
  }

  function createPage() {
    if (!activeNotebook) return;
    const id = createWorkspaceId("note");
    dispatch({
      type: "note/added",
      id,
      notebookId: activeNotebook.id,
      subjectId: activeNotebook.subjectId,
      updatedAt: new Date().toISOString(),
    });
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
    dispatch({
      type: "note/asset-added",
      noteId: activePage.id,
      kind,
      name,
      dataUrl,
      createdAt: new Date().toISOString(),
      ...(handwriting ? { handwriting } : {}),
    });
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

  return (
    <main className="main-content" id="main-content">
      <PageHeader />

      {!activeNotebook ? (
        <>
          <header className="view-heading view-heading--with-action notebooks-heading">
            <div>
              <h1>Meus Cadernos</h1>
            </div>
            <div className="new-note-action">
              <label>
                <span>Nome do novo caderno</span>
                <input
                  value={newNotebookName}
                  maxLength={80}
                  placeholder="Ideias, memórias, descobertas..."
                  onChange={(event) => setNewNotebookName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") createNotebook();
                  }}
                />
              </label>
              <button className="primary-button" type="button" onClick={createNotebook}>
                <PaperActionIcon name="plus" /> <span>Novo caderno</span>
              </button>
            </div>
          </header>

          <section className="notebooks-showcase" aria-label="Meus cadernos">
            {workspace.notebooks.length === 0 ? (
              <div className="notebooks-empty">
                <NotebookArtwork subjectColor="#7C3AED" />
                <h2>Sua estante está pronta</h2>
                <p>Um lugar para suas ideias. Crie um caderno e preencha suas primeiras folhas.</p>
              </div>
            ) : (
              <div className="notebook-grid">
                {workspace.notebooks.map((notebook) => {
                  const coverIndex =
                    [...notebook.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
                  return (
                    <button
                      className="notebook-card"
                      type="button"
                      onClick={() => openNotebook(notebook)}
                      aria-label={`Abrir ${notebook.title}`}
                      key={notebook.id}
                    >
                      <NotebookArtwork
                        subjectColor={
                          ["#7C3AED", "#22665F", "#A44050", "#315A83"][coverIndex] ?? "#7C3AED"
                        }
                        title={notebook.title}
                      />
                      <span className="notebook-card__copy">
                        <strong>{notebook.title}</strong>
                        <small>
                          {notebook.pageIds.length} folha{notebook.pageIds.length === 1 ? "" : "s"}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : activePage ? (
        <>
          <header className="notebook-inner-heading">
            <button className="back-button" type="button" onClick={() => setActivePageId(null)}>
              <span aria-hidden="true">‹</span> Folhas do caderno
            </button>
            <div>
              <span>{activeNotebook.title}</span>
            </div>
            <nav className="notebook-page-navigation" aria-label="Navegação das folhas">
              <button
                type="button"
                disabled={activePageIndex <= 0}
                onClick={() => setActivePageId(notebookPages[activePageIndex - 1]?.id ?? null)}
              >
                ‹ Anterior
              </button>
              <span>
                {activePageIndex + 1} de {notebookPages.length}
              </span>
              <button
                type="button"
                disabled={activePageIndex >= notebookPages.length - 1}
                onClick={() => setActivePageId(notebookPages[activePageIndex + 1]?.id ?? null)}
              >
                Próxima ›
              </button>
              <button type="button" onClick={createPage}>
                Nova folha
              </button>
            </nav>
          </header>
          <section className="note-editor note-editor--page" aria-label="Editor de folha">
            <div className="note-editor__meta">
              <span>Suas anotações</span>
              <small>Salva automaticamente</small>
            </div>
            <Suspense fallback={<HelenaLoading label="Abrindo ferramentas…" compact />}>
              <NoteCaptureTools
                draftPageKey={activePage.id}
                onSave={saveAsset}
                onUpdate={updateAsset}
                editingAsset={editingAsset}
                onCloseEditing={() => setEditingAssetId(null)}
              />
            </Suspense>
            <input
              className="note-title-input"
              aria-label="Título da folha"
              value={activePage.title}
              onChange={(event) => updatePage(event.target.value, activePage.content)}
            />
            <textarea
              aria-label="Conteúdo da folha"
              value={activePage.content}
              onChange={(event) => updatePage(activePage.title, event.target.value)}
              placeholder="Comece a escrever..."
            />
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
              <p>Suas ideias, folha por folha.</p>
            </div>
            <button className="primary-button" type="button" onClick={createPage}>
              <PaperActionIcon name="plus" /> <span>Nova folha</span>
            </button>
          </header>
          <section className="notebook-pages" aria-label={`Folhas de ${activeNotebook.title}`}>
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
              <div className="notebook-page-grid">
                {notebookPages.map((page, index) => (
                  <div className="notebook-page-tile" key={page.id}>
                    <button
                      className="notebook-page-card"
                      type="button"
                      onClick={() => setActivePageId(page.id)}
                    >
                      <span className="notebook-page-card__number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <strong>{page.title || "Folha sem título"}</strong>
                      <span>
                        {page.content ||
                          (page.assets.length > 0
                            ? `${page.assets.length} imagem${page.assets.length === 1 ? "" : "s"}`
                            : "Folha vazia")}
                      </span>
                      <small>Abrir folha</small>
                    </button>
                    <div className="notebook-page-order" aria-label={`Ordem de ${page.title}`}>
                      <button
                        type="button"
                        disabled={index === 0}
                        aria-label={`Mover ${page.title} para antes`}
                        onClick={() =>
                          dispatch({
                            type: "notebook/page-moved",
                            notebookId: activeNotebook.id,
                            pageId: page.id,
                            direction: -1,
                          })
                        }
                      >
                        ↑ Antes
                      </button>
                      <button
                        type="button"
                        disabled={index === notebookPages.length - 1}
                        aria-label={`Mover ${page.title} para depois`}
                        onClick={() =>
                          dispatch({
                            type: "notebook/page-moved",
                            notebookId: activeNotebook.id,
                            pageId: page.id,
                            direction: 1,
                          })
                        }
                      >
                        ↓ Depois
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default NotesView;
