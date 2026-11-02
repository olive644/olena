import { uiLocale, uiText } from "../i18n/runtime";
import { isEnglishArea, type EnglishArea } from "../domain/english-areas";
export type EnglishText = { "pt-BR": string; "en-US": string };
export type EnglishScene = [string, string, string, string, string];
export type EnglishPart = {
  title: EnglishText;
  objective: EnglishText;
  lesson: EnglishText;
  scenes: EnglishScene[];
  proficiency: string;
};
export type EnglishCourse = {
  version: 3;
  area: EnglishArea;
  title: EnglishText;
  parts: EnglishPart[];
};
export const englishText = (text: EnglishText) => text[uiLocale()];
const cache = new Map<EnglishArea, EnglishCourse>();
export function validEnglishCourse(value: unknown): value is EnglishCourse {
  const object = (item: unknown): item is Record<string, unknown> =>
    Boolean(item) && typeof item === "object" && !Array.isArray(item);
  const text = (item: unknown) =>
    object(item) &&
    ["pt-BR", "en-US"].every(
      (key) => typeof item[key] === "string" && item[key].length > 0 && item[key].length <= 1600,
    );
  if (
    !object(value) ||
    value["version"] !== 3 ||
    !isEnglishArea(value["area"]) ||
    !text(value["title"])
  )
    return false;
  const parts = value["parts"];
  return (
    Array.isArray(parts) &&
    parts.length === 6 &&
    parts.every(
      (part: unknown) =>
        object(part) &&
        text(part["title"]) &&
        text(part["objective"]) &&
        text(part["lesson"]) &&
        typeof part["proficiency"] === "string" &&
        /^(A1|A2|B1|B2|C1|C2)$/.test(part["proficiency"]) &&
        Array.isArray(part["scenes"]) &&
        part["scenes"].length === 6 &&
        part["scenes"].every(
          (scene: unknown) =>
            Array.isArray(scene) &&
            scene.length === 5 &&
            scene.every(
              (field: unknown) =>
                typeof field === "string" && field.length > 0 && field.length < 500,
            ) &&
            scene[0].split(scene[3]).length === 2,
        ),
    )
  );
}
export async function loadEnglishCourse(
  area: EnglishArea,
  signal: AbortSignal,
): Promise<EnglishCourse> {
  const saved = cache.get(area);
  if (saved) return saved;
  const response = await fetch(`/languages/en/${area}.json`, {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("english-content-unavailable");
  const value: unknown = await response.json();
  if (!validEnglishCourse(value) || value.area !== area) throw new Error("english-content-invalid");
  cache.set(area, value);
  return value;
}
export type EnglishQuestion = {
  id: number;
  kind: "meaning" | "gap" | "reply" | "order";
  phrase: string;
  prompt: string;
  answer: string;
  options: string[];
  meaning: string;
  replyMeaning: string;
};
export function englishQuestion(course: EnglishCourse, part: number, id: number): EnglishQuestion {
  const scenes = course.parts[part]!.scenes;
  const scene = Math.floor(id / 4);
  const [phrase, translation, reply, word, replyTranslation] = scenes[scene]!;
  const kind = (["meaning", "gap", "reply", "order"] as const)[id % 4]!;
  const meaning = uiLocale() === "pt-BR" ? translation : phrase;
  const answer =
    kind === "meaning" ? meaning : kind === "gap" ? word : kind === "reply" ? reply : phrase;
  const others = [1, 2].map((offset) => scenes[(scene + offset) % scenes.length]!);
  const options = [
    answer,
    ...others.map((item) =>
      kind === "meaning"
        ? uiLocale() === "pt-BR"
          ? item[1]
          : item[0]
        : kind === "gap"
          ? item[3]
          : item[2],
    ),
  ];
  const rotation = (part + id) % 3;
  return {
    id,
    kind,
    phrase,
    meaning,
    replyMeaning: uiLocale() === "pt-BR" ? replyTranslation : reply,
    answer,
    options: [...options.slice(rotation), ...options.slice(0, rotation)],
    prompt:
      kind === "meaning"
        ? uiText("O que foi dito?")
        : kind === "gap"
          ? uiText("Complete a fala.")
          : kind === "reply"
            ? uiText("Como Oliver pode responder?")
            : uiText("Monte a fala em inglês."),
  };
}
export function normalizeEnglish(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.!?,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
