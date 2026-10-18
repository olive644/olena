import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { OnboardingPaperIcon } from "../components/onboarding-paper-icon";
import { PaperArrow } from "../components/paper-arrow";
import "./onboarding.css";
import { BrandFooter } from "../components/brand-footer";
import { GoogleLogin, hasPendingGoogleRedirect, readPendingGoogleAnswers } from "./google-login";
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

export default function OnboardingView({
  onFinish,
  loginOnly = false,
}: {
  onFinish: (setup?: OnboardingSetup) => void;
  loginOnly?: boolean;
}) {
  useLanguage();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswer[]>(() =>
    hasPendingGoogleRedirect() ? [...readPendingGoogleAnswers()] : [],
  );
  const [showLogin, setShowLogin] = useState(
    () =>
      loginOnly ||
      new URLSearchParams(window.location.search).has("login") ||
      hasPendingGoogleRedirect(),
  );
  const title = useRef<HTMLHeadingElement>(null);
  const question = questions[step];
  const poseIndex = question ? Math.min(step, 4) : 3;
  const poseDescriptions = [uiText(2019), uiText(1429), uiText(1430), uiText(1431), uiText(1432)];
  useEffect(() => {
    if (step >= 4) return;
    const nextPose = new Image();
    nextPose.src =
      step === 3 ? "/helena-onboarding-step-5-v3.webp" : `/helena-onboarding-step-${step + 2}.webp`;
  }, [step]);
  useEffect(() => {
    title.current?.focus();
  }, [step]);

  if (showLogin)
    return (
      <GoogleLogin
        answers={answers}
        onFinish={() => onFinish(buildSetup(answers))}
        {...(!loginOnly && { onBack: () => setShowLogin(false) })}
      />
    );

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
      <section className="onboarding__form">
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
        <div className="onboarding__conversation">
          <div className="onboarding__bubble">
            <h2 ref={title} tabIndex={-1}>
              {question?.title ?? uiText(2281)}
            </h2>
            <p>{question?.hint ?? uiText(2282)}</p>
          </div>
          <img
            src={
              poseIndex === 4
                ? "/helena-onboarding-step-5-v3.webp"
                : `/helena-onboarding-step-${poseIndex + 1}.webp`
            }
            alt={poseDescriptions[poseIndex]}
            width={640}
            height={640}
            decoding="async"
            className="onboarding__helena"
          />
        </div>
        <div className="onboarding__answers">
          {showLogin ? (
            <GoogleLogin answers={answers} onFinish={onFinish} onBack={() => setShowLogin(false)} />
          ) : (
            <>
              {question ? (
                <fieldset className="onboarding__choices">
                  <legend className="sr-only">{question.title}</legend>
                  {question.options.map((option, index) => (
                    <label
                      key={option}
                      className={selectedAnswer(answers[step], option) ? "is-selected" : ""}
                    >
                      <input
                        type={question.multiple ? "checkbox" : "radio"}
                        name={`step-${step}`}
                        checked={selectedAnswer(answers[step], option)}
                        onChange={() =>
                          setAnswers((previous) => {
                            const next = [...previous];
                            if (question.multiple) {
                              const selected = Array.isArray(previous[step]) ? previous[step] : [];
                              next[step] = selected.includes(option)
                                ? selected.filter((item) => item !== option)
                                : [...selected, option];
                            } else {
                              next[step] = option;
                            }
                            return next;
                          })
                        }
                      />
                      {question.icon && (
                        <OnboardingPaperIcon
                          name={onboardingIconNames[step]?.[index] ?? "compass"}
                        />
                      )}
                      <span>{uiText(option)}</span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <ul className="onboarding__summary">
                  {answers.map((answer, index) => (
                    <li key={index}>
                      {Array.isArray(answer)
                        ? answer.map((item) => uiText(item)).join(", ")
                        : uiText(answer)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="onboarding__actions">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => setStep((value) => value - 1)}
                >
                  <PaperArrow back /> {uiText(374)}
                </button>
                {question ? (
                  <button
                    type="button"
                    disabled={
                      !answers[step] || (Array.isArray(answers[step]) && answers[step].length === 0)
                    }
                    onClick={() => setStep((value) => value + 1)}
                  >
                    {uiText(1436)} <PaperArrow />
                  </button>
                ) : (
                  <button type="button" onClick={() => setShowLogin(true)}>
                    {uiText(870)}
                    <PaperArrow />
                  </button>
                )}
              </div>
            </>
          )}
          <p className="onboarding__privacy">{uiText(1437)}</p>
        </div>
      </section>
      <BrandFooter />
    </main>
  );
}
