import { getFirebaseAccountServices } from "../data/firebase-account";
import { requestHelena } from "../data/helena-client";
import { OCR_WORKER_OPTIONS } from "../components/handwriting-ocr";
import type { HelenaRequest } from "../ai/helena-contract";
import { PaperEditorIcon } from "../components/paper-editor-icon";
import { PaperCloseIcon } from "../components/paper-close-icon";
import { PaperArrow } from "../components/paper-arrow";
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
  onOpen,
  onStyle,
  onRemove,
}: {
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
            onClick={() =>
              editing ? (setFolderTab("details"), setModal(folder)) : onOpen(folder.id)
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

const studySections = {
  Resumo: { icon: "manual-words", empty: "Ainda não há resumos", action: "Criar resumo" },
  Flashcards: { icon: "flashcards", empty: "Ainda não há flashcards", action: "Criar flashcards" },
  Quizzes: { icon: "quiz", empty: "Ainda não há quizzes", action: "Criar quiz" },
  Simulados: { icon: "mock-exam", empty: "Ainda não há simulados", action: "Criar simulado" },
} as const;

type FolderSection = "Fontes" | keyof typeof studySections;
const folderSections = ["Fontes", ...Object.keys(studySections)] as FolderSection[];
export function LibraryFolderContents({
  folder,
  materials: folderMaterials,
  subjectId,
  dispatch,
  onBack,
}: {
  folder: NonNullable<WorkspaceState["libraryCollections"]>[number];
  materials: WorkspaceState["materials"];
  subjectId: string;
  dispatch: Dispatch<WorkspaceAction>;
  onBack: () => void;
}) {
  const summaries = folderMaterials.filter((item) => item.tags?.[0] === "folder-summary");
  const materials = folderMaterials.filter((item) => item.tags?.[0] !== "folder-summary");
  const [readingSummaryId, setReadingSummaryId] = useState<string>();
  const readingSummary = summaries.find(({ id }) => id === readingSummaryId);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [section, setSection] = useState<FolderSection>("Fontes");
  const [renamingId, setRenamingId] = useState<string>();
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [sourceType, setSourceType] = useState<"YouTube" | "Nota em branco" | "Goodnotes">();
  const [creating, setCreating] = useState<keyof typeof studySections>();
  const [showStudyTypes, setShowStudyTypes] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedSources = materials.filter(({ id }) => selectedIds.includes(id));
  const maxSelectedSources = 3;
  const allSelected = selectedSources.length === materials.length;
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function generateSummary() {
    if (summaryBusy || !selectedSources.length) return;
    setCreating(undefined);
    setSection("Resumo");
    setSummaryError("");
    setSummaryBusy(true);
    try {
      const services = await getFirebaseAccountServices().catch(() => undefined);
      if (!services) throw new Error("A autenticação da Olena não está configurada nesta prévia.");
      const { auth } = services;
      const user = auth.currentUser;
      if (!user || user.isAnonymous) throw new Error("Entre na sua conta para gerar com a Olena.");
      const token = await user.getIdToken();
      const sources: HelenaRequest["sources"] = [];
      let scanner: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | undefined;
      async function recognize(image: HTMLCanvasElement | string) {
        if (!scanner) {
          const { createWorker } = await import("tesseract.js");
          scanner = await createWorker("eng", 1, OCR_WORKER_OPTIONS);
        }
        return (await scanner.recognize(image)).data.text;
      }
      try {
        for (const source of selectedSources) {
          let content = source.kind === "text" ? source.content : "";
          if (source.kind === "image") content = await recognize(source.content);
          if (source.kind === "pdf") {
            const [pdfjs, worker] = await Promise.all([
              import("pdfjs-dist"),
              import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
            ]);
            pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
            const loading = pdfjs.getDocument({ url: source.content });
            try {
              const pdf = await loading.promise;
              for (let index = 1; index <= pdf.numPages; index++) {
                const page = await pdf.getPage(index);
                const text = await page.getTextContent();
                let pageText = text.items
                  .map((item) => ("str" in item ? item.str : ""))
                  .join(" ")
                  .trim();
                if (!pageText) {
                  const viewport = page.getViewport({ scale: 1 });
                  const scaled = page.getViewport({
                    scale: 1600 / Math.max(viewport.width, viewport.height),
                  });
                  const canvas = document.createElement("canvas");
                  canvas.width = Math.ceil(scaled.width);
                  canvas.height = Math.ceil(scaled.height);
                  await page.render({ canvas, viewport: scaled }).promise;
                  pageText = await recognize(canvas);
                }
                if (pageText.trim()) content += "\nPágina " + index + ": " + pageText.trim();
                page.cleanup();
              }
            } finally {
              await loading.destroy();
            }
          }
          if (!content.trim())
            throw new Error("Não consegui extrair texto de " + source.title + ".");
          // Distribui o orçamento pelo início, meio e fim de documentos longos.
          const excerpt =
            content.length <= 8000
              ? content
              : [
                  content.slice(0, 2650),
                  content.slice(
                    Math.floor(content.length / 2) - 1325,
                    Math.floor(content.length / 2) + 1325,
                  ),
                  content.slice(-2650),
                ].join("\n[… ]\n");
          sources.push({
            id: source.id,
            kind: "material",
            title: source.title.slice(0, 200),
            content: excerpt,
          });
        }
      } finally {
        await scanner?.terminate();
      }
      const result = await requestHelena(
        {
          version: 1,
          capability: "summarize",
          prompt:
            "Escreva um guia de estudo em português brasileiro usando apenas as fontes fornecidas. Sintetize em palavras próprias e organize por assunto. Comece com # e um título curto. Use de 4 a 7 seções com títulos ## numerados, parágrafos curtos, - para listas e **negrito** para termos-chave. Intercale pelo menos três caixas com uma linha inteira começando por > e um rótulo em negrito, por exemplo Definição, Atenção, Cronologia ou Ponto essencial. Inclua datas, exemplos ou cálculos quando sustentados pelas fontes. Preserve números e fatos. Indique lacunas quando os trechos forem incompletos. Entregue somente o guia, sem bloco de código.",
          sources,
          privacy: { consent: true, retention: "none" },
        },
        { token },
      );
      const heading = result.answer.match(/^#\s+(.+)/m)?.[1]?.trim();
      dispatch({
        type: "material/added",
        collectionId: folder.id,
        subjectId,
        title:
          heading?.slice(0, 80) || selectedSources[0]?.title.replace(/\.[^.]+$/, "") || "Resumo",
        kind: "text",
        content: result.answer.replace(/^# [^\n]+\n*/, "").trim() || result.answer,
        tags: ["folder-summary", ...selectedSources.map(({ title }) => title)],
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Não foi possível gerar o resumo.");
    } finally {
      setSummaryBusy(false);
    }
  }
  function removeMaterial(id: string) {
    setSelectedIds((current) => current.filter((sourceId) => sourceId !== id));
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset["reduceMotion"] === "true"
    ) {
      dispatch({ type: "material/removed", id });
      return;
    }
    setRemovingIds((current) => [...current, id]);
    window.setTimeout(() => {
      dispatch({ type: "material/removed", id });
      setRemovingIds((current) => current.filter((sourceId) => sourceId !== id));
    }, 420);
  }

  const sourceSelection = (canRemove: boolean) => (
    <div className="library-source-selection">
      <ul>
        {materials.map(({ id, title }) => (
          <li key={id} className={removingIds.includes(id) ? "is-pulverizing" : undefined}>
            <div className="library-source-name">
              <img src="/room-icons/manual-words.svg" alt="" width="20" height="20" />
              <span>{title}</span>
            </div>
            {canRemove && (
              <button
                type="button"
                className="library-source-remove"
                aria-label={"Remover " + title}
                disabled={removingIds.includes(id)}
                onClick={() => {
                  removeMaterial(id);
                }}
              >
                <PaperCloseIcon />
              </button>
            )}
            <label>
              <input
                type="checkbox"
                aria-label={"Selecionar " + title}
                checked={selectedIds.includes(id)}
                disabled={!selectedIds.includes(id) && selectedSources.length >= maxSelectedSources}
                onChange={({ currentTarget }) => {
                  setSelectedIds(
                    currentTarget.checked
                      ? [...selectedSources.map((source) => source.id), id]
                      : selectedIds.filter((sourceId) => sourceId !== id),
                  );
                }}
              />
            </label>
          </li>
        ))}
      </ul>
      <label>
        <span>
          {materials.length > maxSelectedSources
            ? "Selecionar 3 fontes"
            : "Selecionar todas as fontes"}
        </span>
        <input
          type="checkbox"
          checked={
            materials.length > maxSelectedSources
              ? selectedSources.length === maxSelectedSources
              : allSelected
          }
          onChange={({ currentTarget }) =>
            setSelectedIds(
              currentTarget.checked
                ? materials.slice(0, maxSelectedSources).map(({ id }) => id)
                : [],
            )
          }
        />
      </label>
      <small aria-live="polite">
        {selectedSources.length} de {maxSelectedSources} fontes selecionadas
      </small>
    </div>
  );

  return (
    <section className="library-folder-contents" aria-label={folder.title}>
      <header>
        <button type="button" className="shelf-back" aria-label="Voltar à estante" onClick={onBack}>
          <PaperArrow back />
        </button>
        <nav aria-label="Seções da pasta">
          {folderSections.map((label) => (
            <button
              className="shelf-wood-button"
              key={label}
              type="button"
              aria-pressed={section === label}
              onClick={() => {
                setSection(label);
                setShowSources(false);
                setShowStudyTypes(false);
              }}
            >
              <img
                src={
                  "/room-icons/" +
                  (label === "Fontes" ? "upload" : studySections[label].icon) +
                  ".svg"
                }
                alt=""
              />
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div key={section} className="library-folder-content">
        {section === "Fontes" ? (
          <>
            <button
              type="button"
              className="shelf-wood-button"
              aria-expanded={showSources}
              onClick={() => setShowSources(!showSources)}
            >
              <img src="/room-icons/add.svg" alt="" /> Adicionar fontes
            </button>
            <div className="library-source-drawer" data-open={showSources} inert={!showSources}>
              <div>
                <div className="library-study-type-menu" aria-label="Tipos de fonte">
                  <button
                    type="button"
                    className="shelf-wood-button"
                    onClick={() => {
                      setShowSources(false);
                      input.current?.click();
                    }}
                  >
                    <img src="/room-icons/upload.svg" alt="" /> Enviar documento
                  </button>
                  {(
                    [
                      ["YouTube", "play", "Link do YouTube"],
                      ["Nota em branco", "manual-words", "Nota em branco"],
                      ["Goodnotes", "flashcards", "Importar do Goodnotes"],
                    ] as const
                  ).map(([type, icon, label]) => (
                    <button
                      key={type}
                      type="button"
                      className="shelf-wood-button"
                      onClick={() => {
                        setShowSources(false);
                        setSourceType(type);
                      }}
                    >
                      <img src={"/room-icons/" + icon + ".svg"} alt="" /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {materials.length ? (
              sourceSelection(true)
            ) : (
              <div className="library-folder-upload">
                <img src="/room-icons/upload.svg" alt="" width="36" height="36" />
                <p>Envie PDFs ou imagens para começar</p>
                <button
                  type="button"
                  className="shelf-wood-button"
                  onClick={() => input.current?.click()}
                >
                  Escolher um arquivo
                </button>
              </div>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="library-folder-generate">
              {showStudyTypes && selectedSources.length > 0 && (
                <div className="library-study-type-menu" id="library-study-types">
                  <p>
                    Criar a partir de {selectedSources.length}{" "}
                    {selectedSources.length === 1 ? "fonte" : "fontes"}
                  </p>
                  {(Object.keys(studySections) as Array<keyof typeof studySections>).map(
                    (label) => (
                      <button
                        key={label}
                        className="shelf-wood-button"
                        type="button"
                        onClick={() => {
                          setShowStudyTypes(false);
                          setCreating(label);
                        }}
                      >
                        <img src={"/room-icons/" + studySections[label].icon + ".svg"} alt="" />
                        {label}
                      </button>
                    ),
                  )}
                </div>
              )}
              <button
                type="button"
                className="shelf-wood-button"
                disabled={!selectedSources.length}
                aria-expanded={showStudyTypes && selectedSources.length > 0}
                onClick={() => setShowStudyTypes(!showStudyTypes)}
              >
                <img src="/room-icons/add.svg" alt="" /> Criar material de estudo
              </button>
            </div>
          </>
        ) : (
          <>
            {section === "Resumo" && summaryBusy && (
              <div role="status" className="library-summary-card library-summary-loading">
                <span>
                  <img src="/room-icons/manual-words.svg" alt="" width="26" height="26" />
                  Criando resumo…
                </span>
                <span className="library-summary-loading-track" aria-hidden="true" />
              </div>
            )}
            {section === "Resumo" && summaryError && <p role="alert">{summaryError}</p>}
            {section === "Resumo" &&
              summaries.map((summary) => (
                <article
                  key={summary.id}
                  className={
                    removingIds.includes(summary.id)
                      ? "library-summary-card is-pulverizing"
                      : "library-summary-card"
                  }
                >
                  {renamingId === summary.id ? (
                    <form
                      className="library-summary-rename"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const title = String(
                          new FormData(event.currentTarget).get("title") ?? "",
                        ).trim();
                        if (!title) return;
                        dispatch({ type: "material/updated", id: summary.id, changes: { title } });
                        setRenamingId(undefined);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setRenamingId(undefined);
                      }}
                    >
                      <input
                        name="title"
                        aria-label="Nome do resumo"
                        required
                        maxLength={80}
                        defaultValue={summary.title}
                        ref={(field) => {
                          if (field && field !== document.activeElement) {
                            field.focus();
                            field.select();
                          }
                        }}
                      />
                      <button type="submit" className="shelf-wood-button" aria-label="Salvar nome">
                        <ShelfToolIcon name="save" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="library-summary-open"
                      onClick={() => setReadingSummaryId(summary.id)}
                    >
                      <img src="/room-icons/manual-words.svg" alt="" width="26" height="26" />
                      <span>
                        <strong>{summary.title}</strong>
                        <small>{summary.tags?.slice(1).join(" · ")}</small>
                      </span>
                    </button>
                  )}
                  <details className="library-summary-actions">
                    <summary
                      className="shelf-wood-button"
                      aria-label={"Opções de " + summary.title}
                    >
                      <PaperEditorIcon name="more" />
                    </summary>
                    <div className="library-summary-popover">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.currentTarget.closest("details")?.removeAttribute("open");
                          setRenamingId(summary.id);
                        }}
                      >
                        <ShelfToolIcon name="pen" /> Renomear
                      </button>
                      <button
                        type="button"
                        disabled={removingIds.includes(summary.id)}
                        onClick={(event) => {
                          event.currentTarget.closest("details")?.removeAttribute("open");
                          removeMaterial(summary.id);
                        }}
                      >
                        <ShelfToolIcon name="trash" /> Excluir
                      </button>
                    </div>
                  </details>
                </article>
              ))}
            {(section !== "Resumo" || (!summaryBusy && summaries.length === 0)) && (
              <div className="library-folder-study-empty">
                <img
                  src={"/room-icons/" + studySections[section].icon + ".svg"}
                  alt=""
                  width="72"
                  height="72"
                />
                <h2>{studySections[section].empty}</h2>
              </div>
            )}
            <button
              type="button"
              className="shelf-wood-button library-folder-generate"
              onClick={() => setCreating(section)}
            >
              <img src="/room-icons/add.svg" alt="" /> {studySections[section].action}
            </button>
          </>
        )}
        {sourceType && (
          <LibraryDialog
            className="shelf-wood-dialog"
            title={sourceType === "Goodnotes" ? "Importar do Goodnotes" : sourceType}
            onClose={() => setSourceType(undefined)}
          >
            {sourceType === "Goodnotes" ? (
              <>
                <p>
                  No Goodnotes, abra o caderno, escolha Compartilhar e exporte como PDF. Selecione o
                  PDF exportado para adicioná-lo à pasta.
                </p>
                <button
                  type="button"
                  className="shelf-wood-button"
                  onClick={() => {
                    setSourceType(undefined);
                    input.current?.click();
                  }}
                >
                  Escolher PDF
                </button>
              </>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const content = String(data.get("content") ?? "").trim();
                  if (!content) return;
                  if (sourceType === "YouTube") {
                    const url = URL.canParse(content) ? new URL(content) : undefined;
                    if (
                      url?.protocol !== "https:" ||
                      !["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
                        url.hostname,
                      )
                    ) {
                      setError("Informe um link HTTPS do YouTube.");
                      return;
                    }
                  }
                  dispatch({
                    type: "material/added",
                    collectionId: folder.id,
                    subjectId,
                    title:
                      sourceType === "YouTube"
                        ? content
                        : String(data.get("title") ?? "").trim() || "Nota",
                    kind: sourceType === "YouTube" ? "link" : "text",
                    content,
                    createdAt: new Date().toISOString(),
                  });
                  setError("");
                  setSourceType(undefined);
                }}
              >
                {sourceType === "YouTube" ? (
                  <label>
                    Link do vídeo <input name="content" type="url" required />
                  </label>
                ) : (
                  <>
                    <label>
                      Título <input name="title" maxLength={80} required />
                    </label>
                    <label>
                      Nota <textarea name="content" maxLength={20000} required />
                    </label>
                  </>
                )}
                {error && <p role="alert">{error}</p>}
                <button type="submit" className="shelf-wood-button">
                  Adicionar fonte
                </button>
              </form>
            )}
          </LibraryDialog>
        )}
        {readingSummary && (
          <LibraryDialog
            className="library-summary-reader"
            title={readingSummary.title}
            onClose={() => setReadingSummaryId(undefined)}
          >
            {!/^## /m.test(readingSummary.content) && (
              <button
                type="button"
                className="shelf-wood-button library-summary-regenerate"
                onClick={() => {
                  const titles = readingSummary.tags?.slice(1) ?? [];
                  setSelectedIds(
                    materials
                      .filter(({ title }) => titles.includes(title))
                      .slice(0, maxSelectedSources)
                      .map(({ id }) => id),
                  );
                  setReadingSummaryId(undefined);
                  setCreating("Resumo");
                }}
              >
                <img src="/room-icons/manual-words.svg" alt="" width="22" height="22" />
                Gerar resumo estruturado com a Olena
              </button>
            )}
            <div className="library-summary-paper">
              {readingSummary.content
                .split(/\n+/)
                .filter((line) => line.trim())
                .map((line, index) => {
                  const inline = (value: string) =>
                    value
                      .split(/\*\*([^*]+)\*\*/)
                      .map((part, partIndex) =>
                        partIndex % 2 ? <strong key={partIndex}>{part}</strong> : part,
                      );
                  if (/^#{1,4} /.test(line))
                    return <h3 key={index}>{inline(line.replace(/^#+ /, ""))}</h3>;
                  if (line.startsWith("> "))
                    return <aside key={index}>{inline(line.slice(2))}</aside>;
                  return <p key={index}>{inline(line.replace(/^[-*] /, "• "))}</p>;
                })}
            </div>
          </LibraryDialog>
        )}
        {creating && (
          <LibraryDialog
            className="shelf-wood-dialog library-study-confirm"
            title={studySections[creating].action}
            onClose={() => setCreating(undefined)}
            headerContent={
              <img
                src={"/room-icons/" + studySections[creating].icon + ".svg"}
                alt=""
                width="42"
                height="42"
              />
            }
          >
            <div className="library-study-confirm-tools">
              <span>Selecionar fontes</span>
              {materials.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(
                      selectedSources.length
                        ? []
                        : materials.slice(0, maxSelectedSources).map(({ id }) => id),
                    )
                  }
                >
                  {selectedSources.length ? "Desselecionar tudo" : "Selecionar fontes"}
                </button>
              )}
            </div>
            {materials.length ? (
              sourceSelection(false)
            ) : (
              <button
                type="button"
                className="shelf-wood-button"
                onClick={() => {
                  setCreating(undefined);
                  setSection("Fontes");
                }}
              >
                Adicionar fontes
              </button>
            )}
            {creating === "Resumo" && (
              <p>Ao gerar, o texto das fontes selecionadas é enviado à Olena.</p>
            )}
            {creating !== "Resumo" && (
              <p>A geração deste tipo de material ainda não está disponível.</p>
            )}
            <button
              type="button"
              className="shelf-wood-button library-study-confirm-generate"
              disabled={creating !== "Resumo" || !selectedSources.length || summaryBusy}
              onClick={() => void generateSummary()}
            >
              Gerar
            </button>
          </LibraryDialog>
        )}
        <input
          ref={input}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
          hidden
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            setError("");
            const kind = /\.pdf$/i.test(file.name)
              ? "pdf"
              : /\.(png|jpe?g|webp)$/i.test(file.name)
                ? "image"
                : /\.(txt|md)$/i.test(file.name)
                  ? "text"
                  : undefined;
            if (!kind || file.size > 1024 * 1024) {
              setError("Escolha um PDF, imagem, TXT ou Markdown de até 1 MB.");
              return;
            }
            try {
              const content =
                kind === "text"
                  ? await file.text()
                  : await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = () => reject(reader.error);
                      reader.readAsDataURL(file);
                    });
              dispatch({
                type: "material/added",
                collectionId: folder.id,
                subjectId,
                title: file.name,
                kind,
                content,
                createdAt: new Date().toISOString(),
              });
            } catch {
              setError("Não foi possível abrir o arquivo.");
            }
          }}
        />
      </div>
    </section>
  );
}
