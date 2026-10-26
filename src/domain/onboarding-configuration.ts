import type { StudyModality, StudyPreferences } from "./study-preferences.js";

export const ONBOARDING_OPTIONS: readonly (readonly string[])[] = [
  [
    "Ensino fundamental",
    "Ensino médio",
    "Ensino superior",
    "Estudo por conta própria",
    "Sou professor",
  ],
  [
    "Idiomas",
    "Português",
    "Matemática",
    "Química",
    "Biologia",
    "Ciências",
    "História e geografia",
    "Artes e tecnologia",
    "Programação",
    "Ainda estou descobrindo",
  ],
  ["Inglês", "Português", "Espanhol", "Japonês", "Chinês", "Outro idioma", "Não é meu foco agora"],
  ["Criar uma rotina", "Revisar para provas", "Aprender algo novo", "Praticar com minha turma"],
  ["Visual", "Ouvindo e conversando", "Lendo e escrevendo", "Praticando"],
  ["Passo a passo", "Visão geral primeiro"],
  ["Foco contínuo", "Alternar estudo e pausas"],
  ["Python", "JavaScript", "Python e JavaScript", "Agora não"],
  ["5 minutos", "15 minutos", "30 minutos", "Prefiro decidir a cada dia"],
];
export type OnboardingAnswers = (string | string[])[];
export type OnboardingConfiguration = {
  version: 1;
  id: string;
  preferences: StudyPreferences;
  focusPreferences: { pomodoroMinutes: number };
  subject: { id: string; name: string; color: string } | null;
};
const modalityByAnswer: Record<string, StudyModality> = {
  Visual: "visual",
  "Ouvindo e conversando": "auditivo",
  "Lendo e escrevendo": "leitura-escrita",
  Praticando: "pratico",
};
const subjects: Record<string, { id: string; island?: string }> = {
  Idiomas: { id: "languages", island: "languages" },
  Português: { id: "portuguese", island: "portuguese" },
  Matemática: { id: "mathematics", island: "mathematics" },
  Química: { id: "chemistry", island: "chemistry" },
  Biologia: { id: "biology", island: "biology" },
  Programação: { id: "programming", island: "programming" },
  Ciências: { id: "science" },
  "História e geografia": { id: "history-geography" },
  "Artes e tecnologia": { id: "arts-technology" },
};
export function parseOnboardingAnswers(value: unknown): OnboardingAnswers | null {
  if (!Array.isArray(value) || value.length !== ONBOARDING_OPTIONS.length) return null;
  for (let step = 0; step < value.length; step++) {
    const answer: unknown = value[step];
    const allowed = ONBOARDING_OPTIONS[step]!;
    if (step === 4) {
      if (
        !Array.isArray(answer) ||
        answer.length < 1 ||
        answer.length > 4 ||
        new Set(answer).size !== answer.length ||
        answer.some((item: unknown) => typeof item !== "string" || !allowed.includes(item))
      )
        return null;
    } else if (typeof answer !== "string" || !allowed.includes(answer)) return null;
  }
  return value as OnboardingAnswers;
}
/** Regras transparentes de preparação, sem modelo, diagnóstico de aprendizagem ou dados externos. */
export function prepareOnboarding(answers: OnboardingAnswers, id: string): OnboardingConfiguration {
  const minutes =
    answers[8] === "5 minutos"
      ? 5
      : answers[8] === "15 minutos"
        ? 15
        : answers[8] === "30 minutos"
          ? 30
          : undefined;
  const withBreaks = answers[6] === "Alternar estudo e pausas";
  const chosen = typeof answers[1] === "string" ? subjects[answers[1]] : undefined;
  const language = answers[2];
  const languageSubject =
    answers[1] === "Idiomas" &&
    ["Inglês", "Português", "Espanhol", "Japonês", "Chinês"].includes(String(language));
  const subjectName = languageSubject ? String(language) : String(answers[1]);
  const languageIds: Record<string, string> = {
    Inglês: "english",
    Português: "portuguese",
    Espanhol: "spanish",
    Japonês: "japanese",
    Chinês: "chinese",
  };
  return {
    version: 1,
    id,
    preferences: {
      modalities: (Array.isArray(answers[4]) ? answers[4] : [])
        .map((item) => modalityByAnswer[item]!)
        .filter(Boolean),
      processing: answers[5] === "Visão geral primeiro" ? "global" : "sequencial",
      rhythm: withBreaks ? "difuso" : "focado",
      programming:
        answers[7] === "Python"
          ? "python"
          : answers[7] === "JavaScript"
            ? "javascript"
            : answers[7] === "Python e JavaScript"
              ? "python-javascript"
              : "nenhum",
      ...(minutes !== undefined ? { dailyGoalMinutes: minutes } : {}),
      ...(chosen ? { initialSubjectName: subjectName } : {}),
      ...(chosen?.island ? { initialIslandId: chosen.island } : {}),
    },
    focusPreferences: {
      pomodoroMinutes: Math.min(minutes ?? 25, withBreaks ? 25 : 30),
    },
    subject: chosen
      ? {
          id: `subject-${languageSubject ? languageIds[subjectName] : chosen.id}`,
          name: subjectName,
          color: "#7257e8",
        }
      : null,
  };
}
/** Resposta aceita somente se corresponder às próprias regras e escolhas, sem campos livres. */
export function parseOnboardingConfiguration(
  value: unknown,
  answers: OnboardingAnswers,
): OnboardingConfiguration | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !/^onboarding-v1-[a-f0-9]{24}$/.test(value.id)
  )
    return null;
  const expected = prepareOnboarding(answers, value.id);
  const comparable = (item: unknown) =>
    JSON.stringify(item, (_key: string, part: unknown) =>
      part && typeof part === "object" && !Array.isArray(part)
        ? Object.fromEntries(Object.entries(part).sort(([a], [b]) => a.localeCompare(b)))
        : part,
    );
  return comparable(value) === comparable(expected) ? expected : null;
}
