import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { initializeLanguage } from "../../src/i18n/runtime";
import { challengeQuestion } from "../../src/data/math-challenge-bank";
import { MathExpression, MathNumber } from "../../src/components/math-paper-art";
import { PaperDigits } from "../../src/components/paper-digits";
import { PaperArrow } from "../../src/components/paper-arrow";
import { OliverReviewArt } from "../../src/components/oliver-review-art";
import { PaperSpeech } from "../../src/components/paper-speech";
import { createMathSound, type MathSoundCue } from "../../src/data/math-sound";
import {
  initializeAccessibility,
  updateAccessibility,
  useAccessibility,
} from "../../src/data/accessibility-preferences";
import "../../src/styles.css";
import "../../src/paper-buttons.css";
import "../../src/paper-controls.css";
import "../../src/accessibility.css";
import "../../src/components/math-arcade.css";
import "./review.css";

await initializeLanguage();
initializeAccessibility();
// Amostra isolada: três questões reais do banco, sem sessão, pontos ou persistência.
const samples = [
  {
    question: challengeQuestion("foundations", 0, 0),
    reason: "O tempo passou nessa questão.",
    explanation: "Vamos juntar por partes. Comece com 10 e acrescente mais 5. O total é 15.",
    calculation: "10 + 5 = 15",
  },
  {
    question: challengeQuestion("foundations", 0, 6),
    reason: "Essa resposta não deu certo na partida.",
    explanation:
      "Já temos 6 e queremos chegar a 15. Tire 6 de 15 para descobrir o que falta: 9. Vamos conferir juntando de novo?",
    calculation: "6 + 9 = 15",
  },
  {
    question: challengeQuestion("foundations", 1, 0),
    reason: "O tempo passou nessa questão.",
    explanation:
      "Começamos com 17. Tirando 5, ficam 12. Para conferir, junte os 5 de volta: 12 mais 5 dá 17.",
    calculation: "17 − 5 = 12",
  },
];

export function ReviewSample() {
  const [theme, setTheme] = useState(new URLSearchParams(location.search).get("theme") ?? "light");
  const [position, setPosition] = useState(0);
  const [phase, setPhase] = useState<"explanation" | "question" | "complete">(
    new URLSearchParams(location.search).get("mode") === "question" ? "question" : "explanation",
  );
  const [choice, setChoice] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [word, setWord] = useState<{ index: number; word: string; durationMs: number }>();
  const [narration, setNarration] = useState(0);
  const [demo, setDemo] = useState<{
    reaction: "greet" | "think" | "listen" | "correct" | "retry";
    variant: number;
    cue: number;
  } | null>(null);
  const demoIndex = useRef(0);
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onWord = useCallback(
    (event: { index: number; word: string; durationMs: number }) => setWord(event),
    [],
  );
  const audio = useRef<ReturnType<typeof createMathSound> | null>(null);
  const preferences = useAccessibility();
  const sample = samples[position]!;
  const correct = choice === sample.question.answer;
  const reaction =
    demo?.reaction ??
    (phase === "complete" || correct ? "correct" : choice !== null ? "retry" : "explain");
  useEffect(
    () => () => {
      audio.current?.dispose();
      audio.current = null;
      if (demoTimer.current) clearTimeout(demoTimer.current);
    },
    [],
  );
  function sound(cue: MathSoundCue) {
    audio.current ??= createMathSound();
    audio.current.unlock();
    audio.current.play(cue);
  }
  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);
  function restart() {
    sound("start");
    setPosition(0);
    setPhase("explanation");
    setChoice(null);
    setDemo(null);
    setSpeaking(false);
    setWord(undefined);
    setNarration(narration + 1);
  }
  function next() {
    sound(position === samples.length - 1 ? "mastery" : "start");
    setChoice(null);
    if (position === samples.length - 1) setPhase("complete");
    else {
      setPosition(position + 1);
      setPhase("explanation");
    }
  }
  return (
    <>
      <aside className="review-tools" aria-label="Ferramentas da amostra">
        <p>Amostra funcional com dados de teste. Oliver animado em Rive e efeitos do minigame.</p>
        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              const index = demoIndex.current++;
              const reactions = [
                "greet",
                "think",
                "listen",
                "correct",
                "correct",
                "retry",
              ] as const;
              setDemo({
                reaction: reactions[index % reactions.length]!,
                variant: index % reactions.length === 4 ? 1 : 0,
                cue: index + 1,
              });
              if (demoTimer.current) clearTimeout(demoTimer.current);
              demoTimer.current = setTimeout(() => setDemo(null), 2600);
            }}
          >
            Ver outra reação
          </button>
          <button
            className="secondary-button"
            type="button"
            aria-pressed={preferences.soundEffects}
            onClick={() => updateAccessibility({ soundEffects: !preferences.soundEffects })}
          >
            Som {preferences.soundEffects ? "ligado" : "desligado"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            Tema {theme === "light" ? "escuro" : "claro"}
          </button>
          <a href="#proofs">Imagens e versão</a>
        </div>
      </aside>
      <main className="oliver-review" aria-label="Revisão com Oliver">
        <header className="oliver-review__header">
          <button className="secondary-button" type="button" onClick={restart}>
            <PaperArrow back /> Recomeçar amostra
          </button>
          <span className="oliver-review__count">
            {phase === "complete" ? (
              "Revisão concluída"
            ) : (
              <>
                Questão <PaperDigits value={String(position + 1)} /> de <PaperDigits value="3" />
              </>
            )}
          </span>
        </header>
        <div
          className="oliver-review__trail"
          aria-label={`${phase === "complete" ? 3 : position} de 3 questões revistas`}
        >
          {samples.map((item, index) => (
            <span
              key={item.question.id}
              className={
                phase === "complete" || index < position
                  ? "is-done"
                  : index === position
                    ? "is-current"
                    : ""
              }
            />
          ))}
        </div>
        <section className="oliver-review__lesson">
          <div className="oliver-review__character">
            <OliverReviewArt
              key={position}
              cue={`${position}:${phase}:${attempt}:${demo?.cue ?? 0}`}
              reaction={reaction}
              speaking={speaking}
              word={word}
              variant={demo?.variant ?? attempt % 2}
              label="Oliver sentado, sorrindo e explicando com a mão levantada"
            />
          </div>
          <div
            key={`${position}:${narration}:${phase === "complete" ? "complete" : "lesson"}`}
            className="oliver-review__speech"
            data-state={reaction}
          >
            <span className="oliver-review__speaker">Oliver</span>
            <h1>{phase === "complete" ? "Você conseguiu!" : "Vamos entender juntos?"}</h1>
            {phase === "complete" ? (
              <>
                <PaperSpeech
                  text="Você acertou as três questões da revisão. Que tal levar esse jeito de pensar para a próxima partida?"
                  onWord={onWord}
                  onSpeakingChange={setSpeaking}
                  skipLabel="Mostrar tudo"
                />
                <button className="primary-button" type="button" onClick={restart}>
                  Rever a amostra <PaperArrow />
                </button>
              </>
            ) : (
              <>
                <p className="oliver-review__reason">{sample.reason}</p>
                <PaperSpeech
                  key={`${position}:${narration}`}
                  text={sample.explanation}
                  immediate={phase === "question"}
                  className="oliver-review__explanation"
                  onWord={onWord}
                  onSpeakingChange={setSpeaking}
                  skipLabel="Mostrar tudo"
                />
                <div className="oliver-review__calculation" aria-label={sample.calculation}>
                  <MathExpression value={sample.calculation} />
                </div>
                {phase === "explanation" && (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => {
                      sound("start");
                      setPhase("question");
                    }}
                  >
                    Agora é sua vez <PaperArrow />
                  </button>
                )}
              </>
            )}
          </div>
        </section>
        {phase === "question" && (
          <section className="oliver-review__practice" aria-label="Tentar a mesma questão">
            {choice !== null && (
              <div key={attempt} className={`oliver-review__fx is-${reaction}`} aria-hidden="true">
                {Array.from({ length: correct ? 12 : 4 }, (_, i) => (
                  <i key={i} style={{ "--particle": i } as React.CSSProperties} />
                ))}
              </div>
            )}
            <div className="oliver-review__practice-heading">
              <h2 aria-label={sample.question.expression}>
                <MathExpression value={sample.question.expression} />
              </h2>
              <p>Sem tempo correndo. Pode tentar quantas vezes precisar.</p>
            </div>
            <div className="oliver-review__answers">
              {sample.question.choices.map((value, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={correct}
                  aria-label={`Resposta ${value}`}
                  aria-pressed={choice === value}
                  data-tone={index}
                  data-result={choice === value ? (correct ? "correct" : "wrong") : undefined}
                  onClick={() => {
                    sound(value === sample.question.answer ? "correct" : "wrong");
                    setChoice(value);
                    setAttempt(attempt + 1);
                  }}
                >
                  <span className="oliver-review__key">
                    <PaperDigits value={String(index + 1)} />
                  </span>
                  <MathNumber value={value} />
                </button>
              ))}
            </div>
            <div className="oliver-review__feedback" role="status" aria-live="polite">
              {choice !== null &&
                (correct ? (
                  <>
                    <p>Isso! Você encontrou a resposta.</p>
                    <button className="primary-button" type="button" onClick={next}>
                      {position === 2 ? "Concluir revisão" : "Próxima questão"} <PaperArrow />
                    </button>
                  </>
                ) : (
                  <p>Quase! Olhe a explicação do Oliver e tente outra alternativa.</p>
                ))}
            </div>
          </section>
        )}
      </main>
      <section id="proofs" className="review-proofs">
        <h2>Proposta para conferir</h2>
        <p>
          <a href="./motion-v5/index.html">
            Revisão v5: vídeos reais, quadros e resultados das animações
          </a>
          {" · "}
          <a href="./rig-lab.html">Abrir laboratório Rive com reações individuais</a>
        </p>
        <p>
          Componente real em React com questões reais do banco e respostas locais de teste. Ainda
          não coleta erros de uma partida. Sem conta, gravação de progresso, pontos ou baús. Oliver
          usa arquivo Rive próprio com boca, olhos e membros articulados; movimento reduzido mantém
          imagem estática. Efeitos sonoros reutilizam o minigame, sem voz sintetizada. A fala visual
          acompanha palavras reveladas; não é sincronização com voz gravada.
        </p>
        <p>
          HEAD <code>f174506abb7d415bac7898913bab852c08510c4e</code>, rig v5 e amostra com
          alterações locais sem commit.{" "}
          <a href="./oliver-tutor-v1.png" target="_blank">
            Ampliar arte original do Oliver
          </a>
          . <a href="./manifest.json">Manifesto de capturas e versão</a>.
        </p>
        <h3>Capturas históricas da proposta v3, anteriores à correção do movimento</h3>
        <div className="review-proofs__images">
          {["desktop", "mobile"].flatMap((viewport) =>
            ["light", "dark"].flatMap((appearance) =>
              ["explanation", "question"].map((stage) => {
                const file = `${viewport}-${appearance}-${stage}.png`;
                return (
                  <figure key={file}>
                    <figcaption>
                      {viewport === "desktop" ? "PC 1440×1000" : "Celular 390×844"},{" "}
                      {appearance === "light" ? "claro" : "escuro"},{" "}
                      {stage === "explanation" ? "explicação" : "nova tentativa"}
                    </figcaption>
                    <a href={file} target="_blank">
                      <img src={file} alt={file} loading="lazy" />
                    </a>
                  </figure>
                );
              }),
            ),
          )}
        </div>
      </section>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<ReviewSample />);
