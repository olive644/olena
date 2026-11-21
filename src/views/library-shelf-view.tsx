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
import { parseStudyCards, parseStudyQuestions } from "../ai/study-output";
import { OlenaCreditMeter } from "./olena-credits";
import { useOlenaCredits } from "./use-olena-credits";
import { shelfSkinRequirement, shelfSkinUnlocked } from "../domain/shelf-skins";
import { LibraryTypewriter } from "../components/library-typewriter";
import { LibraryFolderSources } from "../components/library-folder-sources";
import { libraryFolderShapes } from "../domain/library-folder-shapes";
import { SourceExamStudy } from "../components/source-exam-study";
import { SourceQuizStudy } from "../components/source-quiz-study";
import { parseSourceQuiz, type QuizDifficulty, type QuizLength } from "../domain/source-quiz";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { dataUrlBytes } from "../data/data-url";
import { requestHelena, streamHelena } from "../data/helena-client";
import { OCR_WORKER_OPTIONS } from "../components/handwriting-ocr";
import type { HelenaRequest } from "../ai/helena-contract";
import { PaperEditorIcon } from "../components/paper-editor-icon";
import { PaperCloseIcon } from "../components/paper-close-icon";
import { PaperArrow } from "../components/paper-arrow";
import { ShelfToolIcon } from "../components/shelf-tool-icon";
import { PaperDigits } from "../components/paper-digits";
import { LibraryDialog } from "../components/library-dialog";
import { FlashcardStudy } from "../components/flashcard-study";
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
  dispatch,
  onBack,
}: {
  flashcards?: readonly Flashcard[];
  folder: NonNullable<WorkspaceState["libraryCollections"]>[number];
  materials: WorkspaceState["materials"];
  subjectId: string;
  dispatch: Dispatch<WorkspaceAction>;
  onBack: () => void;
}) {
  const credits = useOlenaCredits();
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedSources = materials.filter(({ id }) => selectedIds.includes(id));
  const creationCost = creating
    ? estimateOlenaCredits(creating as OlenaKind, selectedSources, quizLength)
    : 0;
  const balance = credits.usage?.remainingCredits;
  const noCredits = balance !== undefined && balance <= 0;
  const resetClock = credits.resetAt
    ? new Date(credits.resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const maxSelectedSources = 3;
  const allSelected = selectedSources.length === materials.length;
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const uploadOrigin = useRef<"goodnotes" | undefined>(undefined);

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
                disabled={
                  materials.find((source) => source.id === id)?.kind === "link" ||
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
        onReview={(id, rating, reviewedOn) =>
          dispatch({ type: "flashcard/reviewed", id, rating, reviewedOn })
        }
        onClose={() => setOpenDeckId(undefined)}
      />
    );
  return (
    <section className="library-folder-contents" aria-label={folder.title}>
      <header>
        <div className="library-folder-topline">
          <button
            type="button"
            className="shelf-back"
            aria-label={uiText("Voltar à estante")}
            onClick={onBack}
          >
            <PaperArrow back />
          </button>
          {credits.usage ? (
            <OlenaCreditMeter
              compact
              usage={credits.usage}
              resetAt={credits.resetAt}
              spend={credits.spend}
            />
          ) : (
            <button
              type="button"
              className="library-credit-unavailable"
              onClick={credits.retry}
              aria-label={uiText(
                credits.status === "loading"
                  ? "Consultando créditos"
                  : credits.status === "signed-out"
                    ? "Entre na conta para consultar seus créditos"
                    : "Saldo indisponível. Tentar novamente",
              )}
              title={uiText(
                credits.status === "signed-out"
                  ? "Entre na conta para consultar seus créditos"
                  : "Consultar saldo de créditos",
              )}
            >
              <span className="olena-credits-gem" aria-hidden="true" />
              <span>{credits.status === "loading" ? "…" : "—"}</span>
            </button>
          )}
        </div>
        <nav aria-label={uiText("Seções da pasta")}>
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
                      uploadOrigin.current = undefined;
                      input.current?.click();
                    }}
                  >
                    <img src="/room-icons/upload.svg" alt="" /> {uiText("Enviar documento")}
                  </button>
                  {(
                    [
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
                  onClick={() => {
                    uploadOrigin.current = undefined;
                    input.current?.click();
                  }}
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
                    uploadOrigin.current = "goodnotes";
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
            <div className="library-creation-cost" role="status">
              <span>{uiText("Custo para criar com a Olena")}</span>
              <strong>
                {selectedSources.length ? (
                  <>
                    {uiText("Custo estimado deste pedido: até")}{" "}
                    <PaperDigits value={String(creationCost)} /> {uiText("créditos.")}
                  </>
                ) : (
                  uiText("Selecione as fontes")
                )}
              </strong>
            </div>
            <p className="library-creation-cost-note">
              {uiText("Ao gerar com a Olena, o texto das fontes selecionadas é enviado a ela.")}
            </p>
            <p className="library-creation-cost-note">
              {uiText("Cada geração gasta créditos da Olena, conforme o tamanho do texto.")}
            </p>
            {creating === "Simulados" && (
              <p className="library-creation-cost-note">
                {uiText(
                  "As respostas vêm da IA e podem estar erradas: confira com o gabarito oficial.",
                )}
              </p>
            )}
            {balance !== undefined && balance > 0 && creationCost > balance && (
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
            {creating !== "Resumo" &&
              creating !== "Flashcards" &&
              creating !== "Quizzes" &&
              creating !== "Simulados" && (
                <p>{uiText("A geração deste tipo de material ainda não está disponível.")}</p>
              )}
            {creating === "Quizzes" || creating === "Simulados" ? (
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
                <button
                  type="button"
                  className="shelf-wood-button library-study-confirm-generate"
                  disabled={noCredits || !selectedSources.length || quizBusy}
                  onClick={() =>
                    void generateWithOlena(creating === "Simulados" ? "Simulados" : "Quizzes")
                  }
                >
                  {uiText("Gerar com a Olena")}
                </button>
              </>
            ) : creating === "Flashcards" ? (
              <button
                type="button"
                className="shelf-wood-button library-study-confirm-generate"
                disabled={noCredits || !selectedSources.length || cardsBusy}
                onClick={() => void generateWithOlena("Flashcards")}
              >
                {uiText("Gerar com a Olena")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="shelf-wood-button library-study-confirm-generate"
                  disabled={
                    noCredits || creating !== "Resumo" || !selectedSources.length || summaryBusy
                  }
                  onClick={() => void generateWithOlena("Resumo")}
                >
                  {uiText("Gerar com a Olena")}
                </button>
              </>
            )}
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
            const origin = uploadOrigin.current;
            uploadOrigin.current = undefined;
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
                ...(origin === "goodnotes" ? { tags: ["source-goodnotes"] } : {}),
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
