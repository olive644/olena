import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "../data/reduced-motion";
import { OnboardingPaperIcon } from "../components/onboarding-paper-icon";
import { PaperArrow } from "../components/paper-arrow";
import { PaperCardTitle } from "../components/paper-card-title";
import "./onboarding.css";
import { BrandFooter } from "../components/brand-footer";
import { GoogleLogin, hasPendingGoogleRedirect, readPendingGoogleAnswers } from "./google-login";
import type { StudyModality, StudyPreferences } from "../domain/study-preferences";
import {
  ONBOARDING_OPTIONS,
  type OnboardingConfiguration,
} from "../domain/onboarding-configuration";
import { requestOnboardingConfiguration } from "../data/onboarding-client";
import { HelenaLoading } from "../components/helena-loading";
import { PaperDigits } from "../components/paper-digits";

type OnboardingAnswer = string | string[];

type OnboardingSetup = {
  preferences: StudyPreferences;
  configuration?: OnboardingConfiguration;
};

type OnboardingQuestion = {
  title: string;
  hint: string;
  options: readonly string[];
  multiple?: boolean;
};

const questions: readonly OnboardingQuestion[] = localizeLabels(
  () =>
    [
      {
        title: uiText(1399),
        hint: uiText(1400),
        options: ONBOARDING_OPTIONS[0]!,
      },
      {
        title: uiText(1403),
        hint: uiText(1404),
        options: ONBOARDING_OPTIONS[1]!,
      },
      {
        title: uiText(1409),
        hint: uiText(1410),
        options: ONBOARDING_OPTIONS[2]!,
      },
      {
        title: uiText(1413),
        hint: uiText(1414),
        options: ONBOARDING_OPTIONS[3]!,
      },
      {
        title: uiText(1417),
        hint: uiText(1418),
        options: ONBOARDING_OPTIONS[4]!,
        multiple: true,
      },
      {
        title: uiText(1419),
        hint: uiText(1420),
        options: ONBOARDING_OPTIONS[5]!,
      },
      {
        title: uiText(1422),
        hint: uiText(1423),
        options: ONBOARDING_OPTIONS[6]!,
      },
      {
        title: uiText(1425),
        hint: uiText(1426),
        options: ONBOARDING_OPTIONS[7]!,
      },
      {
        title: uiText(1427),
        hint: uiText(1428),
        options: ONBOARDING_OPTIONS[8]!,
      },
    ] as const,
);

/** Falas da Olena depois de cada resposta, na ordem das perguntas. Roteiro local, sem IA nem rede. */
const reactions = localizeLabels(
  () =>
    [
      uiText("Boa! Já dá para montar um começo sob medida."),
      uiText("Anotado! Vou deixar isso por perto."),
      uiText("Legal, vou lembrar disso."),
      uiText("Esse é um ótimo objetivo."),
      uiText("Combinado, vou pensar nesse jeito de aprender."),
      uiText("Entendi. Vou explicar do seu jeito."),
      uiText("Perfeito, ritmo definido."),
      uiText("Certo, já separei isso aqui."),
      uiText("Fechado! Tempo por dia anotado."),
    ] as const,
);

const onboardingIconNames = [
  ["school", "book", "graduate", "compass", "teacher"],
  [
    "chat",
    "grammar",
    "calculator",
    "chemistry",
    "biology",
    "science",
    "globe",
    "art",
    "code",
    "compass",
  ],
  ["flag-us", "flag-br", "flag-es", "flag-jp", "flag-cn", "languages", "pause"],
  ["calendar", "exam", "bulb", "group"],
  ["visual", "audio", "writing", "practice"],
  ["steps", "overview"],
  ["focus", "breaks"],
  ["python", "javascript", "code-pair", "later"],
  ["clock-5", "clock-15", "clock-30", "calendar"],
] as const;

const modalityByAnswer: Record<string, StudyModality> = {
  Visual: "visual",
  "Ouvindo e conversando": "auditivo",
  "Lendo e escrevendo": "leitura-escrita",
  Praticando: "pratico",
};

function selectedAnswer(answer: OnboardingAnswer | undefined, value: string): boolean {
  return Array.isArray(answer) ? answer.includes(value) : answer === value;
}

function buildSetup(answers: OnboardingAnswer[]): OnboardingSetup {
  const modalities = (Array.isArray(answers[4]) ? answers[4] : [])
    .map((answer) => modalityByAnswer[answer])
    .filter((modality): modality is StudyModality => Boolean(modality));
  const programmingAnswer = answers[7];
  const programming =
    programmingAnswer === "Python"
      ? "python"
      : programmingAnswer === "JavaScript"
        ? "javascript"
        : programmingAnswer === "Python e JavaScript"
          ? "python-javascript"
          : "nenhum";

  return {
    preferences: {
      modalities,
      processing: answers[5] === "Visão geral primeiro" ? "global" : "sequencial",
      rhythm: answers[6] === "Alternar estudo e pausas" ? "difuso" : "focado",
      programming,
    },
  };
}

/** Tempos da conversa em milissegundos. Com movimento reduzido tudo aparece de uma vez. */
const TYPING_MS = 650;
const FIRST_TYPING_MS = 1500;
const REPLY_MS = 700;
const LEAVE_MS = 380;

type Stage = "typing" | "ask" | "reacting";

function answerText(answer: OnboardingAnswer | undefined): string {
  if (!answer) return "";
  return Array.isArray(answer) ? answer.map((item) => uiText(item)).join(", ") : uiText(answer);
}

function poseFor(step: number): number {
  return Math.min(Math.floor(step / 2), 4);
}

function poseSource(pose: number): string {
  return pose === 4
    ? "/helena-onboarding-step-5-v3-cutout.webp"
    : `/helena-onboarding-step-${pose + 1}-cutout.webp`;
}

function TypingDots() {
  return (
    <div className="onboarding__message onboarding__message--olena" role="status">
      <span className="sr-only">{uiText("Olena está digitando")}</span>
      <span className="onboarding__typing" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

export default function OnboardingView({
  onFinish,
  loginOnly = false,
}: {
  onFinish: (setup?: OnboardingSetup) => void;
  loginOnly?: boolean;
}) {
  useLanguage();

  const [answers, setAnswers] = useState<OnboardingAnswer[]>(() =>
    hasPendingGoogleRedirect() ? [...readPendingGoogleAnswers()] : [],
  );
  // Quem volta do Google já respondeu tudo: a conversa reabre na despedida da Olena.
  const [step, setStep] = useState(() => (hasPendingGoogleRedirect() ? questions.length : 0));
  const [stage, setStage] = useState<Stage>(() => (hasPendingGoogleRedirect() ? "ask" : "typing"));
  const [leaving, setLeaving] = useState(false);
  const [prepared, setPrepared] = useState<{ key: string; value: OnboardingConfiguration }>();
  const [preparationFailed, setPreparationFailed] = useState(false);
  const [skipPreparation, setSkipPreparation] = useState(false);
  const [retryPreparation, setRetryPreparation] = useState(0);
  const [showLogin, setShowLogin] = useState(
    () =>
      loginOnly ||
      new URLSearchParams(window.location.search).has("login") ||
      hasPendingGoogleRedirect(),
  );
  const seen = useRef(new Set<number>(hasPendingGoogleRedirect() ? [questions.length] : []));
  const messages = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<HTMLHeadingElement>(null);
  const question = questions[step];
  const pose = poseFor(step);
  const poseDescriptions = [uiText(2019), uiText(1429), uiText(1430), uiText(1431), uiText(1432)];
  const talking = stage !== "ask" && !showLogin;
  const answersKey = JSON.stringify(answers);
  const configuration = prepared?.key === answersKey ? prepared.value : undefined;
  useEffect(() => {
    if (step !== questions.length || showLogin || configuration || skipPreparation) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    void requestOnboardingConfiguration(
      JSON.parse(answersKey) as OnboardingAnswer[],
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted) setPrepared({ key: answersKey, value });
      })
      .catch(() => {
        if (!controller.signal.aborted) setPreparationFailed(true);
      })
      .finally(() => window.clearTimeout(timeout));
    const timedOut = () => setPreparationFailed(true);
    controller.signal.addEventListener("abort", timedOut, { once: true });
    return () => {
      controller.signal.removeEventListener("abort", timedOut);
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [answersKey, step, showLogin, configuration, skipPreparation, retryPreparation]);

  // A Olena "digita" antes de cada pergunta. Perguntas já vistas, ao voltar, abrem direto.
  useEffect(() => {
    if (stage !== "typing") return;
    if (reducedMotion() || seen.current.has(step)) {
      seen.current.add(step);
      setStage("ask");
      return;
    }
    const timer = window.setTimeout(
      () => {
        seen.current.add(step);
        setStage("ask");
      },
      step === 0 ? FIRST_TYPING_MS : TYPING_MS,
    );
    return () => window.clearTimeout(timer);
  }, [stage, step]);

  // Depois da resposta, a Olena reage e a próxima pergunta entra.
  useEffect(() => {
    if (stage !== "reacting") return;
    const next = () => {
      setStep((value) => value + 1);
      setStage("typing");
    };
    if (reducedMotion()) {
      next();
      return;
    }
    const timer = window.setTimeout(next, REPLY_MS);
    return () => window.clearTimeout(timer);
  }, [stage]);

  // Leva o foco para a pergunta nova e mantém a última mensagem à vista.
  useEffect(() => {
    if (stage === "ask") focusTarget.current?.focus({ preventScroll: true });
    const behavior = reducedMotion() ? "auto" : "smooth";
    messages.current?.scrollTo?.({ top: messages.current.scrollHeight, behavior });
  }, [stage, step]);

  useEffect(() => {
    if (step >= 8) return;
    const nextPose = new Image();
    nextPose.src = poseSource(poseFor(step + 1));
  }, [step]);

  function answer(value: OnboardingAnswer) {
    setPreparationFailed(false);
    setSkipPreparation(false);
    setAnswers((previous) => {
      const next = [...previous];
      next[step] = value;
      return next;
    });
  }

  function choose(option: string) {
    if (stage !== "ask" || !question) return;
    if (question.multiple) {
      const selected = Array.isArray(answers[step]) ? answers[step] : [];
      answer(
        selected.includes(option)
          ? selected.filter((item) => item !== option)
          : [...selected, option],
      );
      return;
    }
    answer(option);
    setStage("reacting");
  }

  function goBack() {
    if (step === 0 || stage === "reacting") return;
    seen.current.add(step - 1);
    setStep(step - 1);
    setStage("ask");
  }

  function openLogin() {
    if (reducedMotion()) {
      setShowLogin(true);
      return;
    }
    setLeaving(true);
    window.setTimeout(() => setShowLogin(true), LEAVE_MS);
  }

  if (showLogin)
    return (
      <GoogleLogin
        answers={answers}
        configuration={configuration}
        onFinish={() =>
          onFinish(
            answers.length === questions.length
              ? { ...buildSetup(answers), ...(configuration ? { configuration } : {}) }
              : undefined,
          )
        }
        {...(!loginOnly && {
          onBack: () => {
            setLeaving(false);
            setShowLogin(false);
          },
        })}
      />
    );

  const finished = !question;
  const multipleReady = Array.isArray(answers[step]) && answers[step].length > 0;

  return (
    <main className="onboarding" id="main-content">
      <h1 className="sr-only">{uiText(1198)}</h1>
      <header className="onboarding__header">
        <span className="onboarding__brand">
          <PaperCardTitle value="OlenaStudy" />
        </span>
      </header>
      <section
        className={leaving ? "onboarding__form is-leaving" : "onboarding__form"}
        data-finished={finished}
      >
        <div className="onboarding__progress">
          <p aria-live="polite">
            {question ? uiText(2020, [step + 1, questions.length]) : uiText(1434)}
          </p>
          <progress
            value={question ? step + 1 : questions.length}
            max={questions.length}
            aria-label={uiText(1435)}
          />
        </div>
        <div className="onboarding__stage">
          <img
            key={pose}
            src={poseSource(pose)}
            alt={poseDescriptions[pose]}
            width={640}
            height={640}
            decoding="async"
            className={talking ? "onboarding__helena is-talking" : "onboarding__helena"}
          />
        </div>
        <div className="onboarding__chat" role="group" aria-label={uiText("Conversa com a Olena")}>
          <div className="onboarding__messages" ref={messages}>
            <p className="onboarding__message onboarding__message--olena onboarding__intro">
              {uiText("Oi! Eu sou a Olena, sua assistente de estudos.")}
            </p>
            <p className="onboarding__message onboarding__message--olena onboarding__message--second onboarding__intro">
              {uiText(
                "Vou te fazer {0} perguntas rápidas para deixar o OlenaStudy com o seu jeito.",
                [questions.length],
              )}
            </p>
            {questions.map((item, index) => {
              if (index > step) return null;
              const current = index === step;
              const replied = index < step || (current && stage === "reacting");
              if (current && stage === "typing") return null;
              return (
                <div className="onboarding__turn" data-current={current} key={index}>
                  <div className="onboarding__message onboarding__message--olena">
                    <h2 ref={current ? focusTarget : undefined} tabIndex={-1}>
                      {item.title}
                    </h2>
                    <p>{item.hint}</p>
                  </div>
                  {replied && (
                    <p className="onboarding__message onboarding__message--you">
                      <span className="sr-only">{uiText("Sua resposta")}: </span>
                      {answerText(answers[index])}
                    </p>
                  )}
                  {index < step && (
                    <p className="onboarding__message onboarding__message--olena onboarding__message--reaction">
                      {reactions[index]}
                    </p>
                  )}
                </div>
              );
            })}
            {(stage === "typing" || stage === "reacting") && !finished && <TypingDots />}
            {finished && (
              <p className="onboarding__message onboarding__message--olena onboarding__message--reaction">
                {uiText("Prontinho! Seu começo está preparado. Vamos criar seu espaço?")}
              </p>
            )}
          </div>
          {question && stage === "ask" && (
            <fieldset className="onboarding__choices" key={step}>
              <legend className="sr-only">{question.title}</legend>
              {question.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  style={{ animationDelay: `${index * 60}ms` }}
                  className={selectedAnswer(answers[step], option) ? "is-selected" : ""}
                  aria-pressed={
                    question.multiple ? selectedAnswer(answers[step], option) : undefined
                  }
                  onClick={() => choose(option)}
                >
                  <OnboardingPaperIcon
                    name={`journey-${onboardingIconNames[step]?.[index] ?? "compass"}`}
                  />
                  <span>{uiText(option)}</span>
                </button>
              ))}
            </fieldset>
          )}
          {finished && !configuration && !preparationFailed && !skipPreparation && (
            <HelenaLoading compact label={uiText("A Olena está preparando suas preferências…")} />
          )}
          {finished && preparationFailed && !skipPreparation && (
            <div className="onboarding-preparation-error" role="alert">
              <p>{uiText("Não foi possível preparar suas preferências agora.")}</p>
              <button
                type="button"
                onClick={() => {
                  setPreparationFailed(false);
                  setRetryPreparation((value) => value + 1);
                }}
              >
                {uiText("Tentar novamente")}
              </button>
              <button type="button" onClick={() => setSkipPreparation(true)}>
                {uiText("Continuar sem configuração automática")}
              </button>
            </div>
          )}
          {finished && configuration && (
            <dl className="onboarding-preparation" aria-label={uiText("Preparado pela Olena")}>
              <div>
                <dt>{uiText("Meta diária")}</dt>
                <dd>
                  {configuration.preferences.dailyGoalMinutes ? (
                    <>
                      <PaperDigits value={String(configuration.preferences.dailyGoalMinutes)} />{" "}
                      {uiText("minutos por dia")}
                    </>
                  ) : (
                    uiText("Sem meta fixa")
                  )}
                </dd>
              </div>
              <div>
                <dt>{uiText("Foco")}</dt>
                <dd>
                  <PaperDigits value={String(configuration.focusPreferences.pomodoroMinutes)} />{" "}
                  {uiText("minutos")} ·{" "}
                  {configuration.preferences.rhythm === "difuso"
                    ? uiText("Com pausas")
                    : uiText("Foco contínuo")}
                </dd>
              </div>
              <div>
                <dt>{uiText("Matéria inicial")}</dt>
                <dd>
                  {configuration.subject
                    ? uiText(configuration.subject.name)
                    : uiText("Escolher depois")}
                </dd>
              </div>
              <div>
                <dt>{uiText("Preferências")}</dt>
                <dd>{uiText(String(answers[5]))}</dd>
              </div>
            </dl>
          )}
          <div className="onboarding__actions onboarding__actions--chat">
            {step > 0 && !showLogin && (
              <button type="button" disabled={stage === "reacting"} onClick={goBack}>
                <PaperArrow back /> {uiText(374)}
              </button>
            )}
            {question && stage === "ask" && question.multiple && (
              <button
                type="button"
                className="is-primary"
                disabled={!multipleReady}
                onClick={() => {
                  setStage("reacting");
                }}
              >
                {uiText(1436)} <PaperArrow />
              </button>
            )}
            {finished && (
              <button
                type="button"
                className="is-primary"
                disabled={!configuration && !skipPreparation}
                onClick={openLogin}
              >
                {uiText("Registre-se")}
                <PaperArrow />
              </button>
            )}
          </div>
          <p className="onboarding__privacy">
            {uiText("A Olena configura seu espaço com estas respostas.")}
          </p>
        </div>
      </section>
      <BrandFooter withOlena />
    </main>
  );
}
