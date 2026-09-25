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

const questions: readonly OnboardingQuestion[] = [
  {
    title: "Em que fase dos estudos você está?",
    hint: "Cada jornada tem seu próprio ritmo.",
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
    title: "Qual matéria desperta sua curiosidade?",
    hint: "Escolha sua favorita para começar.",
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
    title: "Qual idioma você quer praticar?",
    hint: "O aplicativo continua em português. Esta é sua preferência de estudo.",
    icon: "learn",
    options: ["Inglês", "Português", "Espanhol", "Outro idioma", "Não é meu foco agora"],
  },
  {
    title: "O que você quer conquistar?",
    hint: "Vamos guardar seu objetivo, sem pressão.",
    icon: "habits",
    options: [
      "Criar uma rotina",
      "Revisar para provas",
      "Aprender algo novo",
      "Praticar com minha turma",
    ],
  },
  {
    title: "Como você prefere aprender?",
    hint: "Você pode escolher mais de uma opção.",
    options: ["Visual", "Ouvindo e conversando", "Lendo e escrevendo", "Praticando"],
    multiple: true,
  },
  {
    title: "Como você gosta de organizar o estudo?",
    hint: "Vamos preparar sua experiência inicial.",
    options: ["Passo a passo", "Visão geral primeiro"],
  },
  {
    title: "Qual ritmo combina mais com você?",
    hint: "Você poderá mudar essa escolha nas configurações de Perfil.",
    options: ["Foco contínuo", "Alternar estudo e pausas"],
  },
  {
    title: "Quer incluir programação na sua jornada?",
    hint: "Isso prepara seu espaço para futuras trilhas de código.",
    options: ["Python", "JavaScript", "Python e JavaScript", "Agora não"],
  },
  {
    title: "Quanto tempo cabe no seu dia?",
    hint: "Um pouco de cada vez também faz diferença.",
    icon: "focus",
    options: ["5 minutos", "15 minutos", "30 minutos", "Prefiro decidir a cada dia"],
  },
] as const;

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
  const poseDescriptions = [
    "Helena lendo um livro roxo",
    "Helena pensativa segurando um lápis",
    "Helena acenando com balões de conversa",
    "Helena comemorando com estrelas",
    "Helena segurando um relógio roxo com as duas patinhas",
  ];
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
      <h1 className="sr-only">
        OlenaStudy: agenda de estudos, pomodoro, flashcards e quizzes para ENEM, vestibular e
        concursos
      </h1>
      <header className="onboarding__header">
        <span className="onboarding__brand">
          Olena<span>Study</span>
        </span>
        <span className="onboarding__eyebrow">UM COMEÇO DO SEU JEITO</span>
      </header>
      <section className="onboarding__form">
        <div className="onboarding__progress">
          <p aria-live="polite">
            {question ? `Passo ${step + 1} de ${questions.length}` : "Tudo pronto para começar"}
          </p>
          <progress
            value={question ? step + 1 : questions.length}
            max={questions.length}
            aria-label="Progresso do onboarding"
          />
        </div>
        <div className="onboarding__conversation">
          <div className="onboarding__bubble">
            <h2 ref={title} tabIndex={-1}>
              {question?.title ?? "Sua jornada tem a sua cara."}
            </h2>
            <p>
              {question?.hint ??
                "Entre com Google para continuar. Suas preferências ficam neste dispositivo; seus estudos ainda não são sincronizados na nuvem."}
            </p>
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
                      <span>{option}</span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <ul className="onboarding__summary">
                  {answers.map((answer, index) => (
                    <li key={index}>{answer}</li>
                  ))}
                </ul>
              )}
              <div className="onboarding__actions">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => setStep((value) => value - 1)}
                >
                  <PaperArrow back /> Voltar
                </button>
                {question ? (
                  <button
                    type="button"
                    disabled={
                      !answers[step] || (Array.isArray(answers[step]) && answers[step].length === 0)
                    }
                    onClick={() => setStep((value) => value + 1)}
                  >
                    Continuar <PaperArrow />
                  </button>
                ) : (
                  <button type="button" onClick={() => setShowLogin(true)}>
                    Entrar com Google
                    <PaperArrow />
                  </button>
                )}
              </div>
            </>
          )}
          <p className="onboarding__privacy">Só o necessário para conhecer seu jeito de estudar.</p>
        </div>
      </section>
      <BrandFooter />
    </main>
  );
}
