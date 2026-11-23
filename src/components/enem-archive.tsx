import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { EnemAnswerCard } from "./enem-answer-card";
import { answerRows } from "../data/enem-answer-rows";
import { EnemSubmissionResult } from "./enem-submission-result";
import type { EnemLanguage } from "../data/enem-tri";
import { createMathSound } from "../data/math-sound";
import { enemPdfUrl } from "../data/enem-pdf-url";
import { enemSections, type EnemSection } from "../data/enem-sections";
import { LibraryDialog } from "./library-dialog";
import { createPortal } from "react-dom";
import { HelenaLoading } from "./helena-loading";
import { loadEnemCatalog, type EnemCatalog } from "../data/enem-catalog";
import { uiText } from "../i18n/runtime";
import { PaperArrow } from "./paper-arrow";
import { FocusPaperArrow } from "./focus-paper-arrow";
import { PaperCheckIcon } from "./paper-check-icon";
import { PaperCloseIcon } from "./paper-close-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import { PaperDigits } from "./paper-digits";
import type { StudyMaterial } from "../domain/workspace";
import type { Dispatch } from "react";
import type { WorkspaceAction, WorkspaceState } from "../domain/workspace";
import { paperProgress, sectionAttempt, type Progress } from "../data/enem-progress";
import "./enem-archive.css";
const PdfReader = lazy(() => import("./library-pdf-reader"));
const EnemEssayWriting = lazy(() =>
  import("./enem-essay-writing").then((module) => ({ default: module.EnemEssayWriting })),
);
type Paper = EnemCatalog["papers"][number];
type ArchiveProps = {
  onBack(): void;
  scope: string;
  workspace?: WorkspaceState;
  collectionId?: string;
  dispatch?: Dispatch<WorkspaceAction>;
};
type History = Record<string, Progress>;
function readHistory(key: string, ids: ReadonlySet<string>): History {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(([id, p]) => ids.has(id) && p && typeof p === "object"),
    );
  } catch {
    return {};
  }
}
function dayLabel(day: number) {
  return day === 0 ? uiText("Dia único") : `${day}º ${uiText("dia")}`;
}
function Bookmark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7 2h16l4 4v24l-11-6-11 6V6Zm9 5-2.5 5-5.5.8 4 3.9-.9 5.5 4.9-2.6 4.9 2.6-.9-5.5 4-3.9-5.5-.8Z"
      />
    </svg>
  );
}
function SectionIcon({ section }: { section: EnemSection }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" style={{ color: section.color }}>
      <path fill="currentColor" opacity=".2" d="M4 2h27l7 7v27H2V7Z" />
      {section.id === "essay" ? (
        <path fill="currentColor" d="m9 26 17-19 7 7-18 18-9 2Zm4-1 4 4 12-15-3-3Z" />
      ) : section.id === "math" ? (
        <path
          fill="currentColor"
          d="M8 10h12v4H8Zm4-4h4v12h-4Zm12 5h10v4H24ZM8 25h12v4H8Zm17-3 3 3 3-3 3 3-3 3 3 3-3 3-3-3-3 3-3-3 3-3-3-3Z"
        />
      ) : section.id === "nature" ? (
        <>
          <path fill="currentColor" d="M14 5h12v4h-3v9l9 14H8l9-14V9h-3Zm6 15-6 9h12Z" />
          <path fill="white" d="M20 23h2v3h-2Z" />
        </>
      ) : section.id === "languages" ? (
        <path fill="currentColor" d="M6 8h28v20H19l-8 7v-7H6Zm5 5v3h18v-3Zm0 7v3h13v-3Z" />
      ) : (
        <>
          <circle fill="currentColor" cx="20" cy="19" r="13" />
          <path
            fill="none"
            stroke="white"
            strokeWidth="2"
            d="M8 19h24M20 6c-8 7-8 19 0 26 8-7 8-19 0-26Z"
          />
        </>
      )}
    </svg>
  );
}
function ExamActionIcon({
  kind,
}: {
  kind: "print" | "download" | "versions" | "answers" | "external";
}) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={`enem-action-icon is-${kind}`}>
      {kind === "external" ? (
        <>
          <path
            fill="currentColor"
            d="M17 2h13v13h-5V10L14 21l-4-4L21 6h-4ZM2 8h11v5H7v13h13v-6h5v11H2Z"
          />
          <path fill="white" opacity=".4" d="M17 2h13l-5 4h-8Z" />
        </>
      ) : kind === "answers" ? (
        <>
          <path fill="currentColor" d="M5 2h17l5 5v23H5Z" />
          <path
            fill="white"
            d="m8 11 2-2 2 2 3-4 2 2-5 6Zm0 9 2-2 2 2 3-4 2 2-5 6Zm10-9h6v2h-6Zm0 9h6v2h-6Z"
          />
        </>
      ) : kind === "print" ? (
        <>
          <path
            fill="currentColor"
            d="M8 2h16v8h4l3 4v12h-7v5H8v-5H1V14l3-4h4Zm3 20v6h10v-6ZM10 5v5h12V5Z"
          />
          <path fill="white" d="M5 15h4v3H5z" />
        </>
      ) : kind === "download" ? (
        <>
          <path fill="currentColor" d="M12 2h8v13h7L16 26 5 15h7ZM2 25h6v3h16v-3h6v7H2Z" />
          <path fill="white" opacity=".45" d="M12 2h8l-8 8Z" />
        </>
      ) : (
        <>
          <path fill="currentColor" d="M2 6h7v23h19v3H2ZM11 1h13l6 6v19H11Z" />
          <path fill="white" d="M23 2v7h6ZM15 12h10v2H15Zm0 5h10v2H15Zm0 5h7v2h-7Z" />
        </>
      )}
    </svg>
  );
}
function ExamMenu({ label, url, onDownload }: { label: string; url: string; onDownload(): void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const balloon = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number }>();
  useEffect(() => {
    if (!position) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !balloon.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        setPosition(undefined);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPosition(undefined);
        trigger.current?.focus();
      }
    };
    const close = () => setPosition(undefined);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
    balloon.current?.querySelector("a")?.focus();
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [position]);
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="library-icon"
        aria-label={label}
        aria-expanded={!!position}
        onClick={() => {
          if (position) {
            setPosition(undefined);
            return;
          }
          const rect = trigger.current!.getBoundingClientRect();
          setPosition({
            left: Math.max(12, Math.min(rect.left, window.innerWidth - 254)),
            top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 174)),
          });
        }}
      >
        <PaperEditorIcon name="more" />
      </button>
      {position &&
        createPortal(
          <div
            ref={balloon}
            className="enem-paper-menu-balloon"
            style={{ position: "fixed", ...position }}
            aria-label={label}
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExamActionIcon kind="print" />
              {uiText("Abrir PDF para imprimir")}
            </a>
            <button
              type="button"
              onClick={() => {
                setPosition(undefined);
                trigger.current?.focus();
                onDownload();
              }}
            >
              <ExamActionIcon kind="download" />
              {uiText("Baixar PDF")}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
function ArchiveFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange(value: string): void;
}) {
  return (
    <details
      className="enem-filter"
      name="enem-filter"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label={uiText(label)}>
        {uiText(label)}
        <span className="enem-filter-arrow" aria-hidden="true">
          <FocusPaperArrow />
        </span>
      </summary>
      <div className="enem-filter-balloon" role="group" aria-label={uiText(label)}>
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={(event) => {
              onChange(id);
              const details = event.currentTarget.closest("details");
              if (details) {
                details.open = false;
                details.querySelector("summary")?.focus();
              }
            }}
          >
            {uiText(text)}
            <span aria-hidden="true">{value === id ? <PaperCheckIcon /> : null}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
function EnemArchiveView({
  onBack,
  scope,
  catalog,
  workspace,
  collectionId,
  dispatch,
}: ArchiveProps & { catalog: EnemCatalog }) {
  const sound = useRef<ReturnType<typeof createMathSound> | null>(null);
  useEffect(
    () => () => {
      sound.current?.dispose();
      sound.current = null;
    },
    [],
  );
  const key = `olena.enem.history.v1:${scope}`;
  const [history, setHistory] = useState<History>(() =>
    readHistory(key, new Set(catalog.papers.map((p) => p.id))),
  );
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [year, setYear] = useState("all");
  const [day, setDay] = useState("all");
  const [filter, setFilter] = useState("all");
  const [reader, setReader] = useState<Paper>();
  const [started, setStarted] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clockRunning, setClockRunning] = useState(true);
  const clockSeconds = useRef(0);
  useEffect(() => {
    clockSeconds.current = seconds;
  }, [seconds]);
  useEffect(() => {
    if (!started || !clockRunning) return;
    const since = Date.now();
    const initial = clockSeconds.current;
    const timer = setInterval(
      () => setSeconds(initial + Math.floor((Date.now() - since) / 1000)),
      250,
    );
    return () => clearInterval(timer);
  }, [started, clockRunning]);
  const [chooseSection, setChooseSection] = useState(false);
  const [section, setSection] = useState<EnemSection>();
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<EnemLanguage>("english");
  const [answerOpen, setAnswerOpen] = useState(true);
  const [variant, setVariant] = useState("");
  const [documentType, setDocumentType] = useState<"paper" | "answer">("paper");
  const [feedback, setFeedback] = useState<{ id: string; kind: string; stamp: number }>();
  const [downloadStatus, setDownloadStatus] = useState("");
  async function downloadPaper(paper: Paper, documentUrl?: string, answer = false) {
    setDownloadStatus(uiText("Baixando prova…"));
    try {
      const chosen =
        paper.variants.find((v) => v.id === history[paper.id]?.variant) ?? paper.variants[0]!;
      const response = await fetch(enemPdfUrl(documentUrl ?? chosen.url));
      if (!response.ok) throw new Error("PDF indisponível");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${paper.id}${answer ? "-gabarito" : ""}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setDownloadStatus(uiText("Prova baixada."));
    } catch {
      setDownloadStatus(uiText("Não foi possível baixar. Abra o PDF oficial e tente novamente."));
    }
  }
  const update = useCallback(
    (id: string, changes: Progress) => {
      setHistory((current) => {
        const record = changes.attempt;
        const next = {
          ...current,
          [id]: {
            ...current[id],
            ...changes,
            ...(record
              ? {
                  attempts: {
                    ...(current[id]?.attempt
                      ? { [current[id].attempt.section]: current[id].attempt }
                      : {}),
                    ...current[id]?.attempts,
                    [record.section]: record,
                  },
                }
              : {}),
          },
        };
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* Mantém a sessão se o armazenamento estiver cheio. */
        }
        return next;
      });
    },
    [key],
  );
  useEffect(() => {
    if (!reader || !started || !section || section.id === "essay") return;
    const previous = history[reader.id]?.attempt;
    const next = {
      ...history,
      [reader.id]: {
        ...history[reader.id],
        attempt: { section: section.id, seconds, instructions, answers, language },
        attempts: {
          ...(previous ? { [previous.section]: previous } : {}),
          ...history[reader.id]?.attempts,
          [section.id]: { section: section.id, seconds, instructions, answers, language },
        },
      },
    };
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* A sessão continua se o cache estiver cheio. */
    }
  }, [reader, started, section, seconds, instructions, answers, language, history, key]);
  const years = [...new Set(catalog.papers.map((p) => p.year))];
  const savedCount = catalog.papers.filter((paper) => history[paper.id]?.saved).length;
  const visible = catalog.papers.filter((p) => {
    const item = history[p.id];
    return (
      (tab === "all" || item?.opened || item?.saved || item?.completed) &&
      (year === "all" || String(p.year) === year) &&
      (day === "all" || String(p.day) === day) &&
      (filter === "all" ||
        (filter === "saved"
          ? item?.saved
          : filter === "done"
            ? item?.completed
            : filter === "started"
              ? item?.opened && !item?.completed
              : !item?.opened))
    );
  });
  if (reader) {
    const chosen = reader.variants.find((v) => v.id === variant) ?? reader.variants[0]!;
    const url = documentType === "answer" ? (chosen.answerUrl ?? chosen.url) : chosen.url;
    const progress = history[reader.id];
    const previousAttempt = progress?.attempt;
    const previousSection = enemSections(reader.year, reader.day).find(
      (item) => item.id === previousAttempt?.section,
    );
    const previousRows = previousSection
      ? answerRows(previousSection, previousAttempt?.language ?? "english")
      : [];
    const previousAnswered = previousRows.filter(
      (row) => previousAttempt?.answers?.[`${previousSection?.id}:${row.key}`],
    ).length;
    const previousPercent = previousRows.length
      ? Math.round((previousAnswered / previousRows.length) * 100)
      : 0;
    const activeRows = section ? answerRows(section, language) : [];
    const answered = activeRows.filter((row) =>
      /^[A-E]$/.test(answers[`${section?.id}:${row.key}`] ?? ""),
    ).length;
    const submitCurrent = () => {
      if (!section) return;
      const attempt = {
        language,
        section: section.id,
        seconds,
        instructions: false,
        answers: { ...answers },
        submittedAt: new Date().toISOString(),
      };
      const attempts = { ...progress?.attempts, [section.id]: attempt };
      const complete = enemSections(reader.year, reader.day).every(
        (area) => !!(attempts[area.id] ?? sectionAttempt(progress, area.id))?.submittedAt,
      );
      update(reader.id, { completed: complete, attempt });
      setConfirmSubmit(false);
      setStarted(false);
      setClockRunning(false);
      setResultOpen(true);
    };
    if (
      started &&
      !instructions &&
      section?.id === "essay" &&
      workspace &&
      collectionId &&
      dispatch
    )
      return createPortal(
        <Suspense fallback={<HelenaLoading label={uiText("Abrindo folha de redação")} />}>
          <EnemEssayWriting
            year={reader.year}
            paperUrl={enemPdfUrl(chosen.url)}
            variantId={chosen.id}
            scope={scope}
            workspace={workspace}
            collectionId={collectionId}
            dispatch={dispatch}
            onClose={() => {
              setStarted(false);
              setChooseSection(true);
            }}
            onSubmit={({ text, elapsedSeconds }) => {
              const attempt = {
                section: "essay",
                seconds: elapsedSeconds,
                instructions: false,
                answers: {},
                essayText: text,
                submittedAt: new Date().toISOString(),
              };
              const complete = enemSections(reader.year, reader.day).every(
                (area) => area.id === "essay" || !!sectionAttempt(progress, area.id)?.submittedAt,
              );
              update(reader.id, { attempt, completed: complete });
            }}
          />
        </Suspense>,
        document.body,
      );
    if (resultOpen && previousAttempt?.submittedAt && previousSection)
      return createPortal(
        <EnemSubmissionResult
          key={`${chosen.id}:${previousAttempt.submittedAt}`}
          title={`Enem ${reader.year} · ${dayLabel(reader.day)}`}
          section={previousSection}
          seconds={previousAttempt.seconds}
          answers={previousAttempt.answers}
          language={previousAttempt.language ?? "english"}
          variantId={chosen.id}
          paperUrl={enemPdfUrl(chosen.url)}
          {...(chosen.answerUrl ? { answerUrl: enemPdfUrl(chosen.answerUrl) } : {})}
          onClose={() => {
            setResultOpen(false);
            setReader(undefined);
          }}
        />,
        document.body,
      );
    const material: StudyMaterial = {
      id: `${reader.id}-${chosen.id}-${documentType}`,
      subjectId: "enem",
      title: `Enem ${reader.year} · ${dayLabel(reader.day)}`,
      kind: "pdf",
      content: url,
      createdAt: catalog.checkedAt,
      page: documentType === "paper" ? (progress?.page ?? 1) : (progress?.answerPage ?? 1),
      bookmarks: progress?.bookmarks ?? [],
    };
    const readerView = (
      <section
        className={`enem-reader is-preview${started ? " is-started" : ""}${instructions ? " is-instructions" : ""}${started && !instructions && answerOpen && section?.id !== "essay" ? " has-answer-card" : ""}`}
      >
        {started && (
          <button
            type="button"
            className={`essay-writing-clock enem-exam-clock${clockRunning ? "" : " essay-writing-clock--paused"}`}
            aria-label={uiText(clockRunning ? "Pausar cronômetro" : "Retomar cronômetro")}
            onClick={() => setClockRunning((value) => !value)}
          >
            <svg className="essay-clock-control" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d={clockRunning ? "M5 3h5v18H5zM14 3h5v18h-5z" : "M5 2 22 12 5 22z"}
              />
            </svg>
            <span role="timer">
              <PaperDigits
                value={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
              />
            </span>
          </button>
        )}
        <nav className="enem-document-actions" aria-label={uiText("Ações do PDF")}>
          <button
            type="button"
            aria-label={uiText("Imprimir PDF")}
            title={uiText("Imprimir PDF")}
            onClick={() => {
              const frame = document.createElement("iframe");
              frame.className = "enem-print-frame";
              frame.src = enemPdfUrl(url);
              frame.title = uiText("Imprimir PDF");
              frame.onload = () => {
                try {
                  frame.contentWindow?.focus();
                  frame.contentWindow?.print();
                } catch {
                  window.open(enemPdfUrl(url), "_blank", "noopener,noreferrer");
                }
              };
              document.body.append(frame);
              setTimeout(() => frame.remove(), 120000);
            }}
          >
            <ExamActionIcon kind="print" />
          </button>
          <button
            type="button"
            aria-label={uiText("Baixar PDF")}
            title={uiText("Baixar PDF")}
            onClick={() => void downloadPaper(reader, url, documentType === "answer")}
          >
            <ExamActionIcon kind="download" />
          </button>
          <a
            href={enemPdfUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={uiText("Abrir PDF em outra aba")}
            title={uiText("Abrir PDF em outra aba")}
          >
            <ExamActionIcon kind="external" />
          </a>
        </nav>
        {downloadStatus && (
          <p className="enem-document-status" role="status">
            {downloadStatus}
          </p>
        )}
        <header>
          <button
            type="button"
            className="library-icon enem-reader-close"
            aria-label={uiText("Voltar às provas do Enem")}
            onClick={() => {
              if (started && section)
                update(reader.id, {
                  attempt: { section: section.id, seconds, instructions, answers, language },
                });
              setStarted(false);
              setInstructions(false);
              setReader(undefined);
            }}
          >
            <PaperCloseIcon />
          </button>
          <h2>
            {material.title}
            {documentType === "answer" ? " · " + uiText("Gabarito") : ""}
          </h2>
          <a className="shelf-wood-button" href={url} target="_blank" rel="noopener noreferrer">
            {uiText("Abrir PDF oficial")} <PaperEditorIcon name="download" />
          </a>
        </header>
        <div
          className="enem-reader-tabs enem-archive-tabs"
          role="tablist"
          aria-label={uiText("Documento da prova")}
        >
          <button
            type="button"
            role="tab"
            className="shelf-wood-button"
            aria-selected={documentType === "paper"}
            onClick={() => setDocumentType("paper")}
          >
            <ExamActionIcon kind="versions" />
            {uiText("Prova")}
          </button>
          <button
            type="button"
            role="tab"
            className="shelf-wood-button"
            aria-selected={documentType === "answer"}
            disabled={!chosen.answerUrl}
            onClick={() => setDocumentType("answer")}
          >
            <ExamActionIcon kind="answers" />
            {uiText("Gabarito")}
          </button>
        </div>
        <label className="enem-reader-version">
          {uiText("Versão do caderno")}
          <select
            aria-label={uiText("Versão do caderno")}
            value={chosen.id}
            onChange={(event) => {
              setVariant(event.target.value);
              setDocumentType("paper");
            }}
          >
            {reader.variants.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <Suspense fallback={<p role="status">{uiText("Abrindo prova…")}</p>}>
          <PdfReader
            continuous
            startLanguage={language}
            coverOnly={instructions}
            {...(started && !instructions && section ? { startSection: section } : {})}
            key={material.id}
            material={material}
            scope={scope}
            sourceUrl={enemPdfUrl(url)}
            onChange={(changes) =>
              update(reader.id, {
                ...(changes.page
                  ? documentType === "paper"
                    ? { page: changes.page }
                    : { answerPage: changes.page }
                  : {}),
                ...(changes.bookmarks ? { bookmarks: changes.bookmarks } : {}),
              })
            }
            onExcerpt={() => {}}
          />
        </Suspense>
        {!started && (
          <div className="enem-start-dock">
            <button
              type="button"
              className="shelf-wood-button"
              onClick={() => {
                setSection(undefined);
                if (previousSection && !previousAttempt?.submittedAt) setResumeOpen(true);
                else setChooseSection(true);
              }}
            >
              {uiText("Começar prova")}
            </button>
          </div>
        )}
        {started && !instructions && section && section.id !== "essay" && (
          <>
            {answerOpen && (
              <EnemAnswerCard
                language={language}
                section={section}
                answers={answers}
                onClose={() => setAnswerOpen(false)}
                onAnswer={(key, answer) => setAnswers((current) => ({ ...current, [key]: answer }))}
              />
            )}
            <div className="enem-answer-dock">
              <span>
                {answered}/{activeRows.length} {uiText("respondidas")}
              </span>
              <button
                type="button"
                className="shelf-wood-button"
                onClick={() => setAnswerOpen((value) => !value)}
              >
                <PaperEditorIcon name="writingWindow" />
                {uiText(answerOpen ? "Recolher cartão" : "Abrir cartão de respostas")}
              </button>
            </div>
            <button
              type="button"
              className="shelf-wood-button enem-deliver-exam"
              onClick={() => {
                if (answered < activeRows.length) setConfirmSubmit(true);
                else submitCurrent();
              }}
            >
              {uiText("Entregar prova")}
            </button>
          </>
        )}
        {confirmSubmit && (
          <LibraryDialog
            title={uiText("Entregar com questões em branco?")}
            className="enem-section-dialog enem-submit-confirm"
            onClose={() => setConfirmSubmit(false)}
          >
            <p>
              {uiText("Questões sem resposta:")} <strong>{activeRows.length - answered}</strong>
            </p>
            <p>{uiText("Você pode voltar ao cartão e responder antes de entregar.")}</p>
            <button
              type="button"
              className="shelf-wood-button enem-section-start"
              onClick={submitCurrent}
            >
              {uiText("Sim, entregar")}
            </button>
            <button
              type="button"
              className="shelf-wood-button"
              onClick={() => setConfirmSubmit(false)}
            >
              {uiText("Voltar à prova")}
            </button>
          </LibraryDialog>
        )}
        {resumeOpen && previousAttempt && previousSection && (
          <LibraryDialog
            title={uiText("Você tem uma prova em andamento")}
            className="enem-section-dialog"
            onClose={() => setResumeOpen(false)}
          >
            <div className="enem-resume-area">
              <SectionIcon section={previousSection} />
              <strong>{uiText(previousSection.label)}</strong>
              <progress
                max={100}
                value={previousPercent}
                aria-label={uiText("Respostas preenchidas")}
              />
              <span>{previousPercent}%</span>
            </div>
            <button
              type="button"
              className="shelf-wood-button enem-section-start"
              onClick={() => {
                setSection(previousSection);
                setAnswers(previousAttempt.answers ?? {});
                setLanguage(previousAttempt.language ?? "english");
                setSeconds(Math.max(0, previousAttempt.seconds || 0));
                setInstructions(previousAttempt.instructions);
                setDocumentType("paper");
                setResumeOpen(false);
                setStarted(true);
                setClockRunning(true);
                setAnswerOpen(true);
              }}
            >
              {uiText("Continuar")}
            </button>
            <button
              type="button"
              className="enem-new-attempt"
              onClick={() => {
                setResumeOpen(false);
                setAnswers({});
                setLanguage("english");
                setSection(undefined);
                setChooseSection(true);
              }}
            >
              {uiText("Começar uma nova prova")}
            </button>
          </LibraryDialog>
        )}
        {instructions && (
          <nav className="enem-instructions-actions" aria-label={uiText("Leitura das instruções")}>
            <button
              type="button"
              className="shelf-wood-button"
              onClick={() => {
                setInstructions(false);
                setStarted(false);
                setChooseSection(true);
              }}
            >
              <PaperArrow back />
              {uiText("Voltar")}
            </button>
            <button
              type="button"
              className="shelf-wood-button enem-section-start"
              onClick={() => setInstructions(false)}
            >
              {uiText("Continuar")}
              <PaperArrow />
            </button>
          </nav>
        )}
        {chooseSection && (
          <LibraryDialog
            title={uiText("Por qual área você quer começar?")}
            className="enem-section-dialog"
            onClose={() => setChooseSection(false)}
          >
            <div
              role="radiogroup"
              aria-label={uiText("Área da prova")}
              className="enem-section-options"
            >
              {enemSections(reader.year, reader.day).map((item) => {
                const record = sectionAttempt(progress, item.id);
                const summary = paperProgress(reader.year, reader.day, progress).sections.find(
                  (area) => area.section.id === item.id,
                );
                return (
                  <button
                    type="button"
                    key={item.id}
                    role="radio"
                    aria-checked={section?.id === item.id}
                    onClick={() => setSection(item)}
                  >
                    <SectionIcon section={item} />
                    <span>
                      {uiText(item.label)}
                      <small className="enem-section-status">
                        {uiText(
                          record?.submittedAt
                            ? "Entregue"
                            : record
                              ? "Em andamento"
                              : "Não iniciada",
                        )}
                        {" · "}
                        {summary?.percent ?? 0}%
                        {summary &&
                          item.id !== "essay" &&
                          ` · ${summary.answered}/${summary.total}`}
                      </small>
                    </span>
                    {section?.id === item.id && <PaperCheckIcon />}
                  </button>
                );
              })}
            </div>
            {section?.id === "languages" && (
              <fieldset className="enem-language-picker">
                <legend>{uiText("Idioma da prova")}</legend>
                <button
                  type="button"
                  className="shelf-wood-button"
                  aria-pressed={language === "english"}
                  onClick={() => setLanguage("english")}
                >
                  {uiText("Inglês")}
                </button>
                <button
                  type="button"
                  className="shelf-wood-button"
                  aria-pressed={language === "spanish"}
                  onClick={() => setLanguage("spanish")}
                >
                  {uiText("Espanhol")}
                </button>
              </fieldset>
            )}
            <button
              type="button"
              className="shelf-wood-button enem-section-start"
              disabled={!section}
              onClick={() => {
                if (!section) return;
                const record = sectionAttempt(progress, section.id);
                if (record?.submittedAt) {
                  update(reader.id, { attempt: record });
                  setChooseSection(false);
                  if (section.id === "essay") {
                    setInstructions(false);
                    setClockRunning(false);
                    setStarted(true);
                  } else setResultOpen(true);
                  return;
                }
                update(reader.id, {
                  opened: true,
                  variant: chosen.id,
                  completed: false,
                  ...(section.id === "essay"
                    ? {
                        attempt: {
                          section: "essay",
                          seconds: record?.seconds ?? 0,
                          instructions: false,
                          answers: {},
                        },
                      }
                    : {}),
                });
                setAnswers(record?.answers ?? {});
                setLanguage(record?.language ?? language);
                setDocumentType("paper");
                setChooseSection(false);
                setInstructions(record?.instructions ?? true);
                setSeconds(record?.seconds ?? 0);
                setClockRunning(section.id !== "essay");
                setAnswerOpen(true);
                setStarted(true);
              }}
            >
              {uiText(
                section && sectionAttempt(progress, section.id)?.submittedAt
                  ? "Ver resultado"
                  : "Iniciar prova",
              )}
            </button>
          </LibraryDialog>
        )}
      </section>
    );
    return createPortal(readerView, document.body);
  }
  return (
    <section className="enem-archive" aria-label={uiText("Provas do Enem")}>
      <header className="enem-archive-heading">
        <button
          type="button"
          className="library-icon"
          aria-label={uiText("Voltar aos vestibulares")}
          onClick={onBack}
        >
          <PaperArrow back />
        </button>
        <h2>{"Enem"}</h2>
        <span>
          <button
            type="button"
            className="library-icon enem-saved-filter"
            aria-label={uiText("Filtrar provas favoritas")}
            aria-pressed={filter === "saved"}
            onClick={() => setFilter(filter === "saved" ? "all" : "saved")}
          >
            <Bookmark />
            {savedCount > 0 && (
              <span className="enem-saved-count">
                <PaperDigits value={String(savedCount)} />
              </span>
            )}
          </button>
          <PaperDigits value={String(years.at(-1))} /> — <PaperDigits value={String(years[0])} />
        </span>
      </header>
      <div className="enem-archive-tabs" role="tablist" aria-label={uiText("Acervo Enem")}>
        {(
          [
            ["all", "Provas"],
            ["mine", "Minhas provas"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="shelf-wood-button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {uiText(label)}
          </button>
        ))}
      </div>
      <div className="enem-archive-filters">
        <ArchiveFilter
          label={uiText("Ano")}
          value={year}
          onChange={setYear}
          options={[
            ["all", "Todos os anos"],
            ...years.map((y): [string, string] => [String(y), String(y)]),
          ]}
        />
        <ArchiveFilter
          label={uiText("Dia")}
          value={day}
          onChange={setDay}
          options={[
            ["all", "Todos os dias"],
            ["1", "1º dia"],
            ["2", "2º dia"],
          ]}
        />
        <ArchiveFilter
          label={uiText("Progresso")}
          value={filter}
          onChange={setFilter}
          options={[
            ["all", "Todas"],
            ["done", "Concluídas"],
            ["new", "Não abertas"],
            ["started", "Em leitura"],
            ["saved", "Salvas"],
          ]}
        />
      </div>
      <div className="enem-paper-grid">
        {visible.map((paper) => {
          const progress = history[paper.id];
          const summary = paperProgress(paper.year, paper.day, progress);
          return (
            <article
              className={`enem-paper-card${progress?.completed ? " is-completed" : ""}`}
              key={paper.id}
            >
              <button
                className="enem-paper-open"
                type="button"
                aria-label={`Enem ${paper.year}, ${dayLabel(paper.day)}`}
                onClick={() => {
                  setVariant(progress?.variant ?? paper.variants[0]!.id);
                  setDocumentType("paper");
                  setStarted(false);
                  setResultOpen(false);
                  setConfirmSubmit(false);
                  setSection(undefined);
                  setChooseSection(!!progress?.attempt?.submittedAt);
                  setInstructions(false);
                  if (progress?.attempt && !progress.attempt.submittedAt) setResumeOpen(true);
                  else setResumeOpen(false);
                  setReader(paper);
                }}
              >
                <img
                  src={`${paper.cover}?v=${catalog.checkedAt}`}
                  alt={`Capa oficial do Enem ${paper.year}, ${dayLabel(paper.day)}`}
                  width="420"
                  height="594"
                  loading="lazy"
                />
                <h3>
                  <PaperDigits value={String(paper.year)} />
                  <span>{dayLabel(paper.day)}</span>
                </h3>
              </button>
              <details
                className="enem-card-progress"
                onToggle={(event) => {
                  const element = event.currentTarget;
                  if (!element.open) return;
                  const rect = element.getBoundingClientRect();
                  element.style.setProperty(
                    "--progress-left",
                    `${Math.max(12, Math.min(rect.left, window.innerWidth - 324))}px`,
                  );
                  element.style.setProperty(
                    "--progress-top",
                    `${Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 280))}px`,
                  );
                }}
              >
                <summary aria-label={`${uiText("Progresso da prova")}: ${summary.percent}%`}>
                  {summary.percent}% <FocusPaperArrow />
                </summary>
                <div className="enem-card-progress-balloon">
                  {summary.sections.map((area) => (
                    <div key={area.section.id}>
                      <SectionIcon section={area.section} />
                      <span>
                        {uiText(area.section.label)}
                        <small>
                          {uiText(area.submitted ? "Entregue" : "Respostas preenchidas")}
                        </small>
                      </span>
                      <strong>{area.percent}%</strong>
                    </div>
                  ))}
                </div>
              </details>
              <footer>
                <span>{progress?.completed ? uiText("Concluída") : ""}</span>
                <ExamMenu
                  label={`Ações da prova Enem ${paper.year}, ${dayLabel(paper.day)}`}
                  url={
                    (paper.variants.find((v) => v.id === progress?.variant) ?? paper.variants[0]!)
                      .url
                  }
                  onDownload={() => void downloadPaper(paper)}
                />
                <button
                  type="button"
                  className="library-icon enem-complete"
                  aria-label={uiText(
                    progress?.completed ? "Desmarcar prova concluída" : "Marcar prova concluída",
                  )}
                  aria-pressed={!!progress?.completed}
                  onClick={() => {
                    sound.current ??= createMathSound();
                    sound.current.unlock();
                    sound.current.play(progress?.completed ? "cosmicTap" : "correct");
                    setFeedback({ id: paper.id, kind: "complete", stamp: Date.now() });
                    update(paper.id, { completed: !progress?.completed });
                  }}
                >
                  <span
                    className={
                      feedback?.id === paper.id && feedback.kind === "complete"
                        ? "enem-action-feedback"
                        : ""
                    }
                    key={
                      feedback?.id === paper.id && feedback.kind === "complete" ? feedback.stamp : 0
                    }
                  >
                    <PaperCheckIcon size={24} />
                  </span>
                </button>
                <button
                  type="button"
                  className="library-icon enem-favorite"
                  aria-label={uiText(progress?.saved ? "Remover prova dos salvos" : "Salvar prova")}
                  aria-pressed={!!progress?.saved}
                  onClick={() => {
                    sound.current ??= createMathSound();
                    sound.current.unlock();
                    sound.current.play(progress?.saved ? "cosmicTap" : "cardReveal");
                    setFeedback({ id: paper.id, kind: "favorite", stamp: Date.now() });
                    update(paper.id, { saved: !progress?.saved });
                  }}
                >
                  <span
                    className={
                      feedback?.id === paper.id && feedback.kind === "favorite"
                        ? "enem-action-feedback"
                        : ""
                    }
                    key={
                      feedback?.id === paper.id && feedback.kind === "favorite" ? feedback.stamp : 0
                    }
                  >
                    <Bookmark />
                  </span>
                </button>
              </footer>
            </article>
          );
        })}
      </div>
      {downloadStatus && <p role="status">{downloadStatus}</p>}
      {!visible.length && <p className="enem-empty">{uiText("Nenhuma prova neste filtro.")}</p>}
    </section>
  );
}

/** O catálogo (cerca de 210 KB) vem do servidor quando o acervo abre, e não dentro do JavaScript. */
export default function EnemArchive({ onBack, scope, ...essayProps }: ArchiveProps) {
  const [catalog, setCatalog] = useState<EnemCatalog>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    loadEnemCatalog().then(
      (value) => active && setCatalog(value),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  if (catalog)
    return <EnemArchiveView onBack={onBack} scope={scope} catalog={catalog} {...essayProps} />;
  return (
    <section className="enem-archive" aria-label={uiText("Provas do Enem")}>
      {failed ? (
        <div role="alert">
          <p>{uiText("Não foi possível carregar as provas do Enem. Confira a conexão.")}</p>
          <button
            type="button"
            className="shelf-wood-button"
            onClick={() => {
              setFailed(false);
              setAttempt(attempt + 1);
            }}
          >
            {uiText("Tentar novamente")}
          </button>
        </div>
      ) : (
        <HelenaLoading compact label={uiText("Carregando as provas do Enem…")} />
      )}
    </section>
  );
}
