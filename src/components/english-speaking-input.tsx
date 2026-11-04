import { useEffect, useEffectEvent, useRef, useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { voiceRecognition, type VoiceRecognition } from "../data/english-speaking";
import { PaperArrow } from "./paper-arrow";
import { HelenaLoading } from "./helena-loading";
import { PRIVACY_POLICY_PATH } from "../domain/privacy-policy";

type Phase = "setup" | "requesting" | "listening" | "processing" | "ready" | "error";
export function EnglishSpeakingInput({
  allowed,
  disabled,
  onAllow,
  onPause,
  onAnswer,
  onAlternative,
  onSound,
  onListen,
}: {
  allowed: boolean;
  disabled: boolean;
  onAllow(): void;
  onPause(paused: boolean): void;
  onAnswer(transcript: string): void;
  onAlternative(): void;
  onSound(): void;
  onListen?: (() => void) | undefined;
}) {
  useLanguage();
  const [phase, setPhase] = useState<Phase>("setup");
  const [accepted, setAccepted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const active = useRef<VoiceRecognition | null>(null);
  const stopping = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [supported] = useState(() => Boolean(voiceRecognition()));
  const pause = useEffectEvent(onPause);
  useEffect(() => {
    pause(phase !== "ready" && phase !== "listening");
  }, [phase]);
  function dispose() {
    clearTimeout(timer.current);
    const recognition = active.current;
    active.current = null;
    if (recognition) {
      recognition.onstart =
        recognition.onspeechend =
        recognition.onend =
        recognition.onerror =
        recognition.onresult =
          null;
      try {
        recognition.abort();
      } catch {
        /* The browser may already have closed its session. */
      }
    }
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        dispose();
        setTranscript("");
        setPhase("setup");
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      dispose();
    };
  }, []);
  useEffect(() => {
    if (disabled) dispose();
  }, [disabled]);
  function fail(message: string) {
    dispose();
    setTranscript("");
    setError(message);
    setPhase("error");
  }
  function stop() {
    const recognition = active.current;
    if (!recognition || stopping.current) return;
    stopping.current = true;
    clearTimeout(timer.current);
    setPhase("processing");
    try {
      recognition.stop();
    } catch {
      fail(uiText("Não foi possível reconhecer a fala. Tente novamente ou use palavras."));
      return;
    }
    if (active.current === recognition)
      timer.current = setTimeout(
        () => fail(uiText("Não foi possível reconhecer a fala. Tente novamente ou use palavras.")),
        8000,
      );
  }
  function start() {
    if (disabled || (!allowed && !accepted)) return;
    const Constructor = voiceRecognition();
    if (!Constructor) return;
    dispose();
    onAllow();
    window.speechSynthesis?.cancel();
    const recognition = new Constructor();
    active.current = recognition;
    stopping.current = false;
    setTranscript("");
    setError("");
    setPhase("requesting");
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let result = "";
    recognition.onstart = () => {
      if (active.current !== recognition) return;
      clearTimeout(timer.current);
      onSound();
      setPhase("listening");
      timer.current = setTimeout(stop, 12000);
    };
    recognition.onresult = (event) => {
      if (active.current !== recognition) return;
      result = Array.from(event.results)
        .filter((item) => item.isFinal)
        .map((item) => item[0].transcript)
        .join(" ")
        .trim()
        .slice(0, 500);
    };
    recognition.onspeechend = () => {
      if (active.current === recognition) stop();
    };
    recognition.onerror = (event) => {
      if (active.current !== recognition) return;
      fail(
        event.error === "not-allowed"
          ? uiText(
              "O microfone não foi autorizado. Libere nas permissões do navegador ou use palavras.",
            )
          : uiText("Não foi possível reconhecer a fala. Tente novamente ou use palavras."),
      );
    };
    recognition.onend = () => {
      if (active.current !== recognition) return;
      if (!result) {
        fail(uiText("Não ouvimos uma frase. Tente novamente ou use palavras, sem perder coração."));
        return;
      }
      dispose();
      setTranscript(result);
      setPhase("ready");
    };
    timer.current = setTimeout(
      () => fail(uiText("Não foi possível reconhecer a fala. Tente novamente ou use palavras.")),
      20000,
    );
    try {
      recognition.start();
    } catch {
      fail(uiText("Não foi possível reconhecer a fala. Tente novamente ou use palavras."));
    }
  }
  const busy = phase === "requesting" || phase === "processing";
  return (
    <section className="english-speaking" aria-label={uiText("Prática de fala")} data-phase={phase}>
      <div className="english-speaking-wave" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <i key={index} />
        ))}
      </div>
      {!supported ? (
        <p role="status">
          {uiText(
            "Este navegador não oferece reconhecimento de fala. Faça a mesma questão com palavras.",
          )}
        </p>
      ) : (
        <>
          {!allowed && (
            <label className="english-speaking-consent">
              <input
                className="paper-checkbox"
                type="checkbox"
                checked={accepted}
                disabled={busy || disabled}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                {uiText(
                  "Autorizo o reconhecimento de voz do navegador, que pode enviar áudio ao seu provedor. O Olena não guarda o áudio nem a transcrição.",
                )}{" "}
                <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer">
                  {uiText(825)}
                </a>
              </span>
            </label>
          )}
          <p className="english-speaking-status" role="status">
            {phase === "listening"
              ? uiText("Pode falar. Toque para terminar.")
              : busy
                ? uiText("Preparando sua fala…")
                : phase === "ready"
                  ? uiText("Foi isso que você disse?")
                  : uiText(
                      "Fale a frase em inglês. Confira o que foi reconhecido antes de enviar.",
                    )}
          </p>
          {busy && <HelenaLoading compact />}
          {transcript && (
            <blockquote className="english-speaking-transcript" lang="en">
              {transcript}
            </blockquote>
          )}
          {error && (
            <p className="english-speaking-error" role="alert">
              {error}
            </p>
          )}
          <div className="english-actions">
            {onListen && (
              <button
                className="secondary-button"
                type="button"
                disabled={disabled || busy || phase === "listening"}
                onClick={onListen}
              >
                {uiText("Ouvir a fala")}
              </button>
            )}
            <button
              className="primary-button english-speaking-record"
              type="button"
              disabled={disabled || busy || (!allowed && !accepted)}
              onClick={phase === "listening" ? stop : start}
            >
              <img src="/room-icons/microphone.svg" alt="" width="28" height="28" />
              {phase === "listening"
                ? uiText("Terminar fala")
                : transcript
                  ? uiText("Gravar novamente")
                  : uiText("Falar agora")}
            </button>
            {phase === "ready" && (
              <button
                className="primary-button"
                type="button"
                disabled={disabled}
                onClick={() => onAnswer(transcript)}
              >
                {uiText("Enviar resposta")}
                <PaperArrow />
              </button>
            )}
          </div>
        </>
      )}
      <button
        className="secondary-button"
        type="button"
        disabled={disabled}
        onClick={() => {
          dispose();
          onAlternative();
        }}
      >
        {uiText("Agora não posso falar")}
      </button>
      <small>
        {uiText(
          "Avaliamos a frase reconhecida, não o sotaque. Falha de microfone não tira coração.",
        )}
      </small>
    </section>
  );
}
