import { SourceExamStudy } from "../components/source-exam-study";
import { SourceQuizStudy } from "../components/source-quiz-study";
import { parseSourceQuiz, type QuizDifficulty, type QuizLength } from "../domain/source-quiz";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { dataUrlBytes } from "../data/data-url";
import { requestHelena, streamHelena } from "../data/helena-client";
import { OlenaCreditMeter } from "./olena-credits";
import { useOlenaCredits } from "./use-olena-credits";
import { parseStudyCards, parseStudyQuestions } from "../ai/study-output";
import { OCR_WORKER_OPTIONS } from "../components/handwriting-ocr";
import type { HelenaRequest } from "../ai/helena-contract";
import { PaperEditorIcon } from "../components/paper-editor-icon";
import { PaperCloseIcon } from "../components/paper-close-icon";
import { PaperArrow } from "../components/paper-arrow";
import { ShelfToolIcon } from "../components/shelf-tool-icon";
import { PaperDigits } from "../components/paper-digits";
import { LibraryDialog } from "../components/library-dialog";
import { FlashcardStudy } from "../components/flashcard-study";
import { noteFeedback } from "../domain/flashcard-feedback";
import { learnFromSignal } from "../domain/flashcard-quality";
import { uiText, useLanguage } from "../i18n/runtime";
import { useRef, useState, type Dispatch, type ReactNode } from "react";
import {
  createWorkspaceId,
  toDateKey,
  type Flashcard,
  type LibraryFolderStyle,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import {
  OLENA_CAPABILITY,
  SUMMARY_PROMPT,
  budgetSources,
  estimateOlenaCredits,
  studyPrompt,
  toSourceQuiz,
  type OlenaKind,
  type SourceText,
} from "./library-ai";
import {
  MAX_IMAGE_INPUT_BYTES,
  MAX_PDF_BYTES,
  MAX_SOURCE_BYTES,
  decodeText,
  fitsLibrary,
  imageDataUrl,
} from "./library-source-files";
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
            {uiText("Nome da pasta")}
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
const summaryInline = (value: string) =>
  value
    .split(/\*\*([^*]+)\*\*/)
    .map((part, partIndex) => (partIndex % 2 ? <strong key={partIndex}>{part}</strong> : part));

/** Desenha o resumo: títulos, parágrafos, listas, tabelas e caixas (a mesma sintaxe da Olena). */
function SummaryMarkdown({ content }: { content: string }) {
  const lines = content.split(/\n+/).filter((line) => line.trim());
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (/^#{1,4} /.test(line)) {
      blocks.push(<h3 key={index}>{summaryInline(line.replace(/^#+ /, ""))}</h3>);
    } else if (line.startsWith("> ")) {
      blocks.push(<aside key={index}>{summaryInline(line.slice(2))}</aside>);
    } else if (/^\|.*\|\s*$/.test(line)) {
      const rows: string[][] = [];
      const first = index;
      while (index < lines.length && /^\|.*\|\s*$/.test(lines[index]!)) {
        const cells = lines[index]!.trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => cell.trim());
        if (!cells.every((cell) => /^:?-{2,}:?$/.test(cell))) rows.push(cells);
        index += 1;
      }
      index -= 1;
      const [head, ...body] = rows;
      blocks.push(
        <div key={first} className="library-summary-table" tabIndex={0}>
          <table>
            {head && (
              <thead>
                <tr>
                  {head.map((cell, cellIndex) => (
                    <th key={cellIndex} scope="col">
                      {summaryInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{summaryInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (/^[-*] /.test(line)) {
      const first = index;
      const items: string[] = [];
      while (index < lines.length && /^[-*] /.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^[-*] /, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ul key={first}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{summaryInline(item)}</li>
          ))}
        </ul>,
      );
    } else {
      blocks.push(<p key={index}>{summaryInline(line)}</p>);
    }
  }
  return <>{blocks}</>;
}

export function LibraryFolderContents({
  folder,
  materials: folderMaterials,
  subjectId,
  flashcards = [],
  libraryChars = 0,
  dispatch,
  onBack,
}: {
  flashcards?: readonly Flashcard[];
  /** Caracteres que a Biblioteca inteira já guarda na conta (todas as pastas). */
  libraryChars?: number;
  folder: NonNullable<WorkspaceState["libraryCollections"]>[number];
  materials: WorkspaceState["materials"];
  subjectId: string;
  dispatch: Dispatch<WorkspaceAction>;
  onBack: () => void;
}) {
  const quizzes = folderMaterials.filter((item) =>
    ["folder-quiz", "folder-exam"].includes(item.tags?.[0] ?? ""),
  );
  const [openQuizId, setOpenQuizId] = useState<string>();
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [quizLength, setQuizLength] = useState<QuizLength>("medium");
  const openQuizMaterial = quizzes.find((item) => item.id === openQuizId);
  const openQuiz = openQuizMaterial && parseSourceQuiz(openQuizMaterial.content);
  const summaries = folderMaterials.filter((item) => item.tags?.[0] === "folder-summary");
  const materials = folderMaterials.filter(
    (item) => !["folder-summary", "folder-quiz", "folder-exam"].includes(item.tags?.[0] ?? ""),
  );
  const [openDeckId, setOpenDeckId] = useState<string>();
  const [renamingDeckId, setRenamingDeckId] = useState<string>();
  const decks = flashcards.reduce<
    { id: string; title: string; sourceTitle: string; cards: Flashcard[] }[]
  >((groups, card) => {
    const id = card.materialId ?? card.deck ?? "";
    const group = groups.find((item) => item.id === id);
    if (group) group.cards.push(card);
    else
      groups.push({
        id,
        title: card.deck || uiText("Sem baralho"),
        sourceTitle: folderMaterials.find((item) => item.id === card.materialId)?.title ?? "",
        cards: [card],
      });
    return groups;
  }, []);
  const openDeck = decks.find(({ id }) => id === openDeckId);
  const [readingSummaryId, setReadingSummaryId] = useState<string>();
  const readingSummary = summaries.find(({ id }) => id === readingSummaryId);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [cardsBusy, setCardsBusy] = useState(false);
  const [cardsMessage, setCardsMessage] = useState<{ text: string; error: boolean }>();
  const [section, setSection] = useState<FolderSection>("Fontes");
  const [renamingId, setRenamingId] = useState<string>();
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [sourceType, setSourceType] = useState<"YouTube" | "Nota em branco" | "Goodnotes">();
  const [creating, setCreating] = useState<keyof typeof studySections>();
  const [showStudyTypes, setShowStudyTypes] = useState(false);
  const credits = useOlenaCredits();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedSources = materials.filter(({ id }) => selectedIds.includes(id));
  // Link (YouTube) é só referência: o app não lê vídeos, então não entra nos geradores.
  const readableMaterials = materials.filter(({ kind }) => kind !== "link");
  const maxSelectedSources = 3;
  const allSelected = selectedSources.length === readableMaterials.length;
  const cost = creating
    ? estimateOlenaCredits(creating as OlenaKind, selectedSources, quizLength)
    : 0;
  const balance = credits.usage?.remainingCredits;
  const noCredits = balance !== undefined && balance <= 0;
  const resetClock = credits.resetAt
    ? new Date(credits.resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  /** Lê o texto das fontes no aparelho: texto direto, imagem por OCR, PDF (OCR nas páginas só imagem). */
  async function extractSourceTexts(): Promise<SourceText[]> {
    const texts: SourceText[] = [];
    let scanner: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | undefined;
    async function recognize(image: HTMLCanvasElement | string) {
      if (!scanner) {
        const { createWorker } = await import("tesseract.js");
        scanner = await createWorker("por", 1, OCR_WORKER_OPTIONS);
      }
      return (await scanner.recognize(image)).data.text;
    }
    try {
      for (const source of selectedSources) {
        if (source.kind === "link")
          throw new Error(
            uiText("{0} é um link e não pode ser lido. Use uma nota em branco com o texto.", [
              source.title,
            ]),
          );
        let content = source.kind === "text" ? source.content : "";
        if (source.kind === "image") content = await recognize(source.content);
        if (source.kind === "pdf") {
          const [pdfjs, worker] = await Promise.all([
            import("pdfjs-dist"),
            import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
          ]);
          pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
          const bytes = dataUrlBytes(source.content);
          if (!bytes) throw new Error(uiText("Não consegui abrir o PDF {0}.", [source.title]));
          const loading = pdfjs.getDocument({ data: bytes });
          try {
            const pdf = await loading.promise.catch(() => {
              throw new Error(uiText("Não consegui abrir o PDF {0}.", [source.title]));
            });
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
          throw new Error(uiText("Não consegui extrair texto de {0}.", [source.title]));
        texts.push({ id: source.id, title: source.title, content });
      }
    } finally {
      await scanner?.terminate();
    }
    return texts;
  }

  /**
   * Resumo, flashcards, quiz e simulado, todos pela Olena (IA). O texto das fontes sai do aparelho
   * só depois do clique em "Gerar com a Olena", com a conta de verdade e com limite diário.
   */
  async function generateWithOlena(kind: OlenaKind) {
    const busy = kind === "Resumo" ? summaryBusy : kind === "Flashcards" ? cardsBusy : quizBusy;
    if (busy || !selectedSources.length) return;
    const setBusy =
      kind === "Resumo" ? setSummaryBusy : kind === "Flashcards" ? setCardsBusy : setQuizBusy;
    const fail = (message: string) =>
      kind === "Resumo"
        ? setSummaryError(message)
        : kind === "Flashcards"
          ? setCardsMessage({ text: message, error: true })
          : setQuizError(message);
    credits.prepare();
    setCreating(undefined);
    setSection(kind);
    setSummaryError("");
    setQuizError("");
    setCardsMessage(undefined);
    setBusy(true);
    try {
      const services = await getFirebaseAccountServices().catch(() => undefined);
      if (!services)
        throw new Error(uiText("A autenticação da Olena não está configurada nesta prévia."));
      const user = services.auth.currentUser;
      if (!user || user.isAnonymous)
        throw new Error(uiText("Entre na sua conta para gerar com a Olena."));
      const token = await user.getIdToken();
      const sources = budgetSources(await extractSourceTexts());
      const titles = selectedSources.map((item) => item.title);
      const request: HelenaRequest = {
        version: 1,
        capability: OLENA_CAPABILITY[kind],
        prompt: kind === "Resumo" ? SUMMARY_PROMPT : studyPrompt(kind, difficulty, quizLength),
        sources,
        privacy: { consent: true, retention: "none" },
      };
      if (kind === "Resumo") {
        // Pela transmissão em fluxo: a resposta sem fluxo tem 20 s de limite no servidor, e um guia
        // longo costuma passar disso.
        const result = await streamHelena(request, { token, onText: () => {} });
        const heading = result.answer.match(/^#\s+(.+)/m)?.[1]?.trim();
        dispatch({
          type: "material/added",
          collectionId: folder.id,
          subjectId,
          title: heading?.slice(0, 80) || titles[0]?.replace(/\.[^.]+$/, "") || "Resumo",
          kind: "text",
          content: result.answer.replace(/^# [^\n]+\n*/, "").trim() || result.answer,
          tags: ["folder-summary", ...titles],
          createdAt: new Date().toISOString(),
        });
        return;
      }
      const response = await requestHelena(request, {
        token,
        signal: AbortSignal.timeout(58_000),
      });
      const unexpected = uiText("A Olena respondeu em um formato inesperado. Tente de novo.");
      if (kind === "Flashcards") {
        const cards = parseStudyCards(response.answer);
        if (!cards) throw new Error(unexpected);
        const deck =
          titles
            .map((title) => title.replace(/\.[^.]+$/, ""))
            .join(" + ")
            .slice(0, 60) || uiText("Sem baralho");
        const owner = selectedSources[0]!;
        const today = toDateKey(new Date());
        let added = 0;
        for (const card of cards) {
          if (flashcards.some((item) => item.materialId === owner.id && item.front === card.front))
            continue;
          dispatch({
            type: "flashcard/added",
            deck,
            materialId: owner.id,
            subjectId,
            front: card.front,
            back: card.back,
            createdOn: today,
          });
          added += 1;
        }
        setCardsMessage({
          text: added
            ? uiText("{0} flashcards criados. Toque no baralho para estudar.", [String(added)])
            : uiText("Esses flashcards já estavam criados."),
          error: false,
        });
        return;
      }
      const questions = parseStudyQuestions(response.answer, difficulty === "easy" ? 3 : 4);
      if (!questions) throw new Error(unexpected);
      const exam = kind === "Simulados";
      dispatch({
        type: "material/added",
        collectionId: folder.id,
        subjectId,
        title: titles
          .map((title) => title.replace(/\.[^.]+$/, ""))
          .join(" + ")
          .slice(0, 80),
        kind: "text",
        content: JSON.stringify(
          toSourceQuiz(questions, difficulty, {
            id: selectedSources[0]!.id,
            title: titles.join(" + ").slice(0, 120),
          }),
        ),
        tags: [exam ? "folder-exam" : "folder-quiz", ...titles],
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : uiText("Não foi possível gerar com a Olena. Tente de novo."),
      );
    } finally {
      credits.reload();
      setBusy(false);
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
        {materials.map(({ id, title, kind, content }) => (
          <li key={id} className={removingIds.includes(id) ? "is-pulverizing" : undefined}>
            <div className="library-source-name">
              <img src="/room-icons/manual-words.svg" alt="" width="20" height="20" />
              {kind === "link" ? (
                <span>
                  <a href={content} target="_blank" rel="noopener noreferrer">
                    {title}
                  </a>
                  <small id={"link-note-" + id}>
                    {uiText(
                      "Só referência: o OlenaStudy não lê vídeos. Cole a transcrição ou suas anotações em uma nota em branco.",
                    )}
                  </small>
                </span>
              ) : (
                <span>{title}</span>
              )}
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
                aria-describedby={kind === "link" ? "link-note-" + id : undefined}
                disabled={
                  kind === "link" ||
                  (!selectedIds.includes(id) && selectedSources.length >= maxSelectedSources)
                }
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
          {readableMaterials.length > maxSelectedSources
            ? "Selecionar 3 fontes"
            : "Selecionar todas as fontes"}
        </span>
        <input
          type="checkbox"
          disabled={readableMaterials.length === 0}
          checked={
            readableMaterials.length > maxSelectedSources
              ? selectedSources.length === maxSelectedSources
              : readableMaterials.length > 0 && allSelected
          }
          onChange={({ currentTarget }) =>
            setSelectedIds(
              currentTarget.checked
                ? readableMaterials.slice(0, maxSelectedSources).map(({ id }) => id)
                : [],
            )
          }
        />
      </label>
      <small aria-live="polite">
        {uiText("{0} de {1} fontes selecionadas", [selectedSources.length, maxSelectedSources])}
      </small>
    </div>
  );

  const StudySession =
    openQuizMaterial?.tags?.[0] === "folder-exam" ? SourceExamStudy : SourceQuizStudy;
  if (openQuiz && openQuizMaterial)
    return (
      <StudySession
        title={openQuizMaterial.title}
        quiz={openQuiz}
        onClose={() => setOpenQuizId(undefined)}
        onComplete={(correct, total) =>
          dispatch({
            type: "quiz/recorded",
            subjectId,
            correct,
            total,
            completedAt: new Date().toISOString(),
          })
        }
      />
    );
  if (openDeck)
    return (
      <FlashcardStudy
        key={openDeck.id}
        title={openDeck.title}
        cards={openDeck.cards}
        sourceTitle={openDeck.sourceTitle}
        onFeedback={(id, event) => {
          const card = openDeck.cards.find((item) => item.id === id);
          noteFeedback(card?.origin, event);
          if (card) learnFromSignal(card, event.type !== "kept");
        }}
        onDiscard={(id) => dispatch({ type: "flashcard/removed", id })}
        onEdit={(id, front, back) => {
          const card = openDeck.cards.find((item) => item.id === id);
          if (!card) return;
          dispatch({
            type: "flashcard/updated",
            id,
            changes: {
              front,
              back,
              subjectId: card.subjectId,
              ...(card.deck ? { deck: card.deck } : {}),
            },
          });
        }}
        onReview={(id, rating, reviewedOn) =>
          dispatch({ type: "flashcard/reviewed", id, rating, reviewedOn })
        }
        onClose={() => setOpenDeckId(undefined)}
      />
    );
  return (
    <section className="library-folder-contents" aria-label={folder.title}>
      <OlenaCreditMeter usage={credits.usage} resetAt={credits.resetAt} spend={credits.spend} />
      <header>
        <button
          type="button"
          className="shelf-back"
          aria-label={uiText("Voltar à estante")}
          onClick={onBack}
        >
          <PaperArrow back />
        </button>
        <nav aria-label={uiText("Seções da pasta")}>
          {folderSections.map((label) => (
            <button
              className="shelf-wood-button"
              key={label}
              type="button"
              aria-pressed={section === label}
              onClick={() => {
                setSection(label);
                // Um erro de outra aba não fica grudado na tela.
                setError("");
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
              <img src="/room-icons/add.svg" alt="" /> {uiText("Adicionar fontes")}
            </button>
            <div className="library-source-drawer" data-open={showSources} inert={!showSources}>
              <div>
                <div className="library-study-type-menu" aria-label={uiText("Tipos de fonte")}>
                  <button
                    type="button"
                    className="shelf-wood-button"
                    onClick={() => {
                      setShowSources(false);
                      input.current?.click();
                    }}
                  >
                    <img src="/room-icons/upload.svg" alt="" /> {uiText("Enviar documento")}
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
                <p>{uiText("Envie PDFs ou imagens para começar")}</p>
                <button
                  type="button"
                  className="shelf-wood-button"
                  onClick={() => input.current?.click()}
                >
                  {uiText("Escolher um arquivo")}
                </button>
              </div>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="library-folder-generate">
              {showStudyTypes && selectedSources.length > 0 && (
                <div className="library-study-type-menu" id="library-study-types">
                  <p>
                    {uiText(
                      selectedSources.length === 1
                        ? "Criar a partir de {0} fonte"
                        : "Criar a partir de {0} fontes",
                      [selectedSources.length],
                    )}
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
                <img src="/room-icons/add.svg" alt="" /> {uiText("Criar material de estudo")}
              </button>
            </div>
          </>
        ) : (
          <>
            {section === "Resumo" && summaryBusy && (
              <div role="status" className="library-summary-card library-summary-loading">
                <span>
                  <img src="/room-icons/manual-words.svg" alt="" width="26" height="26" />
                  {uiText("Criando resumo…")}
                </span>
                <span className="library-summary-loading-track" aria-hidden="true" />
              </div>
            )}
            {section === "Resumo" && summaryError && <p role="alert">{summaryError}</p>}
            {section === "Flashcards" && cardsBusy && (
              <div role="status" className="library-summary-card library-summary-loading">
                <span>
                  <img src="/room-icons/flashcards.svg" alt="" width="26" height="26" />
                  {uiText("Criando flashcards…")}
                </span>
                <span className="library-summary-loading-track" aria-hidden="true" />
              </div>
            )}
            {section === "Flashcards" &&
              decks.map((deck) => (
                <article key={deck.id} className="library-summary-card">
                  {renamingDeckId === deck.id ? (
                    <form
                      className="library-summary-rename"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const title = String(
                          new FormData(event.currentTarget).get("title") ?? "",
                        ).trim();
                        if (!title) return;
                        for (const card of deck.cards)
                          dispatch({
                            type: "flashcard/updated",
                            id: card.id,
                            changes: {
                              front: card.front,
                              back: card.back,
                              subjectId: card.subjectId,
                              deck: title,
                            },
                          });
                        setRenamingDeckId(undefined);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setRenamingDeckId(undefined);
                      }}
                    >
                      <input
                        name="title"
                        aria-label={uiText("Nome do baralho")}
                        required
                        maxLength={80}
                        defaultValue={deck.title}
                        ref={(field) => {
                          if (field && field !== document.activeElement) {
                            field.focus();
                            field.select();
                          }
                        }}
                      />
                      <button
                        type="submit"
                        className="shelf-wood-button"
                        aria-label={uiText("Salvar nome")}
                      >
                        <ShelfToolIcon name="save" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="library-summary-open"
                      onClick={() => setOpenDeckId(deck.id)}
                    >
                      <img src="/room-icons/flashcards.svg" alt="" width="26" height="26" />
                      <span>
                        <strong>{deck.title}</strong>
                        <small>
                          {[deck.sourceTitle, uiText("{0} cartões", [String(deck.cards.length)])]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>
                    </button>
                  )}
                  <details className="library-summary-actions">
                    <summary className="shelf-wood-button" aria-label={"Opções de " + deck.title}>
                      <PaperEditorIcon name="more" />
                    </summary>
                    <div className="library-summary-popover">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.currentTarget.closest("details")?.removeAttribute("open");
                          setRenamingDeckId(deck.id);
                        }}
                      >
                        <ShelfToolIcon name="pen" /> {uiText("Renomear")}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.currentTarget.closest("details")?.removeAttribute("open");
                          for (const card of deck.cards)
                            dispatch({ type: "flashcard/removed", id: card.id });
                        }}
                      >
                        <ShelfToolIcon name="trash" /> {uiText("Excluir")}
                      </button>
                    </div>
                  </details>
                </article>
              ))}
            {section === "Flashcards" && cardsMessage && (
              <p role={cardsMessage.error ? "alert" : "status"}>{cardsMessage.text}</p>
            )}
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
                        aria-label={uiText("Nome do resumo")}
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
                      <button
                        type="submit"
                        className="shelf-wood-button"
                        aria-label={uiText("Salvar nome")}
                      >
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
                        <ShelfToolIcon name="pen" /> {uiText("Renomear")}
                      </button>
                      <button
                        type="button"
                        disabled={removingIds.includes(summary.id)}
                        onClick={(event) => {
                          event.currentTarget.closest("details")?.removeAttribute("open");
                          removeMaterial(summary.id);
                        }}
                      >
                        <ShelfToolIcon name="trash" /> {uiText("Excluir")}
                      </button>
                    </div>
                  </details>
                </article>
              ))}
            {(section === "Quizzes" || section === "Simulados") && (
              <>
                {quizBusy && (
                  <div className="library-summary-loading" role="status">
                    <img src="/room-icons/quiz.svg" alt="" width="30" height="30" />
                    {uiText(section === "Simulados" ? "Criando simulado…" : "Criando quiz…")}
                  </div>
                )}
                {quizError && <p role="alert">{quizError}</p>}
                {quizzes
                  .filter(
                    (item) =>
                      item.tags?.[0] === (section === "Simulados" ? "folder-exam" : "folder-quiz"),
                  )
                  .map((quiz) => (
                    <article
                      key={quiz.id}
                      className={
                        removingIds.includes(quiz.id)
                          ? "library-summary-card library-source-removing"
                          : "library-summary-card"
                      }
                    >
                      {renamingId === quiz.id ? (
                        <form
                          className="library-summary-rename"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const title = String(
                              new FormData(event.currentTarget).get("title") ?? "",
                            ).trim();
                            if (title) {
                              dispatch({
                                type: "material/updated",
                                id: quiz.id,
                                changes: { title },
                              });
                              setRenamingId(undefined);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setRenamingId(undefined);
                          }}
                        >
                          <input
                            name="title"
                            required
                            maxLength={80}
                            defaultValue={quiz.title}
                            aria-label={uiText(
                              section === "Simulados" ? "Nome do simulado" : "Nome do quiz",
                            )}
                            ref={(field) => {
                              if (field && field !== document.activeElement) {
                                field.focus();
                                field.select();
                              }
                            }}
                          />
                          <button
                            type="submit"
                            className="shelf-wood-button"
                            aria-label={uiText("Salvar nome")}
                          >
                            <ShelfToolIcon name="save" />
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="library-summary-open"
                          onClick={() => {
                            if (parseSourceQuiz(quiz.content)) setOpenQuizId(quiz.id);
                            else setQuizError(uiText("Este quiz está incompleto. Gere novamente."));
                          }}
                        >
                          <img
                            src={
                              section === "Simulados"
                                ? "/room-icons/mock-exam.svg"
                                : "/room-icons/quiz.svg"
                            }
                            width="28"
                            height="28"
                            alt=""
                          />
                          {quiz.title}
                        </button>
                      )}
                      <details className="library-summary-actions">
                        <summary
                          className="shelf-wood-button"
                          aria-label={uiText(
                            section === "Simulados" ? "Opções do simulado" : "Opções do quiz",
                          )}
                        >
                          <PaperEditorIcon name="more" />
                        </summary>
                        <div className="library-summary-popover">
                          <button
                            type="button"
                            onClick={(event) => {
                              setRenamingId(quiz.id);
                              event.currentTarget.closest("details")?.removeAttribute("open");
                            }}
                          >
                            <ShelfToolIcon name="pen" />
                            {uiText("Renomear")}
                          </button>
                          <button type="button" onClick={() => removeMaterial(quiz.id)}>
                            <ShelfToolIcon name="trash" />
                            {uiText("Excluir")}
                          </button>
                        </div>
                      </details>
                    </article>
                  ))}
              </>
            )}
            {(section !== "Resumo" || (!summaryBusy && summaries.length === 0)) &&
              !(section === "Flashcards" && (cardsBusy || cardsMessage || decks.length > 0)) &&
              !(
                (section === "Quizzes" || section === "Simulados") &&
                (quizBusy ||
                  quizzes.some(
                    (item) =>
                      item.tags?.[0] === (section === "Simulados" ? "folder-exam" : "folder-quiz"),
                  ))
              ) && (
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
                  {uiText(
                    "No Goodnotes, abra o caderno, escolha Compartilhar e exporte como PDF. Selecione o PDF exportado para adicioná-lo à pasta.",
                  )}
                </p>
                <button
                  type="button"
                  className="shelf-wood-button"
                  onClick={() => {
                    setSourceType(undefined);
                    input.current?.click();
                  }}
                >
                  {uiText("Escolher PDF")}
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
                    {uiText("Link do vídeo")} <input name="content" type="url" required />
                  </label>
                ) : (
                  <>
                    <label>
                      {uiText("Título")} <input name="title" maxLength={80} required />
                    </label>
                    <label>
                      {uiText("Nota")} <textarea name="content" maxLength={20000} required />
                    </label>
                  </>
                )}
                {error && <p role="alert">{error}</p>}
                <button type="submit" className="shelf-wood-button">
                  {uiText("Adicionar fonte")}
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
                {uiText("Gerar resumo estruturado com a Olena")}
              </button>
            )}
            <div className="library-summary-paper">
              <SummaryMarkdown content={readingSummary.content} />
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
              <span>{uiText("Selecionar fontes")}</span>
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
                {uiText("Adicionar fontes")}
              </button>
            )}
            <p>
              {uiText("Ao gerar com a Olena, o texto das fontes selecionadas é enviado a ela.")}
            </p>
            <p>
              {uiText(
                "A Olena usa IA e erra: confira o resultado. Cada geração gasta créditos da Olena, conforme o tamanho do texto, e o saldo do dia é dividido entre todos. Precisa da conta conectada.",
              )}
            </p>
            {creating === "Flashcards" && (
              <p>
                {uiText(
                  "Flashcards com IA: cerca de 12 afirmações para julgar como verdadeiras ou falsas, feitas a partir das fontes.",
                )}
              </p>
            )}
            {(creating === "Quizzes" || creating === "Simulados") && (
              <>
                <div className="library-quiz-settings">
                  {(
                    [
                      [
                        "Dificuldade",
                        [
                          ["easy", "Fácil"],
                          ["medium", "Médio"],
                          ["hard", "Difícil"],
                        ],
                      ],
                      [
                        "Tamanho",
                        [
                          ["short", "Curto"],
                          ["medium", "Médio"],
                          ["long", "Longo"],
                        ],
                      ],
                    ] as const
                  ).map(([label, choices]) => (
                    <fieldset key={label}>
                      <legend>{uiText(label)}</legend>
                      {choices.map(([value, name]) => (
                        <button
                          type="button"
                          key={value}
                          className="shelf-wood-button"
                          aria-pressed={
                            (label === "Dificuldade" ? difficulty : quizLength) === value
                          }
                          onClick={() =>
                            label === "Dificuldade"
                              ? setDifficulty(value as QuizDifficulty)
                              : setQuizLength(value as QuizLength)
                          }
                        >
                          {uiText(name)}
                        </button>
                      ))}
                    </fieldset>
                  ))}
                </div>
                <p>
                  {uiText(
                    creating === "Simulados"
                      ? "Simulado com IA: de 10 a 20 questões, com 1 ponto e 2 minutos por questão. Fácil tem 3 alternativas; Médio e Difícil têm 4. As respostas vêm da IA e podem estar erradas: confira com o gabarito oficial."
                      : "Quiz com IA: de 5 a 15 questões, conforme o tamanho. Fácil tem 3 alternativas; Médio e Difícil têm 4.",
                  )}
                </p>
              </>
            )}
            {selectedSources.length > 0 && (
              <p>{uiText("Custo estimado deste pedido: até {0} créditos.", [String(cost)])}</p>
            )}
            {balance !== undefined && balance > 0 && cost > balance && (
              <p role="alert">
                {uiText(
                  "O saldo de hoje ({0} créditos) pode não cobrir este pedido. A conta final costuma ser menor.",
                  [String(balance)],
                )}
              </p>
            )}
            {noCredits && (
              <p role="alert">
                {uiText("Sem créditos hoje. Você pode gerar de novo às {0}.", [resetClock])}
              </p>
            )}
            <button
              type="button"
              className="shelf-wood-button library-study-confirm-generate"
              disabled={
                noCredits ||
                !selectedSources.length ||
                (creating === "Resumo"
                  ? summaryBusy
                  : creating === "Flashcards"
                    ? cardsBusy
                    : quizBusy)
              }
              onClick={() => void generateWithOlena(creating as OlenaKind)}
            >
              {uiText("Gerar com a Olena")}
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
            const limit =
              kind === "image"
                ? MAX_IMAGE_INPUT_BYTES
                : kind === "pdf"
                  ? MAX_PDF_BYTES
                  : MAX_SOURCE_BYTES;
            if (!kind || file.size > limit) {
              setError(
                uiText(
                  "Escolha um PDF de até 5 MB, um TXT ou Markdown de até 1 MB, ou uma imagem de até 25 MB.",
                ),
              );
              return;
            }
            try {
              const content =
                kind === "text"
                  ? decodeText(new Uint8Array(await file.arrayBuffer()))
                  : kind === "image"
                    ? await imageDataUrl(file)
                    : await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(file);
                      });
              // Tudo isto vai para o espaço de trabalho sincronizado: passar do teto da conta
              // pararia a sincronização, então a conta recusa antes de gravar.
              if (!fitsLibrary(libraryChars, content.length)) {
                setError(
                  uiText(
                    "A Biblioteca chegou ao limite de espaço da conta. Remova uma fonte para enviar outra.",
                  ),
                );
                return;
              }
              dispatch({
                type: "material/added",
                collectionId: folder.id,
                subjectId,
                title: file.name,
                kind,
                content,
                createdAt: new Date().toISOString(),
              });
            } catch (failure) {
              setError(
                failure instanceof Error && failure.message === "image-too-large"
                  ? uiText(
                      "A imagem continua grande demais mesmo reduzida. Tire a foto mais de perto ou envie um PDF.",
                    )
                  : uiText("Não foi possível abrir o arquivo."),
              );
            }
          }}
        />
      </div>
    </section>
  );
}
