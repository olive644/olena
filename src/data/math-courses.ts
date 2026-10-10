export const MATH_COURSES = [
  {
    id: "foundations",
    title: "Pátio das Primeiras Contas",
    subject: "Ensino fundamental",
    color: "#167b85",
    shade: "#123f52",
    light: "#f5c85d",
    topics: ["Adição", "Subtração", "Multiplicação", "Divisão", "Frações", "Porcentagens"],
  },
  {
    id: "school",
    title: "Oficina das Equações",
    subject: "Ensino médio",
    color: "#b84f39",
    shade: "#572e39",
    light: "#ffd58a",
    topics: ["Equações", "Potências", "Funções", "Geometria", "Sequências", "Probabilidade"],
  },
  {
    id: "advanced",
    title: "Torre das Funções",
    subject: "Pré-cálculo",
    color: "#287b5b",
    shade: "#173d44",
    light: "#f0c77c",
    topics: [
      "Funções",
      "Logaritmos",
      "Trigonometria",
      "Vetores",
      "Composição",
      "Taxas de variação",
    ],
  },
  {
    id: "calculus1",
    title: "Ponte das Tangentes",
    subject: "Cálculo I",
    color: "#326bb0",
    shade: "#19365d",
    light: "#f9c554",
    topics: ["Limites", "Derivadas", "Regra da potência", "Regra da soma", "Tangentes", "Extremos"],
  },
  {
    id: "calculus2",
    title: "Porto das Integrais",
    subject: "Cálculo II",
    color: "#248e94",
    shade: "#134f60",
    light: "#ffa779",
    topics: [
      "Primitivas",
      "Integral definida",
      "Áreas",
      "Polinômios",
      "Volumes",
      "Integrais de funções lineares",
    ],
  },
  {
    id: "calculus3",
    title: "Mirante dos Vetores",
    subject: "Cálculo III",
    color: "#795088",
    shade: "#382d56",
    light: "#e9bb73",
    topics: [
      "Funções multivariáveis",
      "Derivadas parciais",
      "Gradiente",
      "Produto escalar",
      "Divergência",
      "Integrais duplas",
    ],
  },
] as const;
export type MathCourseId = (typeof MATH_COURSES)[number]["id"];
export type MathProgress = {
  level: number;
  mastery: number;
  correct: number;
  best: number;
  errors?: number;
};
export const EMPTY_MATH_PROGRESS: MathProgress = { level: 0, mastery: 0, correct: 0, best: 0 };
export function isMathCourse(value: unknown): value is MathCourseId {
  return MATH_COURSES.some((course) => course.id === value);
}
export function validMathProgress(value: unknown): value is MathProgress {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    Object.keys(item).every((key) =>
      ["level", "mastery", "correct", "best", "errors"].includes(key),
    ) &&
    (item["errors"] === undefined ||
      (Number.isSafeInteger(item["errors"]) &&
        Number(item["errors"]) >= 0 &&
        Number(item["errors"]) <= 2)) &&
    ["level", "mastery", "correct", "best"].every(
      (key) => Number.isSafeInteger(item[key]) && Number(item[key]) >= 0,
    ) &&
    Number(item["level"]) <= 5 &&
    Number(item["mastery"]) <= 3 &&
    Number(item["correct"]) <= 100000 &&
    Number(item["best"]) <= 1000000
  );
}
