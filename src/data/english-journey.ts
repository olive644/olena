import { ENGLISH_PART_COUNT } from "../domain/english-part-order";
import { englishBankSize, LEGACY_ENGLISH_SCENES } from "../domain/english-difficulty";
import { nextEnglishQuestion, type EnglishSelection } from "../domain/english-adaptive";
import { uiLocale, uiText } from "../i18n/runtime";
import { isEnglishArea, type EnglishArea } from "../domain/english-areas";
import { validA1Content, type A1Content } from "./english-a1-content";
import { A1_BANK } from "../domain/english-a1";
export type EnglishText = { "pt-BR": string; "en-US": string };
export type EnglishScene = [string, string, string, string, string];
export type EnglishGuide = {
  title: EnglishText;
  text: EnglishText;
  example: string;
  meaning: EnglishText;
};
export type EnglishPart = {
  interpretations?: EnglishText[];
  teaching: { level: number; focus: string; explanation: EnglishText }[];
  guide: EnglishGuide[];
  title: EnglishText;
  objective: EnglishText;
  lesson: EnglishText;
  scenes: EnglishScene[];
  proficiency: string;
};
export type EnglishCourse = {
  a1?: A1Content;
  version: 4;
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
    value["version"] !== 4 ||
    !isEnglishArea(value["area"]) ||
    !text(value["title"])
  )
    return false;
  const parts = value["parts"];
  return (
    Array.isArray(parts) &&
    parts.length === ENGLISH_PART_COUNT &&
    parts.every(
      (part: unknown, index) =>
        object(part) &&
        text(part["title"]) &&
        text(part["objective"]) &&
        text(part["lesson"]) &&
        typeof part["proficiency"] === "string" &&
        /^(A1|A2|B1|B2|C1|C2)$/.test(part["proficiency"]) &&
        (part["interpretations"] === undefined ||
          (Array.isArray(part["interpretations"]) &&
            part["interpretations"].length === englishBankSize(index) / 4 &&
            part["interpretations"].every((entry: unknown) => text(entry)))) &&
        Array.isArray(part["scenes"]) &&
        part["scenes"].length === englishBankSize(index) / 4 &&
        Array.isArray(part["teaching"]) &&
        part["teaching"].length === part["scenes"].length &&
        part["teaching"].every(
          (item: unknown) =>
            object(item) &&
            Number.isInteger(item["level"]) &&
            Number(item["level"]) >= 0 &&
            Number(item["level"]) <= 5 &&
            typeof item["focus"] === "string" &&
            text(item["explanation"]),
        ) &&
        Array.isArray(part["guide"]) &&
        part["guide"].length === 4 &&
        part["guide"].every(
          (step: unknown) =>
            object(step) &&
            text(step["title"]) &&
            text(step["text"]) &&
            text(step["meaning"]) &&
            typeof step["example"] === "string" &&
            step["example"].length > 0 &&
            step["example"].length < 500,
        ) &&
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
  const response = await fetch(`/languages/en/${area}-v4.json`, {
    signal,
    cache: "no-cache",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("english-content-unavailable");
  const value: unknown = await response.json();
  if (!validEnglishCourse(value) || value.area !== area) throw new Error("english-content-invalid");
  const a1Response = await fetch("/languages/en/english-a1-v1.json", {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!a1Response.ok) throw new Error("english-a1-unavailable");
  const a1: unknown = await a1Response.json();
  if (!validA1Content(a1)) throw new Error("english-a1-invalid");
  value.a1 = a1;
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
  explanation: string;
  focus: string;
  level: number;
};
export function englishQuestion(course: EnglishCourse, part: number, id: number): EnglishQuestion {
  if (part === 0 && id >= 120) {
    const task = course.a1?.tasks[id - 120];
    if (!task) throw new Error("english-a1-question");
    const answer = englishText(task.answer),
      options = task.options.map(englishText),
      rotation = id % 3;
    return {
      id,
      kind: task.kind,
      phrase: task.phrase,
      meaning: englishText(task.meaning),
      replyMeaning: englishText(task.intent),
      answer,
      options: [...options.slice(rotation), ...options.slice(0, rotation)],
      explanation: englishText(task.explanation),
      focus: task.focus,
      level: task.level,
      prompt:
        task.kind === "meaning"
          ? uiText("O que foi dito?")
          : task.kind === "gap"
            ? uiText("Complete a fala.")
            : task.kind === "reply"
              ? uiText("Como você pode responder?")
              : uiText("Monte a fala em inglês."),
    };
  }
  const scenes = course.parts[part]!.scenes;
  const scene = Math.floor(id / 4);
  const [phrase, translation, reply, word, replyTranslation] = scenes[scene]!;
  const kind = (["meaning", "gap", "reply", "order"] as const)[id % 4]!;
  const interpretation = course.parts[part]!.interpretations?.[scene];
  const meaning = interpretation
    ? englishText(interpretation)
    : uiLocale() === "pt-BR"
      ? translation
      : phrase;
  const answer =
    kind === "meaning" ? meaning : kind === "gap" ? word : kind === "reply" ? reply : phrase;
  const optionPool =
    scene < LEGACY_ENGLISH_SCENES ? Math.min(LEGACY_ENGLISH_SCENES, scenes.length) : scenes.length;
  const others = Array.from(
    { length: optionPool - 1 },
    (_, offset) => scenes[(scene + offset + 1) % optionPool]!,
  );
  const candidates = [
    answer,
    ...others.map((item) =>
      kind === "meaning"
        ? course.parts[part]!.interpretations?.[scenes.indexOf(item)]
          ? englishText(course.parts[part]!.interpretations![scenes.indexOf(item)]!)
          : uiLocale() === "pt-BR"
            ? item[1]
            : item[0]
        : kind === "gap"
          ? item[3]
          : item[2],
    ),
  ];
  const options = [...new Set(candidates)].slice(0, 3);
  const rotation = (part + id) % options.length;
  return {
    id,
    kind,
    phrase,
    meaning,
    replyMeaning: uiLocale() === "pt-BR" ? replyTranslation : reply,
    explanation: englishText(course.parts[part]!.teaching[scene]!.explanation),
    focus: course.parts[part]!.teaching[scene]!.focus,
    level: course.parts[part]!.teaching[scene]!.level,
    answer,
    options: [...options.slice(rotation), ...options.slice(0, rotation)],
    prompt:
      kind === "meaning"
        ? uiText("O que foi dito?")
        : kind === "gap"
          ? uiText("Complete a fala.")
          : kind === "reply"
            ? uiText("Como você pode responder?")
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

export function englishReplyMeaning(course: EnglishCourse, part: number, value: string) {
  const task =
    part === 0
      ? course.a1?.tasks.find(
          (t) =>
            t.kind === "reply" && normalizeEnglish(t.answer["en-US"]) === normalizeEnglish(value),
        )
      : undefined;
  if (task) return englishText(task.intent);
  const scene = course.parts[part]!.scenes.find(
    (item) => normalizeEnglish(item[2]) === normalizeEnglish(value),
  );
  return scene ? (uiLocale() === "pt-BR" ? scene[4] : scene[2]) : undefined;
}

export async function selectEnglishQuestion(input: EnglishSelection, signal: AbortSignal) {
  try {
    const response = await fetch("/api/olena?action=english", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "omit",
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
    });
    if (!response.ok) throw new Error("english-selection-unavailable");
    const value: unknown = await response.json();
    if (
      !value ||
      typeof value !== "object" ||
      !("id" in value) ||
      !Number.isInteger(value.id) ||
      Number(value.id) < 0 ||
      Number(value.id) >=
        (input.curriculum === 5 && input.part === 0 ? A1_BANK : englishBankSize(input.part ?? 0)) ||
      input.exclude.includes(Number(value.id))
    )
      throw new Error("english-selection-invalid");
    return Number(value.id);
  } catch {
    // Callers check the signal before using this result, including after cancellation.
    return nextEnglishQuestion(input).id;
  }
}
