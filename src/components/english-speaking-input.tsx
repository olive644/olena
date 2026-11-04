import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import type { LocalEnglishSpeech } from "../data/english-local-speech";
import { speakingWords, speechAccepted } from "../data/english-speaking-words";
import { HelenaLoading } from "./helena-loading";
import { PRIVACY_POLICY_PATH } from "../domain/privacy-policy";
import {
  keepVoiceStorage,
  setVoicePrepared,
  voiceModelCached,
  voiceRemembered,
} from "../data/english-voice-memory";
type Phase =
  "setup" | "downloading" | "requesting" | "listening" | "processing" | "ready" | "retry" | "error";
export function EnglishSpeakingInput({
  allowed,
  disabled,
  onAllow,
  onPause,
  onAnswer,
  onAlternative,
  onSound,
  onRetrySound,
  onListen,
  speech,
  expected,
  microphoneGranted = false,
}: {
  allowed: boolean;
  disabled: boolean;
  onAllow(): void;
  onPause(paused: boolean): void;
  onAnswer(transcript: string): void;
  onAlternative(): void;
  onSound(): void;
  onRetrySound?: (() => void) | undefined;
  onListen?: (() => void) | undefined;
  speech: LocalEnglishSpeech;
  expected: string;
  microphoneGranted?: boolean;
}) {
  useLanguage();
  const [phase, setPhase] = useState<Phase>(() =>
    !speech.ready && voiceRemembered() ? "downloading" : "setup",
  );
  const [accepted, setAccepted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(speech.ready);
  // Já preparada neste aparelho: o modelo está no cache, então não pedimos o download de novo.
  const [remembered, setRemembered] = useState(() => !speech.ready && voiceRemembered());
  const [supported] = useState(
    () =>
      window.isSecureContext &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof AudioContext !== "undefined" &&
      typeof AudioWorkletNode !== "undefined" &&
      typeof Worker !== "undefined",
  );
  const showPreview = useCallback((text: string) => {
    if (!text.trim()) return;
    setTranscript((previous) =>
      text.trim().split(/\s+/).length >= previous.trim().split(/\s+/).length ? text : previous,
    );
  }, []);
  const generation = useRef(0);
  const stopping = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pause = useEffectEvent(onPause);
  useEffect(() => {
    pause(phase !== "listening" && phase !== "ready");
  }, [phase]);
  const cancel = useCallback(() => {
    generation.current++;
    clearTimeout(timer.current);
    speech.cancel();
  }, [speech]);
  useEffect(() => {
    const unsubscribe = speech.subscribeProgress(setProgress);
    const stopTranscript = speech.subscribeTranscript(showPreview);
    const hide = () => {
      if (document.hidden) {
        cancel();
        setTranscript("");
        setLoaded(speech.ready);
        setPhase("setup");
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      unsubscribe();
      stopTranscript();
      cancel();
    };
  }, [speech, cancel, showPreview]);
  useEffect(() => {
    if (disabled) cancel();
  }, [disabled, cancel]);
  useEffect(() => {
    if (!remembered || speech.ready || !supported) return;
    const id = ++generation.current;
    void (async () => {
      try {
        // Sem rede: só prossegue se os arquivos ainda estiverem no cache do navegador.
        if (!(await voiceModelCached())) throw new Error("not-cached");
        await speech.load();
        if (id !== generation.current) return;
        setLoaded(true);
        setPhase("setup");
        void keepVoiceStorage();
      } catch {
        if (id !== generation.current) return;
        // O navegador apagou o modelo: volta ao fluxo normal, com a autorização e o download.
        setVoicePrepared(false);
        speech.cancel();
        setRemembered(false);
        setLoaded(false);
        setPhase("setup");
      }
    })();
  }, [remembered, speech, supported]);
  async function download() {
    if (disabled || (!allowed && !accepted)) return;
    const id = ++generation.current;
    onAllow();
    setPhase("downloading");
    setError("");
    setProgress(0);
    try {
      await speech.load();
      if (id !== generation.current) return;
      setVoicePrepared(true);
      void keepVoiceStorage();
      setLoaded(true);
      setPhase("setup");
    } catch {
      if (id !== generation.current) return;
      setLoaded(false);
      setError(
        uiText("Não foi possível preparar a voz no aparelho. Confira a conexão e tente novamente."),
      );
      setPhase("error");
    }
  }
  async function stop() {
    if (phase !== "listening" || stopping.current) return;
    stopping.current = true;
    const id = generation.current;
    clearTimeout(timer.current);
    setPhase("processing");
    try {
      const text = await speech.finish();
      if (id !== generation.current) return;
      if (!text) {
        setError(
          uiText("Não ouvimos uma frase. Tente novamente ou use palavras, sem perder coração."),
        );
        setPhase("error");
        return;
      }
      setTranscript(text);
      if (speechAccepted(expected, text)) {
        setPhase("ready");
        onAnswer(expected);
      } else {
        setPhase("retry");
        onRetrySound?.();
      }
    } catch (cause) {
      if (id !== generation.current) return;
      setError(
        cause instanceof Error && cause.message === "no-speech"
          ? uiText("Não ouvimos uma frase. Tente novamente ou use palavras, sem perder coração.")
          : uiText("Não foi possível transcrever no aparelho. Tente novamente ou use palavras."),
      );
      setLoaded(speech.ready);
      setPhase("error");
    }
  }
  const stopLatest = useEffectEvent(stop);
  const previewLatest = useEffectEvent(async () => {
    const id = generation.current;
    try {
      const text = await speech.partial();
      if (id === generation.current && text) showPreview(text);
    } catch {
      /* Final recognition reports recoverable errors. */
    }
  });
  useEffect(() => {
    if (phase !== "listening") return;
    const limit = setTimeout(() => void stopLatest(), 12000);
    const preview = setInterval(() => void previewLatest(), 2000);
    const unsubscribe = speech.subscribeSilence(() => void stopLatest());
    return () => {
      clearTimeout(limit);
      clearInterval(preview);
      unsubscribe();
    };
  }, [phase, speech]);
  async function start() {
    if (disabled || !speech.ready || (!allowed && !microphoneGranted && !accepted)) return;
    cancel();
    const id = generation.current;
    onAllow();
    stopping.current = false;
    window.speechSynthesis?.cancel();
    setTranscript("");
    setError("");
    setPhase("requesting");
    timer.current = setTimeout(() => {
      cancel();
      setError(uiText("O pedido de microfone não foi concluído. Tente novamente ou use palavras."));
      setPhase("error");
    }, 20000);
    try {
      await speech.start();
      if (id !== generation.current) return;
      clearTimeout(timer.current);
      onSound();
      setPhase("listening");
    } catch (cause) {
      if (id !== generation.current) return;
      clearTimeout(timer.current);
      speech.cancel();
      setError(
        cause instanceof DOMException &&
          (cause.name === "NotAllowedError" || cause.name === "SecurityError")
          ? uiText(
              "O microfone não foi autorizado. Libere nas permissões do navegador ou use palavras.",
            )
          : uiText(
              "Não foi possível abrir o microfone. Confira se ele está conectado ou sendo usado por outro aplicativo.",
            ),
      );
      setPhase("error");
    }
  }
  const busy = ["downloading", "requesting", "processing"].includes(phase);
  return (
    <section className="english-speaking" aria-label={uiText("Prática de fala")} data-phase={phase}>
      <div className="english-speaking-wave" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      {!supported ? (
        <p role="status">
          {uiText(
            "Este navegador não oferece gravação de áudio compatível. Faça a mesma questão com palavras.",
          )}
        </p>
      ) : (
        <>
          {!allowed && (!loaded || !microphoneGranted) && (
            <label className="english-speaking-consent">
              <input
                className="paper-checkbox"
                type="checkbox"
                checked={accepted}
                disabled={busy || disabled}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>
                {remembered || loaded
                  ? uiText(
                      "Autorizo usar o microfone. Minha fala será transcrita neste aparelho, sem envio do áudio.",
                    )
                  : uiText(
                      "Autorizo baixar o modelo de voz e usar o microfone. Minha fala será transcrita neste aparelho, sem envio do áudio.",
                    )}{" "}
                <a href={PRIVACY_POLICY_PATH} target="_blank" rel="noopener noreferrer">
                  {uiText(825)}
                </a>
              </span>
            </label>
          )}
          <p className="english-speaking-status" role="status">
            {phase === "downloading"
              ? remembered
                ? uiText("Preparando a voz neste aparelho…")
                : uiText("Baixando arquivo do modelo: {0}%", [progress])
              : phase === "listening"
                ? uiText("Pode falar. Toque para terminar.")
                : phase === "processing"
                  ? uiText("Transcrevendo neste aparelho…")
                  : phase === "requesting"
                    ? uiText("Aguardando o microfone…")
                    : phase === "retry"
                      ? uiText(
                          "As palavras em vermelho precisam de outra tentativa. Fale a frase novamente.",
                        )
                      : phase === "ready"
                        ? uiText("Frase reconhecida!")
                        : uiText(
                            "Fale a frase em inglês. As palavras mudam de cor conforme são reconhecidas.",
                          )}
          </p>
          {busy && <HelenaLoading compact />}
          <div
            className="english-speaking-transcript english-speaking-words"
            lang="en"
            aria-label={expected}
          >
            {speakingWords(expected, transcript, phase === "retry" || phase === "ready").map(
              ({ word, state }, index) => (
                <span key={index} className={`is-${state}`} data-word-state={state}>
                  {word}{" "}
                </span>
              ),
            )}
          </div>
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
            {!loaded ? (
              <button
                className="primary-button"
                type="button"
                disabled={disabled || busy || (!allowed && !accepted)}
                onClick={() => void download()}
              >
                {remembered ? uiText("Preparando a voz…") : uiText("Preparar voz no aparelho")}
              </button>
            ) : (
              <button
                className="primary-button english-speaking-record"
                type="button"
                disabled={
                  disabled ||
                  busy ||
                  phase === "ready" ||
                  (!allowed && !microphoneGranted && !accepted)
                }
                onClick={() => void (phase === "listening" ? stop() : start())}
              >
                <img src="/room-icons/microphone.svg" alt="" width="28" height="28" />
                {phase === "listening"
                  ? uiText("Terminar fala")
                  : transcript
                    ? uiText("Gravar novamente")
                    : uiText("Falar agora")}
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
          cancel();
          onAlternative();
        }}
      >
        {uiText("Agora não posso falar")}
      </button>
    </section>
  );
}
