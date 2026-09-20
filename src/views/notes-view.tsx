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

function notebookTitle(workspace: WorkspaceState, subjectId: string): string {
  const subject = workspace.subjects.find((item) => item.id === subjectId);
  const base = `Caderno de ${subject?.name ?? "estudos"}`;
  const matches = workspace.notebooks.filter((notebook) => notebook.title.startsWith(base)).length;
  return matches === 0 ? base : `${base} ${matches + 1}`;
}

function NotebookArtwork({ subjectColor }: { subjectColor: string }) {
  return (
    <span
      className="notebook-artwork"
      style={{ "--notebook-accent": subjectColor } as CSSProperties}
      aria-hidden="true"
    >
      <span className="notebook-artwork__back" />
      <span className="notebook-artwork__page notebook-artwork__page--one" />
      <span className="notebook-artwork__page notebook-artwork__page--two" />
      <span className="notebook-artwork__page notebook-artwork__page--three" />
      <span className="notebook-artwork__front" />
      <span className="notebook-artwork__label">OLI</span>
    </span>
  );
}

export function NotesView({ workspace, dispatch }: NotesViewProps) {
  const defaultSubject = workspace.subjects[0];
  const [newNotebookSubjectId, setNewNotebookSubjectId] = useState(defaultSubject?.id ?? "");
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.userAgent.includes("jsdom")) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeNotebookId, activePageId]);

  if (!defaultSubject) return null;

  const activeNotebook =
    workspace.notebooks.find((notebook) => notebook.id === activeNotebookId) ?? null;
  const notebookPages = activeNotebook
    ? activeNotebook.pageIds.flatMap((id) => {
        const page = workspace.notes.find((note) => note.id === id);
        return page ? [page] : [];
      })
    : [];
  const activePage = notebookPages.find((page) => page.id === activePageId) ?? null;
  const editingAsset = activePage?.assets.find((asset) => asset.id === editingAssetId) ?? null;
  const activeSubject = activeNotebook
    ? (workspace.subjects.find((item) => item.id === activeNotebook.subjectId) ?? defaultSubject)
    : defaultSubject;

  function createNotebook() {
    const id = createWorkspaceId("notebook");
    dispatch({
      type: "notebook/added",
      id,
      title: notebookTitle(workspace, newNotebookSubjectId),
      subjectId: newNotebookSubjectId,
      createdAt: new Date().toISOString(),
    });
    setActiveNotebookId(id);
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
                <span>Matéria do novo caderno</span>
                <select
                  value={newNotebookSubjectId}
                  onChange={(event) => setNewNotebookSubjectId(event.target.value)}
                >
                  {workspace.subjects.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary-button" type="button" onClick={createNotebook}>
                <PaperActionIcon name="plus" /> <span>Novo caderno</span>
              </button>
            </div>
          </header>

          <section className="notebooks-showcase" aria-label="Meus cadernos">
            {workspace.notebooks.length === 0 ? (
              <div className="notebooks-empty">
                <NotebookArtwork subjectColor={defaultSubject.color} />
                <h2>Sua estante está pronta</h2>
                <p>Crie o primeiro caderno e organize suas folhas por matéria.</p>
              </div>
            ) : (
              <div className="notebook-grid">
                {workspace.notebooks.map((notebook) => {
                  const subject =
                    workspace.subjects.find((item) => item.id === notebook.subjectId) ??
                    defaultSubject;
                  return (
                    <button
                      className="notebook-card"
                      type="button"
                      onClick={() => openNotebook(notebook)}
                      aria-label={`Abrir ${notebook.title}`}
                      key={notebook.id}
                    >
                      <NotebookArtwork subjectColor={subject.color} />
                      <span className="notebook-card__copy">
                        <strong>{notebook.title}</strong>
                        <span>{subject.name}</span>
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
              <small>{activeSubject.name}</small>
            </div>
          </header>
          <section className="note-editor note-editor--page" aria-label="Editor de folha">
            <div className="note-editor__meta">
              <span>{activeSubject.name}</span>
              <small>Salva automaticamente</small>
            </div>
            <Suspense fallback={<HelenaLoading label="Abrindo ferramentas…" compact />}>
              <NoteCaptureTools
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
              <p>{activeSubject.name}</p>
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
                  <button
                    className="notebook-page-card"
                    type="button"
                    onClick={() => setActivePageId(page.id)}
                    key={page.id}
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
