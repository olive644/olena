import { SourceExamStudy } from "../components/source-exam-study";
import { SourceQuizStudy } from "../components/source-quiz-study";
import {
  parseSourceQuiz,
  type QuizDifficulty,
  type QuizLength,
  type SourceQuiz,
} from "../domain/source-quiz";
import type { StructuredDocument } from "../domain/pdf-summary/types";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { dataUrlBytes } from "../data/data-url";
import { streamHelena } from "../data/helena-client";
import { OCR_WORKER_OPTIONS } from "../components/handwriting-ocr";
import type { HelenaRequest } from "../ai/helena-contract";
import { PaperEditorIcon } from "../components/paper-editor-icon";
import { PaperCloseIcon } from "../components/paper-close-icon";
import { PaperArrow } from "../components/paper-arrow";
import { ShelfToolIcon } from "../components/shelf-tool-icon";
import { PaperDigits } from "../components/paper-digits";
import { LibraryDialog } from "../components/library-dialog";
import { FlashcardStudy } from "../components/flashcard-study";
import { noteFeedback, type CardOrigin } from "../domain/flashcard-feedback";
import { cardFeatures, learnFromSignal, loadModel, shouldHide } from "../domain/flashcard-quality";
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
  MAX_IMAGE_INPUT_BYTES,
  MAX_SOURCE_BYTES,
  decodeText,
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
// O resumo automático é grátis e roda no aparelho: sempre o maior que o texto comporta.
const SUMMARY_DETAIL = "long" as const;
type SummaryModule = typeof import("../domain/pdf-summary");
type SourceEngine<T> = {
  text: (text: string, title: string) => Promise<T>;
  pdf: (
    pdf: Parameters<SummaryModule["summarizePdf"]>[0],
    options: NonNullable<Parameters<SummaryModule["summarizePdf"]>[1]>,
  ) => Promise<T>;
};
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

/** Mensagem para o erro de uma prova sem gabarito ou só com figuras, ou undefined para outros erros. */
function examErrorText(error: unknown): string | undefined {
  if (!(error instanceof Error) || error.name !== "ExamError") return undefined;
  switch ((error as Error & { reason?: string }).reason) {
    case "needs-figures":
      return uiText(
        "As questões dessa prova dependem de figuras ou gráficos que o texto do PDF não traz.",
      );
    case "only-answer-key":
      return uiText("Esse arquivo é só um gabarito. Selecione junto a prova a que ele pertence.");
    case "ambiguous-key":
      return uiText(
        "O gabarito tem várias provas ou versões e não deu para saber qual é a desta prova. Selecione um gabarito só dela.",
      );
    default:
      return uiText(
        "Essa prova não traz o gabarito, então não dá para saber as respostas. Envie o gabarito no mesmo arquivo ou como outra fonte selecionada junto.",
      );
  }
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
  // Link (YouTube) é só referência: o app não lê vídeos, então não entra nos geradores.
  const readableMaterials = materials.filter(({ kind }) => kind !== "link");
  const maxSelectedSources = 3;
  const allSelected = selectedSources.length === readableMaterials.length;
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
            if (!bytes) throw new Error("Não consegui abrir o PDF " + source.title + ".");
            const loading = pdfjs.getDocument({ data: bytes });
            try {
              const pdf = await loading.promise.catch(() => {
                throw new Error("Não consegui abrir o PDF " + source.title + ".");
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
            kind: "material" as const,
            title: source.title.slice(0, 200),
            content: excerpt,
          });
        }
      } finally {
        await scanner?.terminate();
      }
      // Pela transmissão em fluxo: a resposta sem fluxo tem 20 s de limite no servidor, e um guia de
      // de muitos tokens costuma passar disso, o que chegava ao aluno como "Serviço indisponível".
      const result = await streamHelena(
        {
          version: 1,
          capability: "summarize",
          prompt:
            "Escreva um guia de estudo em português brasileiro usando apenas as fontes fornecidas. Sintetize em palavras próprias e organize por assunto. Comece com # e um título curto. Use de 4 a 7 seções com títulos ## numerados, parágrafos curtos, - para listas e **negrito** para termos-chave. Intercale pelo menos três caixas com uma linha inteira começando por > e um rótulo em negrito, por exemplo Definição, Atenção, Cronologia ou Ponto essencial. Inclua datas, exemplos ou cálculos quando sustentados pelas fontes. Preserve números e fatos. Indique lacunas quando os trechos forem incompletos. Seja conciso: no máximo 600 palavras no total. Entregue somente o guia, sem bloco de código.",
          sources,
          privacy: { consent: true, retention: "none" },
        },
        { token, onText: () => {} },
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
  /** Lê uma fonte (texto, imagem por OCR ou PDF) no aparelho e entrega ao gerador escolhido. */
  async function readSource<T>(
    source: (typeof selectedSources)[number],
    fileTitle: string,
    engine: SourceEngine<T>,
  ): Promise<T> {
    let result: T;
    if (source.kind === "link")
      throw new Error(
        uiText("{0} é um link e não pode ser lido. Use uma nota em branco com o texto.", [
          source.title,
        ]),
      );
    if (source.kind === "image") {
      // Foto ou imagem de página: o OCR em português lê o texto, no aparelho.
      const { createWorker } = await import("tesseract.js");
      const scanner = await createWorker("por", 1, OCR_WORKER_OPTIONS);
      try {
        const text = (await scanner.recognize(source.content)).data.text;
        result = await engine.text(text, fileTitle);
      } finally {
        await scanner.terminate();
      }
    } else if (source.kind === "text") {
      result = await engine.text(source.content, fileTitle);
    } else {
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
        // Páginas que são só imagem (PDF escaneado) passam pelo OCR em português, no aparelho.
        let scanner: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | undefined;
        try {
          result = await engine.pdf(pdf, {
            title: fileTitle,
            ocr: async (pageNumber) => {
              const page = await pdf.getPage(pageNumber);
              const viewport = page.getViewport({ scale: 1 });
              const scaled = page.getViewport({
                scale: 2000 / Math.max(viewport.width, viewport.height),
              });
              const canvas = document.createElement("canvas");
              canvas.width = Math.ceil(scaled.width);
              canvas.height = Math.ceil(scaled.height);
              await page.render({ canvas, viewport: scaled }).promise;
              if (!scanner) {
                const { createWorker } = await import("tesseract.js");
                scanner = await createWorker("por", 1, OCR_WORKER_OPTIONS);
              }
              const text = (await scanner.recognize(canvas)).data.text;
              canvas.width = 0;
              canvas.height = 0;
              return text;
            },
          });
        } finally {
          await scanner?.terminate();
        }
      } finally {
        await loading.destroy();
      }
    }
    return result;
  }
  async function generateQuiz() {
    const exam = creating === "Simulados";
    if (quizBusy || !selectedSources.length) return;
    setCreating(undefined);
    setSection(exam ? "Simulados" : "Quizzes");
    setQuizBusy(true);
    setQuizError("");
    try {
      const { examProblem, examQuizQuestions, quizQuestionsFromDocument, splitExams } =
        await import("../domain/pdf-summary");
      const documents = await readDocuments();
      const { exams, others, keyFiles } = splitExams(documents);
      if (exams.length === 0 && others.length === 0 && keyFiles.length > 0)
        throw Object.assign(new Error("ExamError"), {
          name: "ExamError",
          reason: "only-answer-key",
        });
      // Prova do usuário: as questões e o gabarito do arquivo, sem reescrever nada.
      const examLimit = quizLength === "short" ? 10 : quizLength === "long" ? 50 : 20;
      const fromExams: SourceQuiz["questions"] = [];
      let problem: Error | undefined;
      for (const item of exams) {
        const found = examProblem(item.exam);
        if (found) {
          problem ??= found;
          continue;
        }
        const all = examQuizQuestions(item.exam);
        const step = all.length / Math.min(examLimit, all.length);
        for (let index = 0; index < Math.min(examLimit, all.length); index += 1)
          fromExams.push({
            ...all[Math.floor(index * step)]!,
            sourceId: item.source.id,
            sourceTitle: item.source.title,
          });
      }
      // Texto comum: perguntas de definição, ano, valor e afirmação, com alternativas do mesmo tipo.
      const textLimit = quizLength === "short" ? 5 : quizLength === "long" ? 15 : 10;
      const generated: SourceQuiz["questions"] = [];
      for (const item of others) {
        const made = await quizQuestionsFromDocument(
          item.doc,
          difficulty,
          Math.ceil(textLimit / Math.max(1, others.length)),
        );
        generated.push(
          ...made.map((question) => ({
            ...question,
            sourceId: item.source.id,
            sourceTitle: item.source.title,
          })),
        );
      }
      if (problem && fromExams.length === 0 && generated.length === 0) throw problem;
      const quiz: SourceQuiz = {
        version: 1,
        difficulty,
        questions: [...fromExams, ...generated].slice(0, 100),
      };
      if (!quiz.questions.length)
        throw new Error(
          uiText(
            "Não encontrei fatos suficientes para criar alternativas confiáveis. Tente uma fonte com mais conteúdo.",
          ),
        );
      dispatch({
        type: "material/added",
        collectionId: folder.id,
        subjectId,
        title: selectedSources
          .map((s) => s.title.replace(/\.[^.]+$/, ""))
          .join(" + ")
          .slice(0, 80),
        kind: "text",
        content: JSON.stringify(quiz),
        tags: [exam ? "folder-exam" : "folder-quiz", ...selectedSources.map((s) => s.title)],
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      setQuizError(
        examErrorText(error) ??
          (error instanceof Error ? error.message : uiText("Não foi possível gerar o quiz.")),
      );
    } finally {
      setQuizBusy(false);
    }
  }
  /** Flashcards automáticos: no aparelho, sem IA, o máximo que o texto sustenta. */
  /** Lê as fontes selecionadas como documentos, no aparelho (texto, OCR ou PDF). */
  async function readDocuments() {
    const { documentFromPdf, documentFromText } = await import("../domain/pdf-summary");
    const read: {
      source: (typeof selectedSources)[number];
      fileTitle: string;
      doc: StructuredDocument;
    }[] = [];
    for (const source of selectedSources) {
      const fileTitle = source.title.replace(/\.[^.]+$/, "");
      const doc = await readSource(source, fileTitle, {
        text: async (text, title) => documentFromText(text, title),
        pdf: (pdf, options) => documentFromPdf(pdf, options),
      });
      read.push({ source, fileTitle, doc });
    }
    return read;
  }
  async function generateAutomaticFlashcards() {
    if (cardsBusy || !selectedSources.length) return;
    setCreating(undefined);
    setSection("Flashcards");
    setCardsMessage(undefined);
    setCardsBusy(true);
    try {
      const { examFlashcards, examProblem, flashcardsFromDocument, splitExams } =
        await import("../domain/pdf-summary");
      let hidden = 0;
      const made: {
        sourceId: string;
        deck: string;
        front: string;
        back: string;
        page: number;
        kind: CardOrigin;
      }[] = [];
      const documents = await readDocuments();
      const { exams, others, keyFiles } = splitExams(documents);
      if (exams.length === 0 && others.length === 0 && keyFiles.length > 0)
        throw Object.assign(new Error("ExamError"), {
          name: "ExamError",
          reason: "only-answer-key",
        });
      const sets: {
        source: (typeof selectedSources)[number];
        fileTitle: string;
        cards: Awaited<ReturnType<typeof flashcardsFromDocument>>;
      }[] = [];
      let problem: Error | undefined;
      for (const item of exams) {
        const found = examProblem(item.exam);
        if (found) problem ??= found;
        else
          sets.push({
            source: item.source,
            fileTitle: item.fileTitle,
            cards: examFlashcards(item.exam),
          });
      }
      for (const item of others)
        sets.push({
          source: item.source,
          fileTitle: item.fileTitle,
          cards: await flashcardsFromDocument(item.doc),
        });
      if (problem && !sets.some((set) => set.cards.length > 0)) throw problem;
      for (const { source, fileTitle, cards } of sets) {
        if (cards.length === 0) {
          throw new Error(
            uiText("Não consegui criar flashcards de {0}: o texto tem poucas definições e fatos.", [
              source.title,
            ]),
          );
        }
        const deck = fileTitle.replace(/[-_]+/g, " ").trim() || source.title;
        // O filtro aprendido neste aparelho deixa de fora cartões parecidos com os que o usuário
        // já descartou. Só age depois de avaliações suficientes e nunca esvazia o baralho.
        const model = loadModel();
        const strong = cards.filter(
          (card) => !shouldHide(model, cardFeatures(card.front, card.back, card.kind)),
        );
        const usable = strong.length >= 4 ? strong : cards;
        hidden += cards.length - usable.length;
        for (const card of usable) {
          const repeated = flashcards.some(
            (item) => item.materialId === source.id && item.front === card.front,
          );
          if (!repeated)
            made.push({
              sourceId: source.id,
              deck,
              front: card.front,
              back: card.back,
              page: card.page,
              kind: card.kind,
            });
        }
      }
      const today = toDateKey(new Date());
      for (const card of made) {
        dispatch({
          type: "flashcard/added",
          deck: card.deck,
          materialId: card.sourceId,
          sourcePage: card.page,
          origin: card.kind,
          subjectId,
          front: card.front,
          back: card.back,
          createdOn: today,
        });
      }
      setCardsMessage({
        text: made.length
          ? uiText("{0} flashcards criados. Toque no baralho para estudar.", [
              String(made.length),
            ]) +
            (hidden ? " " + uiText("{0} cartões fracos ficaram de fora.", [String(hidden)]) : "")
          : uiText("Esses flashcards já estavam criados."),
        error: false,
      });
    } catch (error) {
      setCardsMessage({
        text:
          examErrorText(error) ??
          (error instanceof Error
            ? error.message
            : uiText("Não foi possível criar os flashcards.")),
        error: true,
      });
    } finally {
      setCardsBusy(false);
    }
  }
  /** Resumo automático: feito no aparelho, sem IA e sem enviar nada para fora. */
  async function generateAutomaticSummary() {
    if (summaryBusy || !selectedSources.length) return;
    setCreating(undefined);
    setSection("Resumo");
    setSummaryError("");
    setSummaryBusy(true);
    try {
      const { summarizePdf, summarizePlainText } = await import("../domain/pdf-summary");
      const made: { title: string; sourceTitle: string; markdown: string }[] = [];
      for (const source of selectedSources) {
        const fileTitle = source.title.replace(/\.[^.]+$/, "");
        const result = await readSource(source, fileTitle, {
          text: (text, title) => summarizePlainText(text, title, { detail: SUMMARY_DETAIL }),
          pdf: (pdf, options) => summarizePdf(pdf, { ...options, detail: SUMMARY_DETAIL }),
        });
        if (result.stats.sentences === 0) {
          throw new Error(
            uiText(
              "Não encontrei texto em {0}, nem lendo as imagens. Se a foto estiver torta ou borrada, tente outra ou use a Olena.",
              [source.title],
            ),
          );
        }
        made.push({
          title: result.title.slice(0, 80) || fileTitle || "Resumo",
          sourceTitle: source.title,
          markdown: result.markdown.replace(/^# [^\n]+\n*/, "").trim(),
        });
      }
      for (const item of made) {
        dispatch({
          type: "material/added",
          collectionId: folder.id,
          subjectId,
          title: item.title,
          kind: "text",
          content: item.markdown,
          tags: ["folder-summary", item.sourceTitle],
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      setSummaryError(
        error instanceof Error ? error.message : uiText("Não foi possível gerar o resumo."),
      );
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
            {creating === "Resumo" && (
              <p>
                {uiText(
                  "Resumo automático: grátis, feito no seu aparelho, sem IA. Escolhe as frases mais importantes do próprio arquivo.",
                )}
              </p>
            )}
            {creating === "Resumo" && (
              <p>
                {uiText("Ao gerar com a Olena, o texto das fontes selecionadas é enviado a ela.")}
              </p>
            )}
            {creating === "Flashcards" && (
              <p>
                {uiText(
                  "Flashcards automáticos: grátis, feitos no seu aparelho, sem IA. Cria o máximo de afirmações de verdadeiro ou falso que o próprio arquivo permite.",
                )}
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
                <p>
                  {uiText(
                    creating === "Simulados"
                      ? "Simulado automático no aparelho. Até 5, 10 ou 15 questões conforme as fontes, com 1 ponto e 2 minutos por questão. Fácil tem 3 alternativas; Médio e Difícil têm 4."
                      : "Quiz automático no aparelho. Até 5, 10 ou 15 questões, conforme o conteúdo das fontes. Fácil tem 3 alternativas; Médio e Difícil têm 4, priorizando números próximos no Difícil.",
                  )}
                </p>
                <button
                  type="button"
                  className="shelf-wood-button library-study-confirm-generate"
                  disabled={!selectedSources.length || quizBusy}
                  onClick={() => void generateQuiz()}
                >
                  {uiText(creating === "Simulados" ? "Gerar simulado" : "Quiz automático")}
                </button>
              </>
            ) : creating === "Flashcards" ? (
              <button
                type="button"
                className="shelf-wood-button library-study-confirm-generate"
                disabled={!selectedSources.length || cardsBusy}
                onClick={() => void generateAutomaticFlashcards()}
              >
                {uiText("Flashcards automáticos")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="shelf-wood-button library-study-confirm-generate"
                  disabled={creating !== "Resumo" || !selectedSources.length || summaryBusy}
                  onClick={() => void generateSummary()}
                >
                  {uiText("Gerar com a Olena")}
                </button>
                <button
                  type="button"
                  className="shelf-wood-button library-study-confirm-generate"
                  disabled={creating !== "Resumo" || !selectedSources.length || summaryBusy}
                  onClick={() => void generateAutomaticSummary()}
                >
                  {uiText("Resumo automático")}
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
            setError("");
            const kind = /\.pdf$/i.test(file.name)
              ? "pdf"
              : /\.(png|jpe?g|webp)$/i.test(file.name)
                ? "image"
                : /\.(txt|md)$/i.test(file.name)
                  ? "text"
                  : undefined;
            if (
              !kind ||
              file.size > (kind === "image" ? MAX_IMAGE_INPUT_BYTES : MAX_SOURCE_BYTES)
            ) {
              setError(
                uiText("Escolha um PDF, TXT ou Markdown de até 1 MB, ou uma imagem de até 25 MB."),
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
