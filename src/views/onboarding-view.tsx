import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "../data/reduced-motion";
import { OnboardingPaperIcon } from "../components/onboarding-paper-icon";
import { PaperArrow } from "../components/paper-arrow";
import "./onboarding.css";
import { BrandFooter } from "../components/brand-footer";
import {
  GoogleLogin,
  enterAsGuest,
  hasPendingGoogleRedirect,
  readPendingGoogleAnswers,
} from "./google-login";
import { GUEST_NAME } from "../domain/guest-session";
import type { StudyModality, StudyPreferences } from "../domain/study-preferences";

type OnboardingAnswer = string | string[];

type OnboardingSetup = {
  preferences: StudyPreferences;
};

type OnboardingQuestion = {
  title: string;
  hint: string;
  icon?: string;
  options: readonly string[];
  multiple?: boolean;
};

const questions: readonly OnboardingQuestion[] = localizeLabels(
  () =>
    [
      {
        title: uiText(1399),
        hint: uiText(1400),
        icon: "library",
        options: [
          "Ensino fundamental",
          "Ensino médio",
          "Ensino superior",
          "Estudo por conta própria",
          "Sou professor",
        ],
      },
      {
        title: uiText(1403),
        hint: uiText(1404),
        icon: "notes",
        options: [
          "Línguas",
          "Matemática",
          "Ciências",
          "História e geografia",
          "Artes e tecnologia",
          "Programação",
          "Ainda estou descobrindo",
        ],
      },
      {
        title: uiText(1409),
        hint: uiText(1410),
        icon: "learn",
        options: ["Inglês", "Português", "Espanhol", "Outro idioma", "Não é meu foco agora"],
      },
      {
        title: uiText(1413),
        hint: uiText(1414),
        icon: "xp",
        options: [
          "Criar uma rotina",
          "Revisar para provas",
          "Aprender algo novo",
          "Praticar com minha turma",
        ],
      },
      {
        title: uiText(1417),
        hint: uiText(1418),
        options: ["Visual", "Ouvindo e conversando", "Lendo e escrevendo", "Praticando"],
        multiple: true,
      },
      {
        title: uiText(1419),
        hint: uiText(1420),
        options: ["Passo a passo", "Visão geral primeiro"],
      },
      {
        title: uiText(1422),
        hint: uiText(1423),
        options: ["Foco contínuo", "Alternar estudo e pausas"],
      },
      {
        title: uiText(1425),
        hint: uiText(1426),
        options: ["Python", "JavaScript", "Python e JavaScript", "Agora não"],
      },
      {
        title: uiText(1427),
        hint: uiText(1428),
        icon: "focus",
        options: ["5 minutos", "15 minutos", "30 minutos", "Prefiro decidir a cada dia"],
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
  ["chat", "calculator", "science", "globe", "art", "compass"],
  ["flag-us", "flag-br", "flag-es", "globe", "pause"],
  ["calendar", "exam", "bulb", "group"],
  [],
  [],
  [],
  [],
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
          : answers[1] === "Programação"
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
  const [showLogin, setShowLogin] = useState(
    () =>
      loginOnly ||
      new URLSearchParams(window.location.search).has("login") ||
      hasPendingGoogleRedirect(),
  );
  const seen = useRef(new Set<number>(hasPendingGoogleRedirect() ? [questions.length] : []));
  const latest = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<HTMLHeadingElement>(null);
  const choices = useRef<HTMLFieldSetElement>(null);
  const question = questions[step];
  const pose = poseFor(step);
  const poseDescriptions = [uiText(2019), uiText(1429), uiText(1430), uiText(1431), uiText(1432)];
  const talking = stage !== "ask" && !showLogin;

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
    latest.current?.scrollIntoView?.({ block: "end", behavior });
    // No celular as respostas ficam abaixo da conversa: traz a página até elas.
    if (stage === "ask") choices.current?.scrollIntoView?.({ block: "nearest", behavior });
  }, [stage, step]);

  useEffect(() => {
    if (step >= 8) return;
    const nextPose = new Image();
    nextPose.src = poseSource(poseFor(step + 1));
  }, [step]);

  function answer(value: OnboardingAnswer) {
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
        onFinish={() => onFinish(buildSetup(answers))}
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
          {uiText(117)}
          <span>{uiText(118)}</span>
        </span>
        <span className="onboarding__eyebrow">{uiText(1433)}</span>
      </header>
      <section className={leaving ? "onboarding__form is-leaving" : "onboarding__form"}>
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
          <div className="onboarding__messages">
            <p className="onboarding__message onboarding__message--olena">
              {uiText("Oi! Eu sou a Olena, sua assistente de estudos.")}
            </p>
            <p className="onboarding__message onboarding__message--olena onboarding__message--second">
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
                <div className="onboarding__turn" key={index}>
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
                {uiText("Prontinho! Falta só entrar com o Google para começar.")}
              </p>
            )}
            <div ref={latest} aria-hidden="true" />
          </div>
          {question && stage === "ask" && (
            <fieldset className="onboarding__choices" key={step} ref={choices}>
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
                  {question.icon && (
                    <OnboardingPaperIcon name={onboardingIconNames[step]?.[index] ?? "compass"} />
                  )}
                  <span>{uiText(option)}</span>
                </button>
              ))}
            </fieldset>
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
              <button type="button" className="is-primary" onClick={openLogin}>
                {uiText(870)}
                <PaperArrow />
              </button>
            )}
          </div>
          {finished && (
            <div className="onboarding__guest">
              <button
                type="button"
                onClick={() => {
                  enterAsGuest(answers);
                  onFinish(buildSetup(answers));
                }}
              >
                {uiText(1213)}
              </button>
              <p>
                {uiText(1214)} {GUEST_NAME} {uiText(1215)}
              </p>
            </div>
          )}
          <p className="onboarding__privacy">{uiText(1437)}</p>
        </div>
      </section>
      <BrandFooter />
    </main>
  );
}
