import { useCallback, useEffect, useRef, useState } from "react";
import { uiText } from "../i18n/runtime";
import type { EssayTopicResult } from "../domain/essay-topic";
import { HelenaLoading } from "./helena-loading";

const statusLabels = {
  aligned: "Indícios de alinhamento ao tema",
  tangential: "Possível tangenciamento",
  "off-topic": "Possível fuga ao tema",
  inconclusive: "Análise inconclusiva",
} as const;
const reasons = {
  insufficient:
    "O texto ainda é curto ou não apresenta frases suficientes para uma análise temática segura.",
  repetition:
    "Há repetição extensa de sequências. Repetir termos do tema não demonstra desenvolvimento de uma argumentação.",
  ambiguous:
    "As relações encontradas são próximas ou pouco claras. Não é seguro concluir alinhamento ou fuga ao tema.",
  partial:
    "Parte do texto se aproxima do assunto, mas o recorte específico da proposta pode estar pouco desenvolvido. Releia os trechos indicados.",
  different:
    "O texto se aproxima mais de outro assunto e apresenta pouca relação com o recorte da proposta. Confira os trechos antes de revisar.",
  aligned:
    "O texto e os trechos analisados apresentam relação com o recorte proposto. Isso não comprova qualidade da tese, dos argumentos ou do repertório.",
} as const;
export function EssayTopicReview({
  text,
  topicId,
  title,
  onLocate,
}: {
  text: string;
  topicId: string;
  title: string;
  onLocate(start: number, end: number): void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("loading");
  const [analysis, setAnalysis] = useState<{
    text: string;
    topicId: string;
    result: EssayTopicResult;
  }>();
  const [progress, setProgress] = useState(uiText("Carregando o modelo local…"));
  const [job, setJob] = useState({ text, topicId });
  const worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef(0);
  const latest = useRef({ text, topicId });
  const stopWorker = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
    clearTimeout(timeout.current);
    request.current++;
  }, []);
  useEffect(() => {
    latest.current = { text, topicId };
    return stopWorker;
  }, [text, topicId, stopWorker]);
  function cancel() {
    stopWorker();
    setJob({ text, topicId });
    setState("idle");
  }
  const analyze = useCallback(() => {
    const snapshot = { text, topicId };
    const id = ++request.current;
    const fail = () => {
      if (request.current !== id) return;
      worker.current?.terminate();
      worker.current = null;
      clearTimeout(timeout.current);
      setJob(snapshot);
      setState("error");
    };
    try {
      worker.current ??= new Worker(new URL("../workers/essay-topic.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current.onerror = fail;
      worker.current.onmessage = (
        event: MessageEvent<{
          id: number;
          result?: EssayTopicResult;
          error?: boolean;
          progress?: string;
          completed?: number;
          total?: number;
        }>,
      ) => {
        if (
          event.data.id !== request.current ||
          latest.current.text !== snapshot.text ||
          latest.current.topicId !== snapshot.topicId
        )
          return;
        if (event.data.error) {
          fail();
          return;
        }
        setJob(snapshot);
        if (event.data.result) {
          clearTimeout(timeout.current);
          setAnalysis({ ...snapshot, result: event.data.result });
          setState("ready");
        } else if (event.data.progress === "analyzing") {
          setState("loading");
          setProgress(
            uiText("Analisando trecho {0} de {1}…", [
              event.data.completed ?? 0,
              event.data.total ?? 0,
            ]),
          );
        }
      };
      timeout.current = setTimeout(fail, 180000);
      worker.current.postMessage({ id, ...snapshot });
    } catch {
      queueMicrotask(fail);
    }
  }, [text, topicId]);
  useEffect(() => {
    analyze();
  }, [analyze]);
  function retry() {
    setJob({ text, topicId });
    setState("loading");
    setProgress(uiText("Carregando o modelo local…"));
    analyze();
  }
  const activeState = job.text === text && job.topicId === topicId ? state : "loading";
  const current =
    analysis?.text === text && analysis.topicId === topicId ? analysis.result : undefined;
  return (
    <section className="essay-topic-review" aria-label={uiText("Análise de tema")}>
      <h3>{uiText("Análise de tema")}</h3>
      <p>
        <strong>{uiText("Proposta:")}</strong> {uiText(title)}
      </p>

      {activeState === "loading" ? (
        <>
          <HelenaLoading compact label={progress} />
          <button type="button" className="secondary-button" onClick={cancel}>
            {uiText("Cancelar análise")}
          </button>
        </>
      ) : activeState === "error" || activeState === "idle" ? (
        <button type="button" className="shelf-wood-button" onClick={retry}>
          {uiText(state === "error" ? "Tentar análise novamente" : "Retomar análise")}
        </button>
      ) : null}
      {activeState === "error" && (
        <p role="alert">
          {uiText(
            "A análise local não pôde ser concluída. Seu texto e a revisão ortográfica continuam disponíveis.",
          )}
        </p>
      )}
      {activeState === "ready" && current && (
        <div className={`essay-topic-result essay-topic-result--${current.status}`}>
          <h4 role="status">{uiText(statusLabels[current.status])}</h4>
          <p>{uiText("Na proposta “{0}”: {1}", [title, uiText(reasons[current.reason])])}</p>
          {current.evidence.map((evidence) => (
            <div className="essay-topic-evidence" key={evidence.start}>
              <blockquote>{evidence.text}</blockquote>
              <small>
                {uiText(
                  evidence.relation === "related"
                    ? "Trecho com relação temática identificada."
                    : "Trecho usado para comparação; relação temática incerta.",
                )}
              </small>
              <button
                type="button"
                className="secondary-button"
                onClick={() => onLocate(evidence.start, evidence.end)}
              >
                {uiText("Ver trecho na redação")}
              </button>
            </div>
          ))}
          <p>
            {uiText(
              "Esse diagnóstico não atribui zero nem altera a redação. Revise o recorte da proposta antes de tirar conclusões.",
            )}
          </p>
        </div>
      )}
    </section>
  );
}
