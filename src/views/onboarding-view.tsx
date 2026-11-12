import { getFirebaseAccountServices } from "../data/firebase-account";
import { uiText, useLanguage, localizeLabels, changeLanguage, uiLocale } from "../i18n/runtime";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { reducedMotion } from "../data/reduced-motion";
import { OnboardingPaperIcon } from "../components/onboarding-paper-icon";
import { FocusPaperArrow } from "../components/focus-paper-arrow";
import { PaperArrow } from "../components/paper-arrow";
import { PaperCardTitle } from "../components/paper-card-title";
import { HelenaLoading } from "../components/helena-loading";
import "./onboarding.css";
import {
  GoogleLogin,
  saveOnboardingCompletion,
  hasPendingGoogleRedirect,
  readPendingGoogleAnswers,
} from "./google-login";
import type { StudyModality, StudyPreferences } from "../domain/study-preferences";
import {
  ONBOARDING_OPTIONS,
  type OnboardingConfiguration,
} from "../domain/onboarding-configuration";
import { accountHasProgress } from "../data/account-progress";
import { requestOnboardingConfiguration } from "../data/onboarding-client";
import { ACCOUNT_OWNER_KEY } from "../data/personal-data";
import { PaperDigits } from "../components/paper-digits";
import { PROFILE_AVATARS } from "../domain/profile-avatars";

type OnboardingAnswer = string | string[];

type OnboardingSetup = {
  displayName?: string;
  preferences: StudyPreferences;
  configuration?: OnboardingConfiguration;
};

type OnboardingQuestion = {
  title: string;
  options: readonly string[];
  multiple?: boolean;
};

const questions: readonly OnboardingQuestion[] = localizeLabels(
  () =>
    [
      {
        title: uiText(1399),
        options: ["Ensino médio", "Ensino superior", "Estudo por conta própria"],
      },
      {
        title: uiText("Qual disciplina você mais tem dificuldade?"),
        options: ONBOARDING_OPTIONS[1]!,
      },
      {
        title: uiText(1409),
        options: ONBOARDING_OPTIONS[2]!,
      },
      {
        title: uiText(1413),
        options: ONBOARDING_OPTIONS[3]!,
      },
      {
        title: uiText(1417),
        options: ONBOARDING_OPTIONS[4]!,
        multiple: true,
      },
      {
        title: uiText(1419),
        options: ONBOARDING_OPTIONS[5]!,
      },
      {
        title: uiText(1422),
        options: ONBOARDING_OPTIONS[6]!,
      },
      {
        title: uiText(1425),
        options: ONBOARDING_OPTIONS[7]!,
      },
      {
        title: uiText(1427),
        options: ONBOARDING_OPTIONS[8]!,
      },
    ] as const,
);

/** Falas da Olena depois de cada resposta, na ordem das perguntas. Roteiro local, sem IA nem rede. */

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
  ["python", "javascript", "code-pair", "code-pair", "later"],
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
          : programmingAnswer === "HTML e CSS"
            ? "html-css"
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

type Stage = "typing" | "ask" | "reacting";

const ONBOARDING_OLENA = "/helena-onboarding-step-1-cutout.webp";

function calculationAccent(text: string) {
  const end = text.split(" ").slice(0, 2).join(" ").length;
  return (
    <>
      <strong>{text.slice(0, end)}</strong>
      {text.slice(end)}
    </>
  );
}

export default function OnboardingView({
  onFinish,
  loginOnly = false,
  authenticated = false,
  accountLoading = false,
  showCover: initialCover = false,
}: {
  onFinish: (setup?: OnboardingSetup) => void;
  loginOnly?: boolean;
  authenticated?: boolean;
  accountLoading?: boolean;
  showCover?: boolean;
}) {
  useLanguage();
  const [showCover] = useState(initialCover);
  const [coverLoginClosing, setCoverLoginClosing] = useState(false);
  const [coverDismissed, setCoverDismissed] = useState(false);
  const cover = showCover && !coverDismissed && !authenticated && !hasPendingGoogleRedirect();

  const [answers, setAnswers] = useState<OnboardingAnswer[]>(() =>
    hasPendingGoogleRedirect() ? [...readPendingGoogleAnswers()] : [],
  );
  // Quem volta do Google já respondeu tudo: a conversa reabre na despedida da Olena.
  const [step, setStep] = useState(() =>
    answers.length === questions.length ? questions.length : 0,
  );
  const [stage, setStage] = useState<Stage>(() => (hasPendingGoogleRedirect() ? "ask" : "typing"));
  const [registerFirst, setRegisterFirst] = useState(false);
  const [prepared, setPrepared] = useState<{ key: string; value: OnboardingConfiguration }>();
  const [preparationFailed, setPreparationFailed] = useState(false);
  const [skipPreparation, setSkipPreparation] = useState(false);
  const [retryPreparation, setRetryPreparation] = useState(0);
  const [showLogin, setShowLogin] = useState(
    () =>
      (!authenticated && (loginOnly || new URLSearchParams(window.location.search).has("login"))) ||
      hasPendingGoogleRedirect(),
  );
  const [directLogin, setDirectLogin] = useState(loginOnly);
  const [awaitingAccount, setAwaitingAccount] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState<"intro" | "name" | "avatar">("intro");
  const welcomeTarget = useRef<HTMLInputElement>(null);
  const welcomeAdvance = useRef<HTMLButtonElement>(null);
  const avatarHeading = useRef<HTMLHeadingElement>(null);
  const [introName, setIntroName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [schoolStep, setSchoolStep] = useState<"level" | "year" | "school">();
  const [schoolLevel, setSchoolLevel] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolCity, setSchoolCity] = useState("");
  const [schools, setSchools] = useState<
    Partial<Record<"schools" | "universities", [string, string, string, string?][]>>
  >({});
  const university = answers[0] === "Ensino superior";
  const catalogKey = university ? "universities" : "schools";
  const institutions = schools[catalogKey];
  const institutionLabel = university ? uiText("Nome da universidade") : uiText("Nome da escola");
  const schoolSearchKey = (value: string) =>
    value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const recommended = !schoolCity.trim() && !schoolName.trim();
  const schoolMatches = [];
  if (schoolStep === "school" && institutions) {
    const city = schoolSearchKey(schoolCity);
    const name = schoolSearchKey(schoolName);
    const states = new Set<string>();
    for (const school of institutions) {
      if (
        schoolSearchKey(school[1] + " " + school[2]).includes(city) &&
        schoolSearchKey(school[0] + " " + (school[3] ?? "")).includes(name) &&
        (!recommended || !states.has(school[2]))
      ) {
        states.add(school[2]);
        schoolMatches.push(school);
        if (schoolMatches.length === 8) break;
      }
    }
  }
  useEffect(() => {
    if (schoolStep !== "school" || institutions) return;
    const controller = new AbortController();
    void fetch(`/data/${catalogKey}-inep-2024.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((rows) => {
        if (!controller.signal.aborted)
          setSchools((previous) => ({ ...previous, [catalogKey]: rows }));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [catalogKey, institutions, schoolStep]);
  const [introAvatar, setIntroAvatar] = useState("");
  const [introLine, setIntroLine] = useState(0);
  const [introCharacters, setIntroCharacters] = useState(1);
  const introLines = [
    uiText("Olá! Eu sou a Olena."),
    uiText("Obrigada por nos escolher para seus estudos."),
    uiText("Vou te fazer algumas perguntas rápidas para personalizar seu espaço pessoal."),
  ];
  const seen = useRef(new Set<number>(hasPendingGoogleRedirect() ? [questions.length] : []));
  const messages = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<HTMLHeadingElement>(null);
  const question = questions[step];
  const [titleLength, setTitleLength] = useState(1);
  const talking = stage !== "ask" && !showLogin;
  const answersKey = JSON.stringify(answers);
  const configuration = prepared?.key === answersKey ? prepared.value : undefined;
  const introText = introLines[introLine] ?? "";
  const introStartLength = introText.split(" ").slice(0, 2).join(" ").length;
  const introTextComplete = reducedMotion() || introCharacters >= introText.length;
  const visibleIntroText = introTextComplete
    ? introText
    : introText.slice(0, Math.max(introCharacters, introStartLength));
  const introAccentEnd = introText.split(" ").slice(0, 4).join(" ").length;
  const introReady = introLine === introLines.length - 1 && introTextComplete;
  useEffect(() => {
    if (cover || introDismissed || introReady || showLogin || step !== 0) return;
    const timer = window.setTimeout(
      () => {
        if (introTextComplete) {
          setIntroLine(introLine + 1);
          setIntroCharacters(1);
        } else {
          setIntroCharacters(Math.max(introCharacters, introStartLength) + 1);
        }
      },
      introTextComplete ? 1250 : 22,
    );
    return () => window.clearTimeout(timer);
  }, [
    introCharacters,
    introDismissed,
    introLine,
    introReady,
    introStartLength,
    cover,
    introTextComplete,
    showLogin,
    step,
  ]);
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
      setTitleLength(1);
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

  const questionTitle = question?.title ?? "";
  const firstWordLength = questionTitle.split(" ").slice(0, 2).join(" ").length;
  const visibleTitleLength = reducedMotion()
    ? questionTitle.length
    : Math.max(titleLength, firstWordLength);
  useEffect(() => {
    if (stage !== "ask" || titleLength >= questionTitle.length || reducedMotion()) return;
    const timer = window.setTimeout(
      () => setTitleLength(Math.max(titleLength, firstWordLength) + 1),
      22,
    );
    return () => window.clearTimeout(timer);
  }, [firstWordLength, questionTitle, stage, titleLength]);

  function answer(value: OnboardingAnswer) {
    setPreparationFailed(false);
    setSkipPreparation(false);
    setAnswers((previous) => {
      const next = [...previous];
      next[step] = value;
      return next;
    });
  }

  function confirmAnswer() {
    setStage("reacting");
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
  }

  function advanceSchool() {
    if (schoolStep === "level") {
      setSchoolName("");
      setSchoolCity("");
      answer(schoolLevel === "Ensino fundamental" ? schoolLevel : "Ensino médio");
      setSchoolStep("year");
    } else if (schoolStep === "year") {
      setSchoolStep("school");
    } else {
      setSchoolStep(undefined);
      setTitleLength(1);
      setStep(1);
      setStage("typing");
    }
  }

  function goBack() {
    if (step === 0 || stage === "reacting") return;
    seen.current.add(step - 1);
    setTitleLength(1);
    setStep(step - 1);
    setStage("ask");
  }

  const finished = !question;
  const completed = Boolean(configuration || skipPreparation);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const progressLimit = completed ? 100 : 88;
  const progress = reducedMotion() ? progressLimit : calculationProgress;
  useEffect(() => {
    if (!finished || showLogin || reducedMotion() || (preparationFailed && !completed)) return;
    const timer = window.setInterval(() => {
      setCalculationProgress((value) => Math.min(value + 2, progressLimit));
    }, 35);
    return () => window.clearInterval(timer);
  }, [completed, finished, preparationFailed, progressLimit, showLogin]);
  useEffect(() => {
    if (!finished || !completed || progress < 100 || showLogin) return;
    const timer = window.setTimeout(
      () => {
        const details = {
          name: introName.trim(),
          avatar: introAvatar,
          schoolLevel,
          schoolYear,
          institution: schoolName.trim(),
          municipality: schoolCity.trim(),
        };
        if (authenticated) {
          saveOnboardingCompletion(
            answers,
            configuration,
            localStorage.getItem(ACCOUNT_OWNER_KEY) ?? undefined,
            details,
          );
        } else {
          setShowLogin(true);
          return;
        }
        onFinish({
          ...buildSetup(answers),
          displayName: details.name,
          ...(configuration ? { configuration } : {}),
        });
      },
      reducedMotion() ? 0 : 850,
    );
    return () => window.clearTimeout(timer);
  }, [
    answers,
    authenticated,
    completed,
    configuration,
    finished,
    introAvatar,
    introName,
    onFinish,
    progress,
    schoolCity,
    schoolLevel,
    schoolName,
    schoolYear,
    showLogin,
  ]);

  const coverLogin = showCover && coverDismissed && showLogin && registerFirst && !authenticated;
  function finishCoverLoginClose() {
    setCoverLoginClosing(false);
    setRegisterFirst(false);
    setShowLogin(false);
    setCoverDismissed(false);
  }
  function closeCoverLogin() {
    if (reducedMotion()) finishCoverLoginClose();
    else setCoverLoginClosing(true);
  }
  const loginWidget = (
    <GoogleLogin
      embedded={coverLogin}
      returning={directLogin}
      registerFirst={registerFirst}
      onCreateAccount={() => {
        setRegisterFirst(true);
        setDirectLogin(false);
        setShowLogin(true);
      }}
      answers={directLogin ? [] : answers}
      configuration={directLogin ? undefined : configuration}
      onFinish={() => {
        setAwaitingAccount(true);
        if (answers.length === questions.length) {
          onFinish({ ...buildSetup(answers), ...(configuration ? { configuration } : {}) });
        } else {
          setCoverDismissed(true);
          setShowLogin(false);
          onFinish();
        }
      }}
      {...(!coverLogin &&
        (!loginOnly || showCover) &&
        !directLogin && {
          onBack: () => {
            setRegisterFirst(false);
            setShowLogin(false);
            if (showCover) setCoverDismissed(false);
          },
        })}
    />
  );

  if (accountLoading || (awaitingAccount && !authenticated))
    return <HelenaLoading label={uiText("Carregando sua conta…")} />;

  if (cover || coverLogin)
    return (
      <main className="onboarding olena-cover" id="main-content">
        <header className="onboarding__header">
          <span className="onboarding__brand">
            <img src="/olena-favicon-180.png" alt="" width={40} height={40} />
            <PaperCardTitle value="OlenaStudy" />
          </span>
        </header>
        <section className="olena-cover__hero">
          <div className="olena-cover__copy">
            <h1>
              <PaperCardTitle value={uiText("Estude do seu jeito")} />
            </h1>
            <div className="onboarding__actions onboarding__actions--chat">
              <button
                type="button"
                onClick={() => {
                  setRegisterFirst(true);
                  setDirectLogin(false);
                  setShowLogin(true);
                  setCoverDismissed(true);
                }}
              >
                {uiText("Começar agora")} <PaperArrow />
              </button>
            </div>
          </div>
          <img
            className="olena-cover__art"
            src="/olena-cover-hires.webp"
            width={1254}
            height={1254}
            alt=""
          />
        </section>
        <footer className="olena-cover__footer">
          <div className="olena-cover__footer-stage">
            <div className="olena-cover__footer-controls">
              <details className="olena-cover__language">
                <summary>
                  <OnboardingPaperIcon name={uiLocale() === "pt-BR" ? "flag-br" : "flag-us"} />
                  {uiLocale() === "pt-BR" ? "Português" : "English"}
                  <FocusPaperArrow />
                </summary>
                <div className="olena-cover__language-options">
                  {(["pt-BR", "en-US"] as const).map((locale) => (
                    <button
                      key={locale}
                      type="button"
                      aria-pressed={uiLocale() === locale}
                      onClick={(event) => {
                        const menu = event.currentTarget.closest("details");
                        void changeLanguage(locale)
                          .then(() => {
                            if (menu) {
                              menu.open = false;
                              menu.querySelector("summary")?.focus();
                            }
                          })
                          .catch(console.error);
                      }}
                    >
                      <OnboardingPaperIcon name={locale === "pt-BR" ? "flag-br" : "flag-us"} />
                      {locale === "pt-BR" ? "Português" : "English"}
                    </button>
                  ))}
                </div>
              </details>
              <div className="olena-cover__social">
                {(
                  [
                    ["Instagram", "https://www.instagram.com/olenastudy.app/", "profile-instagram"],
                    [
                      "LinkedIn",
                      "https://www.linkedin.com/company/olenastudy/",
                      "profile-linkedin",
                    ],
                    [
                      "TikTok",
                      "https://www.tiktok.com/@olenastudy.app?lang=pt-BR",
                      "footer-tiktok",
                    ],
                    ["Discord", "https://discord.gg/VVba3Tbvq", "discord-access"],
                  ] as const
                ).map(([name, href, icon]) => (
                  <a key={name} href={href} aria-label={name}>
                    <img
                      src={`/navigation-icons/paper/${icon}.svg`}
                      width={name === "Discord" ? 32 : 36}
                      height={name === "Discord" ? 32 : 36}
                      alt=""
                    />
                  </a>
                ))}
              </div>
            </div>
            <PaperCardTitle value="OlenaStudy" />
            <img
              className="olena-cover__footer-mascot"
              src="/olena-footer-front.webp"
              width={1254}
              height={1254}
              alt=""
              loading="lazy"
            />
          </div>
          <small className="olena-cover__footer-rights">
            <img src="/galeria-oli-icon.svg" alt="" width={24} height={24} />
            <span>
              © {new Date().getFullYear()} {uiText(1635)}
            </span>
          </small>
          <nav className="olena-cover__footer-links">
            <a href="/termos-de-uso.html">{uiText("Termos de Uso")}</a>
            <a href="/politica-de-privacidade.html">{uiText(411)}</a>
          </nav>
        </footer>
        {coverLogin && (
          <dialog
            className="olena-cover__login"
            aria-label={uiText(1197)}
            ref={(dialog) => {
              if (dialog && !dialog.open) dialog.showModal();
            }}
            data-closing={coverLoginClosing}
            onAnimationEnd={(event) => {
              if (coverLoginClosing && event.target === event.currentTarget)
                finishCoverLoginClose();
            }}
            onCancel={(event) => {
              event.preventDefault();
              closeCoverLogin();
            }}
          >
            <button
              type="button"
              className="olena-cover__login-close"
              aria-label={uiText("Fechar")}
              onClick={closeCoverLogin}
            >
              <img src="/navigation-icons/paper/close.svg" width={24} height={24} alt="" />
            </button>
            {loginWidget}
          </dialog>
        )}
      </main>
    );

  if (showLogin && !authenticated) return loginWidget;

  const multipleReady = Array.isArray(answers[step]) && answers[step].length > 0;

  return (
    <main className="onboarding" id="main-content" data-opening={finished && progress === 100}>
      <h1 className="sr-only">{uiText(1198)}</h1>
      <header className="onboarding__header">
        <span className="onboarding__brand">
          <img src="/olena-favicon-180.png" alt="" width="32" height="32" />
          <span>
            <PaperCardTitle value="Olena" />
            <PaperCardTitle value="Study" />
          </span>
        </span>
      </header>
      {step === 0 && !introDismissed && (
        <section
          key={welcomeStep}
          className="onboarding__welcome"
          data-step={welcomeStep}
          data-authenticated={authenticated}
        >
          {welcomeStep !== "avatar" && (
            <>
              <img
                src={ONBOARDING_OLENA}
                alt=""
                width={640}
                height={640}
                className="onboarding__helena"
              />
              <div className="onboarding__welcome-copy" aria-live="polite">
                {welcomeStep === "name" ? (
                  <p className="onboarding__message onboarding__message--olena">
                    {introName.trim() ? (
                      <>
                        {uiText("Prazer em te conhecer,")} <strong>{introName.trim()}</strong>!
                      </>
                    ) : (
                      uiText("Como devo te chamar?")
                    )}
                  </p>
                ) : (
                  <p className="onboarding__message onboarding__message--olena">
                    <span className="sr-only">{introText}</span>
                    <span aria-hidden="true">
                      <strong>{visibleIntroText.slice(0, introAccentEnd)}</strong>
                      {visibleIntroText.slice(introAccentEnd)}
                    </span>
                  </p>
                )}
              </div>
              {welcomeStep === "name" && (
                <input
                  ref={welcomeTarget}
                  className="onboarding__welcome-name"
                  aria-label={uiText("Como devo te chamar?")}
                  value={introName}
                  maxLength={40}
                  autoComplete="nickname"
                  disabled={savingName}
                  onChange={(event) => setIntroName(event.currentTarget.value)}
                />
              )}
            </>
          )}
          {welcomeStep === "avatar" && (
            <>
              <h2 ref={avatarHeading} tabIndex={-1}>
                {uiText("Personalize seu visual!")}
              </h2>
              <div
                className="onboarding__choices onboarding__welcome-avatars"
                role="group"
                aria-label={uiText("Escolha seu avatar")}
              >
                {PROFILE_AVATARS.map(({ name, photoUrl }) => (
                  <button
                    type="button"
                    key={photoUrl}
                    aria-pressed={introAvatar === photoUrl}
                    onClick={() => setIntroAvatar(photoUrl)}
                  >
                    <img src={photoUrl} alt="" width={40} height={40} />
                    <span>{name}</span>
                    {introAvatar === photoUrl && (
                      <img
                        className="onboarding__avatar-check"
                        src="/room-icons/check.svg"
                        alt=""
                        width={20}
                        height={20}
                      />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
          {nameError && (
            <p role="alert">{uiText("Não foi possível salvar seu nome. Tente novamente.")}</p>
          )}
          <div className="onboarding__actions" data-navigation={welcomeStep !== "intro"}>
            {welcomeStep !== "intro" && (
              <button
                type="button"
                onClick={() => {
                  setWelcomeStep(welcomeStep === "avatar" ? "name" : "intro");
                  requestAnimationFrame(() =>
                    (welcomeTarget.current ?? welcomeAdvance.current)?.focus(),
                  );
                }}
              >
                <PaperArrow back /> {uiText(374)}
              </button>
            )}
            {introReady && (
              <button
                ref={welcomeAdvance}
                type="button"
                disabled={
                  welcomeStep === "name"
                    ? !introName.trim() || savingName
                    : welcomeStep === "avatar" && !introAvatar
                }
                onClick={() => {
                  if (welcomeStep === "intro") {
                    setWelcomeStep("name");
                    requestAnimationFrame(() => welcomeTarget.current?.focus());
                    return;
                  }
                  if (welcomeStep === "name") {
                    const next = () => {
                      setWelcomeStep("avatar");
                      requestAnimationFrame(() => avatarHeading.current?.focus());
                    };
                    if (!authenticated) {
                      next();
                      return;
                    }
                    setSavingName(true);
                    setNameError(false);
                    void getFirebaseAccountServices()
                      .then(async ({ auth, authApi }) => {
                        const user = auth.currentUser;
                        if (!user || user.uid !== localStorage.getItem(ACCOUNT_OWNER_KEY))
                          throw new Error("auth/user-mismatch");
                        // Conta que já tem nome e progresso não tem o nome trocado por quem refaz o
                        // onboarding (o nome digitado aqui valia como o nome da conta inteira).
                        if (!(user.displayName && accountHasProgress(localStorage)))
                          await authApi.updateProfile(user, { displayName: introName.trim() });
                        if (auth.currentUser?.uid !== user.uid)
                          throw new Error("auth/user-mismatch");
                        next();
                      })
                      .catch(() => setNameError(true))
                      .finally(() => setSavingName(false));
                    return;
                  }
                  setIntroDismissed(true);
                  requestAnimationFrame(() => focusTarget.current?.focus());
                }}
              >
                {welcomeStep === "intro" ? uiText("Prosseguir") : uiText("Avançar")} <PaperArrow />
              </button>
            )}
          </div>
        </section>
      )}
      {schoolStep && (
        <section key={schoolStep} className="onboarding__school">
          <h2>
            {schoolStep === "level"
              ? uiText("Qual modalidade você cursa?")
              : schoolStep === "year"
                ? uiText("Em que ano você está?")
                : university
                  ? uiText("Em qual universidade você estuda?")
                  : uiText("Onde você estuda?")}
          </h2>
          {schoolStep === "school" ? (
            <div className="onboarding__school-search">
              <label className="onboarding__school-query">
                <img
                  src="/navigation-icons/paper/profile-search.svg"
                  width={22}
                  height={22}
                  alt=""
                />
                <input
                  className="onboarding__welcome-name"
                  type="search"
                  aria-label={institutionLabel}
                  placeholder={institutionLabel}
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                />
              </label>
              <label className="onboarding__school-query">
                <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
                  <path fill="#7433e0" d="m12 23-8-11 1-6 7-5 7 5 1 6Z" />
                  <path fill="#b88cf9" d="M12 1 5 6l-1 6 8 11V1Z" />
                  <circle cx="12" cy="9" r="3" fill="#fff9ef" />
                </svg>
                <input
                  className="onboarding__welcome-name"
                  value={schoolCity}
                  aria-label={uiText("Município")}
                  placeholder={uiText("Município")}
                  onChange={(event) => setSchoolCity(event.target.value)}
                />
              </label>
              {recommended && schoolMatches.length > 0 && <h3>{uiText("Recomendadas")}</h3>}
              <div className="onboarding__choices">
                {schoolMatches.map(([name, city, state, acronym], index) => (
                  <button
                    type="button"
                    key={index}
                    className={schoolName === name ? "is-selected" : ""}
                    aria-pressed={schoolName === name}
                    onClick={() => setSchoolName(name)}
                  >
                    <svg
                      className="onboarding__institution-icon"
                      data-color={index % 5}
                      viewBox="0 0 24 24"
                      width={26}
                      height={26}
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="m2 8 10-6 10 6v2H2zM3 20h18v3H3zM5 11h3v8H5zM10.5 11h3v8h-3zM16 11h3v8h-3z"
                      />
                      <path fill="#fff9ef" opacity=".65" d="m2 8 10-6v3L5 9H2z" />
                    </svg>
                    <span>
                      {name}
                      {acronym ? ` · ${acronym}` : ""}
                      <br />
                      <small>
                        {city} · {state}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="onboarding__choices onboarding__school-tiles">
              {(schoolStep === "level"
                ? ["Ensino fundamental", "Ensino médio", "Bacharelado Internacional"]
                : [
                    ...(schoolLevel !== "Ensino médio"
                      ? ["6º ano", "7º ano", "8º ano", "9º ano"]
                      : []),
                    ...(schoolLevel !== "Ensino fundamental"
                      ? ["1º ano do médio", "2º ano do médio", "3º ano do médio"]
                      : []),
                  ]
              ).map((option, index) => {
                const selected = option === (schoolStep === "level" ? schoolLevel : schoolYear);
                return (
                  <button
                    type="button"
                    key={option}
                    className={selected ? "is-selected" : ""}
                    aria-pressed={selected}
                    onClick={() => {
                      if (schoolStep === "level") {
                        if (schoolLevel !== option) setSchoolYear("");
                        setSchoolLevel(option);
                      } else setSchoolYear(option);
                    }}
                  >
                    {uiText(option)}
                    <OnboardingPaperIcon
                      name={`journey-${schoolStep === "level" ? ["school", "book", "graduate"][index] : `year-${option[0]}`}`}
                    />
                  </button>
                );
              })}
            </div>
          )}
          <div className="onboarding__actions onboarding__actions--chat onboarding__bottom">
            <button
              type="button"
              onClick={() => {
                if (schoolStep === "level" && schoolLevel === "Ensino fundamental")
                  answer("Ensino médio");
                setSchoolStep(
                  schoolStep === "school" && !university
                    ? "year"
                    : schoolStep === "year"
                      ? "level"
                      : undefined,
                );
              }}
            >
              <PaperArrow back /> {uiText(374)}
            </button>
            {schoolStep === "school" && (
              <button
                className="onboarding__school-skip"
                type="button"
                onClick={() => {
                  setSchoolName("");
                  advanceSchool();
                }}
              >
                {uiText("Ignorar")}
              </button>
            )}
            <button
              className="is-primary"
              type="button"
              disabled={
                !(schoolStep === "level"
                  ? schoolLevel
                  : schoolStep === "year"
                    ? schoolYear
                    : schoolName.trim())
              }
              onClick={advanceSchool}
            >
              {uiText("Avançar")} <PaperArrow />
            </button>
          </div>
        </section>
      )}
      {finished && (
        <section
          className="onboarding__calculation"
          aria-label={uiText("A Olena está preparando suas preferências…")}
        >
          <div
            className="onboarding__calculation-ring"
            role="progressbar"
            aria-label={uiText("A Olena está preparando suas preferências…")}
            aria-valuenow={progress}
            style={{ "--calculation-fill": `${progress}%` } as CSSProperties}
          >
            <PaperDigits value={String(progress)} />
            <svg className="onboarding__percentage" viewBox="0 0 60 60" aria-hidden="true">
              <path
                fill="#402171"
                d="M42 9h12L19 55H7zM14 8l9 5 2 10-6 8H9l-6-7 1-10zm29 24 9 4 5 9-4 10-10 2-8-5-2-10z"
              />
              <path
                fill="#facc15"
                fillRule="evenodd"
                d="M42 5h12L19 51H7zM14 4l9 5 2 10-6 8H9l-6-7 1-10zm0 7-4 3v5l4 2 4-3v-5zm29 17 9 4 5 9-4 10-10 2-8-5-2-10zm2 8-5 3v5l4 3 5-3v-5z"
              />
            </svg>
          </div>
          <div className="onboarding__calculation-copy">
            <h2>
              {calculationAccent(
                uiText("A Olena está preparando suas preferências…").replace(/…$/, ""),
              )}
            </h2>
            <ul>
              {[
                [uiText("Respostas recebidas"), true],
                [uiText("Configurando seu espaço de estudos"), Boolean(configuration)],
                [uiText("Abrindo o OlenaStudy"), progress === 100],
              ].map(([label, done]) => (
                <li className="onboarding__message onboarding__message--olena" key={String(label)}>
                  <span>{calculationAccent(String(label))}</span>
                  {done ? (
                    <img src="/room-icons/check.svg" width={24} height={24} alt="" />
                  ) : (
                    <span className="onboarding__calculation-pending" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ul>
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
          </div>
        </section>
      )}
      <section
        hidden={
          Boolean(schoolStep) ||
          finished ||
          (step === 0 && !introDismissed && (authenticated || window.innerWidth >= 720))
        }
        className="onboarding__form"
        data-finished={finished}
      >
        <div className="onboarding__stage" data-reacting={stage === "reacting"}>
          <img
            src={ONBOARDING_OLENA}
            alt={uiText(2019)}
            width={640}
            height={640}
            decoding="async"
            className={talking ? "onboarding__helena is-talking" : "onboarding__helena"}
          />
        </div>
        <div className="onboarding__chat" role="group" aria-label={uiText("Conversa com a Olena")}>
          <div className="onboarding__messages" ref={messages}>
            {step === 0 && (
              <>
                <p className="onboarding__message onboarding__message--olena onboarding__intro">
                  {uiText("Oi! Eu sou a Olena, sua assistente de estudos.")}
                </p>
                <p className="onboarding__message onboarding__message--olena onboarding__message--second onboarding__intro">
                  {uiText(
                    "Vou te fazer {0} perguntas rápidas para deixar o OlenaStudy com o seu jeito.",
                    [questions.length],
                  )}
                </p>
              </>
            )}
            {question && stage === "ask" && (
              <div className="onboarding__message onboarding__message--olena" key={step}>
                <h2 ref={focusTarget} tabIndex={-1}>
                  <span className="sr-only">{question.title}</span>
                  <span aria-hidden="true" className="onboarding__typed-title">
                    <span className="onboarding__title-reserve">{question.title}</span>
                    <span>
                      <strong>
                        {question.title.slice(
                          0,
                          Math.min(
                            question.title.split(" ").slice(0, 3).join(" ").length,
                            visibleTitleLength,
                          ),
                        )}
                      </strong>
                      {question.title.slice(
                        question.title.split(" ").slice(0, 3).join(" ").length,
                        visibleTitleLength,
                      )}
                    </span>
                  </span>
                </h2>
              </div>
            )}
          </div>
          {question && stage === "ask" && (
            <fieldset className="onboarding__choices" key={step}>
              <legend className="sr-only">{question.title}</legend>
              {question.options.map(
                (option, index) =>
                  (step !== 1 || option !== "Artes e tecnologia") &&
                  (step !== 2 || option !== "Outro idioma") &&
                  (step !== 7 || option !== "Python e JavaScript") && (
                    <button
                      key={option}
                      type="button"
                      style={{ animationDelay: `${index * 60}ms` }}
                      className={
                        selectedAnswer(
                          step === 0 && answers[0] === "Ensino fundamental"
                            ? "Ensino médio"
                            : answers[step],
                          option,
                        )
                          ? "is-selected"
                          : ""
                      }
                      aria-pressed={selectedAnswer(answers[step], option)}
                      onClick={() => choose(option)}
                    >
                      <OnboardingPaperIcon
                        name={`journey-${onboardingIconNames[step]?.[step === 0 ? index + 1 : index] ?? "compass"}`}
                      />
                      <span>
                        {step === 0 && index === 0
                          ? uiText("Estudante do ensino secundário")
                          : step === 0 && index === 1
                            ? uiText("Estudante universitário")
                            : option === "História e geografia"
                              ? uiText("História")
                              : uiText(option)}
                      </span>
                    </button>
                  ),
              )}
            </fieldset>
          )}
          <div
            className="onboarding__actions onboarding__actions--chat"
            data-first-question={Boolean(question)}
          >
            {step === 0 && introDismissed && stage === "ask" && (
              <button
                type="button"
                onClick={() => {
                  setTitleLength(1);
                  setIntroDismissed(false);
                }}
              >
                <PaperArrow back /> {uiText(374)}
              </button>
            )}
            {step > 0 && !showLogin && (
              <button type="button" disabled={stage === "reacting"} onClick={goBack}>
                <PaperArrow back /> {uiText(374)}
              </button>
            )}
            {question && stage === "ask" && (
              <button
                type="button"
                className="is-primary"
                disabled={question.multiple ? !multipleReady : !answers[step]}
                onClick={
                  step === 0 && ["Ensino médio", "Ensino fundamental"].includes(String(answers[0]))
                    ? () => setSchoolStep("level")
                    : step === 0 && university
                      ? () => {
                          setSchoolName("");
                          setSchoolCity("");
                          setSchoolStep("school");
                        }
                      : confirmAnswer
                }
              >
                {uiText("Avançar")} <PaperArrow />
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
