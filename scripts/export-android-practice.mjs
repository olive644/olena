import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
import { format, resolveConfig } from "prettier";

const root = fileURLToPath(new URL("../", import.meta.url));
const formatting = await resolveConfig(path.join(root, "package.json"));
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && context.parentURL) {
      const stem = specifier.endsWith(".js") ? specifier.slice(0, -3) : specifier;
      for (const extension of [".ts", ".tsx"]) {
        const candidate = new URL(stem + extension, context.parentURL);
        if (existsSync(candidate)) return next(candidate.href, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) {
      const source = ts.sys.readFile(fileURLToPath(url));
      if (source === undefined) throw new Error(`Missing source: ${url}`);
      return {
        format: "module",
        source: ts.transpileModule(source, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).outputText,
        shortCircuit: true,
      };
    }
    return next(url, context);
  },
});

const { installUiCatalog } = await import("../src/i18n/runtime.ts");
installUiCatalog(
  "pt-BR",
  JSON.parse(await readFile(path.join(root, "public/locales/pt-BR.json"), "utf8")),
);
const { MATH_COURSES } = await import("../src/data/math-courses.ts");
const { challengeQuestion } = await import("../src/data/math-challenge-bank.ts");
const { upgradeMasteryProgress, masteryCompletion } =
  await import("../src/domain/math-mastery-progress.ts");
const { nextMasteryQuestion, assessMastery } = await import("../src/domain/math-mastery-engine.ts");
const { ENGLISH_PART_CATALOG } = await import("../src/data/english-part-catalog.ts");
const { ENGLISH_PART_ORDER } = await import("../src/domain/english-part-order.ts");

function unshuffle(choices, level, index) {
  const result = [...choices];
  let state = ((1 + index * 97 + level * 389) % 2147483646) + 1;
  const swaps = [];
  for (let i = 3; i > 0; i--) {
    state = (state * 16807) % 2147483647;
    swaps.push([i, state % (i + 1)]);
  }
  for (const [i, j] of swaps.reverse()) [result[i], result[j]] = [result[j], result[i]];
  return result;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
function progressHash(progress) {
  return createHash("sha256")
    .update(JSON.stringify(canonical({ ...progress, errors: progress.errors ?? 0 })))
    .digest("hex");
}

const courses = MATH_COURSES.map((course) => ({ ...course }));
const questions = courses.flatMap((course) =>
  Array.from({ length: 6 }, (_, level) =>
    Array.from({ length: 72 }, (_, index) => {
      const question = challengeQuestion(course.id, level, index, 1);
      return { course: course.id, ...question, choices: unshuffle(question.choices, level, index) };
    }),
  ).flat(),
);
if (
  questions.length !== 2592 ||
  questions.some(
    (q) => q.choices.length !== 4 || new Set(q.choices).size !== 4 || q.choices[0] !== q.answer,
  )
) {
  throw new Error("Invalid canonical math bank");
}
const traces = courses.flatMap((course) =>
  ["correct", "mixed"].map((mode) => {
    let progress = upgradeMasteryProgress();
    let streak = 0;
    const steps = [];
    for (let index = 0; index < 220 && progress.confirmed !== 63; index++) {
      const question = nextMasteryQuestion(course.id, progress);
      const timedOut = mode === "mixed" && index % 17 === 6;
      const wrong = mode === "mixed" && (index % 11 === 3 || index % 13 === 7);
      const choice =
        timedOut || wrong
          ? question.choices.find((item) => item !== question.answer)
          : question.answer;
      const elapsed = timedOut ? question.budget : index % 3 === 0 ? question.budget * 0.5 : 1;
      const result = assessMastery(
        course.id,
        progress,
        question,
        choice,
        elapsed,
        streak,
        timedOut,
      );
      progress = result.progress;
      streak = result.streak;
      steps.push({
        seed: question.seed,
        phase: question.phase,
        position: question.position,
        choices: question.choices,
        choice,
        elapsed,
        timedOut,
        correct: result.correct,
        points: result.points,
        streak,
        fast: result.fast,
        percent: masteryCompletion(progress).percent,
        hash: progressHash(progress),
        finalOutcome: result.finalOutcome,
      });
    }
    if (mode === "correct" && progress.confirmed !== 63)
      throw new Error(`Incomplete trace: ${course.id}`);
    return { course: course.id, mode, steps };
  }),
);

const output = process.argv.includes("--preview") ? path.join(root, "tmp/practice-export") : root;
const assets = path.join(output, "android/app/src/main/assets/practice");
const fixtures = path.join(output, "android/app/src/test/resources/practice");
await mkdir(assets, { recursive: true });
await mkdir(fixtures, { recursive: true });
for (const [destination, value] of [
  [
    path.join(assets, "catalog.json"),
    {
      version: 1,
      courses,
      english: ENGLISH_PART_ORDER.map((index) => ({
        index,
        ...ENGLISH_PART_CATALOG[index],
        title: ENGLISH_PART_CATALOG[index].title["pt-BR"],
        subject: ENGLISH_PART_CATALOG[index].subject["pt-BR"],
      })),
    },
  ],
  [path.join(assets, "math-bank.json"), { revision: 3, questions }],
  [path.join(fixtures, "math-parity.json"), { traces }],
]) {
  const generated = await format(JSON.stringify(value), { ...formatting, parser: "json" });
  if (process.argv.includes("--check")) {
    const current = await readFile(destination, "utf8");
    if (current.replaceAll("\r\n", "\n") !== generated)
      throw new Error(`Outdated Android practice export: ${path.relative(root, destination)}`);
  } else {
    await writeFile(destination, generated);
  }
}
console.log(
  JSON.stringify({
    courses: courses.length,
    englishParts: ENGLISH_PART_ORDER.length,
    questions: questions.length,
    paritySteps: traces.reduce((sum, trace) => sum + trace.steps.length, 0),
  }),
);
