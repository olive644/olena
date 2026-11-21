import { useEffect, useRef, useState } from "react";
import { uiText } from "../i18n/runtime";
import { applyEssaySuggestion, type EssaySpellingResult } from "../domain/essay-proofreading";
import { EssayTopicReview } from "./essay-topic-review";
import { EssaySubmissionReport } from "./essay-submission-report";
import { EssayOlenaReview } from "./essay-olena-review";

import { HelenaLoading } from "./helena-loading";
import { createPortal } from "react-dom";
import "./essay-proofreading.css";
import { EssayShare, EssayShareIcon } from "./essay-share";
import { PaperCloseIcon } from "./paper-close-icon";
import { FocusPaperArrow } from "./focus-paper-arrow";

export function EssayProofreading({
  text,
  elapsedSeconds = 0,
  topicId,
  topicTitle,
  onChange,
  onLocate,
  onSubmit,
  onViewChange,
  onContinue,
  initiallySubmitted = false,
  locked = false,
}: {
  initiallySubmitted?: boolean;
  locked?: boolean;
  text: string;
  elapsedSeconds?: number;
  topicId?: string;
  topicTitle?: string;
  onViewChange?(visible: boolean): void;
  onContinue?(): void;
  onSubmit(): void;
  onChange(text: string): void;
  onLocate(start: number, end: number): void;
}) {
  const [exportState, setExportState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [delivered, setDelivered] = useState(text);
  const [open, updateOpen] = useState(initiallySubmitted);
  const heading = useRef<HTMLHeadingElement>(null);
  function setOpen(visible: boolean) {
    updateOpen(visible);
    onViewChange?.(visible);
  }
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      heading.current?.closest(".essay-results-page")?.scrollIntoView?.({ block: "start" });
      heading.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [review, setReview] = useState<{ text: string; result: EssaySpellingResult }>();
  const [ignored, setIgnored] = useState<string[]>([]);
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(text);
  useEffect(() => {
    latest.current = text;
  }, [text]);
  useEffect(
    () => () => {
      worker.current?.terminate();
      clearTimeout(timer.current);
    },
    [],
  );
  function check() {
    const snapshot = text;
    const id = ++request.current;
    setOpen(true);
    setState("loading");
    clearTimeout(timer.current);
    try {
      worker.current ??= new Worker(
        new URL("../workers/essay-proofreading.worker.ts", import.meta.url),
        { type: "module" },
      );
      const fail = () => {
        if (request.current !== id) return;
        clearTimeout(timer.current);
        worker.current?.terminate();
        worker.current = null;
        setState("error");
      };
      worker.current.onerror = fail;
      worker.current.onmessage = (
        event: MessageEvent<{ id: number; error?: boolean; result?: EssaySpellingResult }>,
      ) => {
        if (event.data.id !== request.current) return;
        clearTimeout(timer.current);
        if (event.data.error || !event.data.result) {
          fail();
          return;
        }
        if (latest.current !== snapshot) {
          setState("idle");
          return;
        }
        setReview({ text: snapshot, result: event.data.result });
        setIgnored([]);
        setState("ready");
      };
      timer.current = setTimeout(fail, 30000);
      worker.current.postMessage({ id, text: snapshot });
    } catch {
      setState("error");
    }
  }
  useEffect(() => {
    if (!initiallySubmitted) return;
    let active = true;
    queueMicrotask(() => {
      if (active) check();
    });
    return () => {
      active = false;
    };
    // The delivered revision is immutable for this mounted result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const stale = review?.text !== text;
  const visible = review?.result.issues.filter((issue) => !ignored.includes(issue.word)) ?? [];
  return (
    <>
      {!open &&
        createPortal(
          <button
            type="button"
            className="primary-button essay-submit"
            disabled={!text.trim()}
            onClick={() => {
              setDelivered(text);
              setExportState("idle");
              onSubmit();
              check();
            }}
          >
            {uiText("Entregar redação")}
          </button>,
          document.body,
        )}
      {open && (
        <section className="essay-results-page" aria-labelledby="essay-results-title">
          {createPortal(
            <button
              type="button"
              className="library-icon essay-results-close"
              aria-label={uiText("Fechar resultado da redação")}
              onClick={() => {
                if (onContinue) onContinue();
                else setOpen(false);
              }}
            >
              <PaperCloseIcon />
            </button>,
            document.body,
          )}

          <header className="essay-results-hero">
            <img
              src="/essay-art/poliana-teaching-olena-v2.webp"
              alt={uiText("Poliana ensinando na lousa enquanto Olena aprende sentada à mesa")}
              width="720"
              height="372"
            />
            <h1 id="essay-results-title" ref={heading} tabIndex={-1}>
              {uiText("Redação entregue!")}
            </h1>
            <p>{topicTitle}</p>
          </header>
          <div className="essay-results-content">
            <div className="essay-result-file-actions">
              <button
                type="button"
                className="secondary-button essay-png-download"
                disabled={exportState === "loading"}
                onClick={async () => {
                  setExportState("loading");
                  try {
                    const { downloadEssayPngs } = await import("./essay-png-download");
                    await downloadEssayPngs(delivered, topicTitle ?? "Redação", topicId);
                    setExportState("done");
                  } catch {
                    setExportState("error");
                  }
                }}
              >
                <EssayShareIcon download />
                {uiText(
                  exportState === "loading"
                    ? "Preparando imagens…"
                    : "Veja aqui sua redação e a proposta",
                )}
              </button>
              <EssayShare
                text={delivered}
                title={topicTitle ?? "Redação"}
                topicId={topicId}
                seconds={elapsedSeconds}
              />
            </div>
            {exportState === "error" && (
              <p role="alert">{uiText("Não foi possível gerar as imagens. Tente novamente.")}</p>
            )}
            {exportState === "done" && (
              <p role="status">{uiText("As duas imagens foram preparadas para download.")}</p>
            )}
            <EssaySubmissionReport
              text={review?.text === text ? review.text : text}
              elapsedSeconds={elapsedSeconds}
            >
              {topicId && topicTitle && (
                <EssayTopicReview
                  text={text}
                  topicId={topicId}
                  title={topicTitle}
                  onLocate={(start, end) => {
                    if (locked)
                      document
                        .getElementById("essay-delivered-copy")
                        ?.scrollIntoView({ block: "center" });
                    else {
                      setOpen(false);
                      onLocate(start, end);
                    }
                  }}
                />
              )}
              <EssayOlenaReview
                text={locked ? delivered : text}
                {...(topicTitle ? { topicTitle } : {})}
              />
              <details className="essay-disclosure essay-spelling-disclosure">
                <summary>
                  <FocusPaperArrow />
                  <span>{uiText("Revisão ortográfica")}</span>
                </summary>

                {state === "loading" ? (
                  <HelenaLoading compact label={uiText("Verificando a ortografia…")} />
                ) : state === "error" ? (
                  <div role="alert">
                    <p>
                      {uiText("Não foi possível carregar a revisão. Seu texto foi preservado.")}
                    </p>
                    <button type="button" className="shelf-wood-button" onClick={check}>
                      {uiText("Tentar novamente")}
                    </button>
                  </div>
                ) : state === "ready" && !stale ? (
                  <>
                    {visible.length > 0 && (
                      <p className="essay-marking-summary">
                        {uiText("Ocorrências para conferência no texto:")}{" "}
                        <strong>{visible.length}</strong>
                      </p>
                    )}
                    {visible.length === 0 && (
                      <p role="status">
                        {uiText(
                          "Nenhuma outra palavra foi sinalizada nesta revisão. Isso não garante ausência de erros.",
                        )}
                      </p>
                    )}
                    {review?.result.limited && (
                      <p>
                        {uiText(
                          "Mostrando até 30 ocorrências. Revise novamente após as alterações.",
                        )}
                      </p>
                    )}
                    <ul className="essay-review-issues">
                      {visible.map((issue) => (
                        <li key={issue.start}>
                          <strong>{issue.word}</strong>
                          <blockquote className="essay-spelling-context">
                            {review.text.slice(Math.max(0, issue.start - 60), issue.start)}
                            <mark>{review.text.slice(issue.start, issue.end)}</mark>
                            {review.text.slice(issue.end, issue.end + 60)}
                          </blockquote>
                          <p>
                            {uiText(
                              issue.suggestions.some(
                                (suggestion) =>
                                  suggestion
                                    .normalize("NFD")
                                    .replace(/\p{M}/gu, "")
                                    .toLocaleLowerCase("pt-BR") ===
                                  issue.word
                                    .normalize("NFD")
                                    .replace(/\p{M}/gu, "")
                                    .toLocaleLowerCase("pt-BR"),
                              )
                                ? "Possível problema de acentuação. Confira a sugestão no contexto."
                                : "Palavra não reconhecida no dicionário de português brasileiro. Confira se é nome próprio, termo técnico ou erro de escrita.",
                            )}
                          </p>
                          <div className="essay-review-actions">
                            {!locked &&
                              issue.suggestions.map((suggestion) => (
                                <button
                                  type="button"
                                  className="shelf-wood-button"
                                  key={suggestion}
                                  aria-label={uiText("Substituir {0} por {1}", [
                                    issue.word,
                                    suggestion,
                                  ])}
                                  onClick={() => {
                                    const next = applyEssaySuggestion(
                                      latest.current,
                                      review.text,
                                      issue,
                                      suggestion,
                                    );
                                    if (next !== null) {
                                      onChange(next);
                                      setOpen(false);
                                    }
                                  }}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => {
                                if (locked)
                                  document
                                    .getElementById("essay-delivered-copy")
                                    ?.scrollIntoView({ block: "center" });
                                else {
                                  setOpen(false);
                                  onLocate(issue.start, issue.end);
                                }
                              }}
                            >
                              {uiText("Ver no texto")}
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => setIgnored([...ignored, issue.word])}
                            >
                              {uiText("Ignorar palavra")}
                            </button>
                          </div>
                          {issue.suggestions.length === 0 && (
                            <small>
                              {uiText("Sem sugestão segura. Confira a palavra no contexto.")}
                            </small>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p role="status">
                    {uiText(
                      "O texto mudou. Faça uma nova revisão para receber sugestões atualizadas.",
                    )}
                  </p>
                )}
                {state === "ready" && stale && (
                  <button type="button" className="shelf-wood-button" onClick={check}>
                    {uiText("Revisar novamente")}
                  </button>
                )}
              </details>
              {locked && (
                <section id="essay-delivered-copy" className="essay-delivered-copy">
                  <h3>{uiText("Sua redação entregue")}</h3>
                  <p>{delivered}</p>
                </section>
              )}
            </EssaySubmissionReport>
          </div>
          <nav className="essay-results-navigation" aria-label={uiText("Próximos passos")}>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (onContinue) onContinue();
                else setOpen(false);
              }}
            >
              {uiText("Continuar")}
            </button>
          </nav>
        </section>
      )}
    </>
  );
}
