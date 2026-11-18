import { useProfileHandle } from "../hooks/use-profile-handle";
import { PaperEditorIcon } from "./paper-editor-icon";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SourceQuiz } from "../domain/source-quiz";
import { uiText } from "../i18n/runtime";
import { LibraryDialog } from "./library-dialog";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { PaperDigits } from "./paper-digits";
import { PaperCloseIcon } from "./paper-close-icon";
import "./source-quiz-study.css";
import "./source-exam-study.css";

export function SourceExamStudy({
  title,
  quiz,
  onClose,
  onComplete,
}: {
  title: string;
  quiz: SourceQuiz;
  onClose(): void;
  onComplete(correct: number, total: number): void;
}) {
  const [phase, setPhase] = useState<"cover" | "exam" | "result">("cover");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [confirm, setConfirm] = useState(false);
  const [profile] = useStoredProfile();
  const { handle } = useProfileHandle(false);
  const username = handle.username || profile.username || "";
  const [name, setName] = useState(username);
  const nameEdited = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  useEffect(() => {
    if (!nameEdited.current) setName(username);
  }, [username]);
  async function downloadPdf() {
    setDownloading(true);
    setDownloadError("");
    try {
      const { downloadSourceExamPdf } = await import("../data/source-exam-export");
      await downloadSourceExamPdf(
        title,
        quiz,
        name,
        examDate.toLocaleDateString(),
        answers,
        phase === "result",
        seconds,
      );
    } catch {
      setDownloadError(uiText("Não foi possível baixar o PDF. Tente novamente."));
    } finally {
      setDownloading(false);
    }
  }
  const [examDate] = useState(() => new Date());
  const correction = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase === "result")
      correction.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [phase]);
  const [seconds, setSeconds] = useState(0);
  const started = useRef(0);
  const submitted = useRef(false);
  const limit = quiz.questions.length * 120;
  const answered = Object.keys(answers).length;
  const correct = quiz.questions.filter((q, i) => answers[i] === q.answer).length;
  function submit() {
    if (submitted.current) return;
    submitted.current = true;
    setSeconds(Math.min(limit, Math.floor((Date.now() - started.current) / 1000)));
    setConfirm(false);
    setPhase("result");
    onComplete(correct, quiz.questions.length);
  }
  useEffect(() => {
    if (phase !== "exam") return;
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started.current) / 1000);
      setSeconds(Math.min(limit, elapsed));
      if (elapsed >= limit) submit();
    }, 1000);
    return () => window.clearInterval(timer);
  });
  function start() {
    submitted.current = false;
    setAnswers({});
    setSeconds(0);
    started.current = Date.now();
    setPhase("exam");
  }
  const clock = (value: number) =>
    Math.floor(value / 60) + ":" + String(value % 60).padStart(2, "0");
  return createPortal(
    <section className="flashcard-study source-exam" aria-label={uiText("Simulado: {0}", [title])}>
      <header className="source-exam-toolbar">
        <button
          type="button"
          className="library-icon"
          aria-label={uiText("Voltar à pasta")}
          onClick={onClose}
        >
          <PaperCloseIcon />
        </button>
        <strong>{title}</strong>
        <span>
          {answered}/{quiz.questions.length} {uiText("respondidas")}
        </span>
        {phase === "exam" && (
          <span className="source-exam-clock" role="timer" aria-label={uiText("Tempo restante")}>
            {clock(limit - seconds)}
          </span>
        )}
        {phase !== "cover" && (
          <button
            type="button"
            className="shelf-wood-button"
            aria-label={uiText("Baixar PDF")}
            title={uiText("Baixar PDF")}
            disabled={downloading}
            onClick={() => void downloadPdf()}
          >
            <PaperEditorIcon name="download" />
          </button>
        )}
        {phase === "cover" ? (
          <button type="button" className="shelf-wood-button" onClick={start}>
            {uiText("Começar prova")}
          </button>
        ) : phase === "exam" ? (
          <button type="button" className="shelf-wood-button" onClick={() => setConfirm(true)}>
            {uiText("Corrigir simulado")}
          </button>
        ) : (
          <button type="button" className="shelf-wood-button" onClick={start}>
            {uiText("Refazer prova")}
          </button>
        )}
      </header>
      <div
        className="flashcard-study__progress"
        role="progressbar"
        aria-label={uiText("Progresso do simulado")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((answered / quiz.questions.length) * 100)}
      >
        <span style={{ width: (answered / quiz.questions.length) * 100 + "%" }} />
      </div>
      {downloadError && <p role="alert">{downloadError}</p>}
      <article className="source-exam-paper">
        <div className="source-exam-brand">
          <img src="/olena-favicon-192.png" width="48" height="48" alt={uiText("Olena")} />
          <span>{uiText("Simulado Olena")}</span>
        </div>
        <h1>{title}</h1>
        <div className="source-exam-identity">
          <label>
            {uiText("Nome")}
            <input
              value={name}
              maxLength={80}
              onChange={(e) => {
                nameEdited.current = true;
                setName(e.target.value);
              }}
            />
          </label>
          <time className="source-exam-date" dateTime={examDate.toISOString().slice(0, 10)}>
            <small>{uiText("Data")}</small>
            <span>{examDate.toLocaleDateString()}</span>
          </time>
        </div>
        {phase === "result" && (
          <div
            ref={correction}
            className="source-exam-correction"
            role="status"
            aria-label={uiText("Correção da professora Olena")}
          >
            <div className="source-exam-signature">
              <small>{uiText("Corrigido pela professora")}</small>
              <svg viewBox="0 0 260 90" role="img" aria-label={uiText("Assinatura Olena")}>
                <path
                  pathLength="1"
                  d="M65 59C14 83 23 9 64 17C101 24 54 91 44 58C34 28 82 46 91 36C110 16 115 2 104 7C89 13 78 74 96 60L114 43C101 68 116 70 133 45C149 23 151 52 128 54C124 76 153 56 163 42L153 63C177 28 184 39 174 60C184 69 193 40 205 43C187 28 180 70 201 61L220 45M37 77C83 69 158 75 230 70"
                />
              </svg>
              <strong>{uiText("Professora Olena")}</strong>
            </div>
            <div className="source-exam-stamp">
              <span>{uiText("OLENA • CORRIGIDO")}</span>
              <strong>
                <PaperDigits value={correct + "/" + quiz.questions.length} />
              </strong>
              <span>
                {uiText("Tempo")}:{" "}
                <b>
                  <PaperDigits value={clock(seconds)} />
                </b>
              </span>
            </div>
          </div>
        )}
        {phase === "cover" ? (
          <div className="source-exam-instructions">
            <h2>{uiText("Instruções")}</h2>
            <ul>
              <li>{uiText("Cada questão vale 1 ponto. Escolha uma alternativa por questão.")}</li>
              <li>{uiText("Você pode alterar as respostas antes de entregar.")}</li>
              <li>
                {uiText("Questões em branco valem zero. A nota considera todas as questões.")}
              </li>
              <li>{uiText("Ao terminar o tempo, a prova será corrigida automaticamente.")}</li>
            </ul>
            <button type="button" className="shelf-wood-button" onClick={start}>
              {uiText("Começar prova")}
            </button>
          </div>
        ) : (
          <>
            {phase === "result" && (
              <p role="status">
                {uiText("Resultado")}: {Math.round((correct / quiz.questions.length) * 100)}% ·{" "}
                {quiz.questions.length - answered} {uiText("em branco")}
              </p>
            )}
            {quiz.questions.map((q, index) => (
              <section className="source-exam-question" key={index}>
                {q.prompt.includes("\n\n") && (
                  <p className="source-exam-context">{q.prompt.split("\n\n")[0]}</p>
                )}
                <h2>
                  <span>{index + 1}</span>
                  {q.prompt.includes("\n\n") ? q.prompt.split("\n\n").slice(1).join(" ") : q.prompt}
                  <small>{uiText("1 ponto")}</small>
                </h2>
                <div
                  className="source-quiz-answers"
                  role="group"
                  aria-label={uiText("Questão {0}", [index + 1])}
                >
                  {q.options.map((option, i) => (
                    <button
                      type="button"
                      key={i}
                      className="shelf-wood-button"
                      aria-pressed={answers[index] === i}
                      disabled={phase === "result"}
                      data-result={
                        phase === "result"
                          ? i === q.answer
                            ? "right"
                            : answers[index] === i
                              ? "wrong"
                              : undefined
                          : undefined
                      }
                      onClick={() => setAnswers((old) => ({ ...old, [index]: i }))}
                    >
                      <span>{String.fromCharCode(65 + i)}</span>
                      {option}
                    </button>
                  ))}
                </div>
                {phase === "result" && (
                  <div className="source-exam-explanation">
                    <strong>
                      {answers[index] === undefined
                        ? uiText("Não respondida")
                        : answers[index] === q.answer
                          ? uiText("Correto!")
                          : uiText("Resposta incorreta")}
                    </strong>
                    <p>{q.explanation}</p>
                    <small>
                      {q.sourceTitle} · {uiText("Página")} {q.page}
                    </small>
                  </div>
                )}
              </section>
            ))}
          </>
        )}
      </article>
      {confirm && (
        <LibraryDialog
          title={uiText("Entregar simulado?")}
          className="shelf-wood-dialog source-exam-confirm"
          onClose={() => setConfirm(false)}
        >
          <p>{uiText("Você respondeu {0} de {1} questões.", [answered, quiz.questions.length])}</p>
          <p>{uiText("Questões em branco valem zero.")}</p>
          <button type="button" className="shelf-wood-button" onClick={submit}>
            {uiText("Entregar e corrigir")}
          </button>
          <button type="button" className="shelf-wood-button" onClick={() => setConfirm(false)}>
            {uiText("Continuar prova")}
          </button>
        </LibraryDialog>
      )}
    </section>,
    document.body,
  );
}
