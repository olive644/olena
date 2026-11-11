import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createInitialWorkspace, type PracticeActivity } from "../src/domain/workspace";
import { isWorkspaceState } from "../src/data/local-workspace";
import { englishQuestion, type EnglishCourse } from "../src/data/english-journey";
const course = JSON.parse(
  readFileSync("public/languages/en/english-v4.json", "utf8"),
) as EnglishCourse;
course.a1 = JSON.parse(readFileSync("public/languages/en/english-a1-v1.json", "utf8"));

function completed() {
  const records: PracticeActivity[] = [];
  for (let part = 0; part < 6; part++) {
    for (let group = 0; group < 4; group++)
      records.push({
        id: `speaking-fixture:${part}:${group}`,
        islandId: "languages",
        islandName: "English",
        completedAt: new Date(1700000000000 + records.length * 1000).toISOString(),
        answers: 6,
        correct: 6,
        languageAttempt: {
          curriculum: 3,
          area: "english",
          part,
          mode: "practice",
          questions: Array.from({ length: 6 }, (_, i) => group * 6 + i),
          correctQuestions: Array.from({ length: 6 }, (_, i) => group * 6 + i),
        },
      });
    records.push({
      id: `speaking-fixture:${part}:final`,
      islandId: "languages",
      islandName: "English",
      completedAt: new Date(1700000000000 + records.length * 1000).toISOString(),
      answers: 5,
      correct: 5,
      languageAttempt: {
        curriculum: 3,
        area: "english",
        part,
        mode: "final",
        questions: [0, 1, 2, 3, 4],
        correctQuestions: [0, 1, 2, 3, 4],
      },
    });
  }
  return records;
}
async function setup(page: Page, part: number, theme: string) {
  const q = englishQuestion(course, part, part === 0 || part >= 6 ? 7 : part === 5 ? 3 : 155);
  const workspace = createInitialWorkspace();
  workspace.studyPreferences.initialIslandId = "languages";
  workspace.practiceActivities = completed();
  expect(isWorkspaceState(workspace)).toBe(true);
  await page.addInitScript(
    ({ workspace, part, theme, id }) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
      if (!sessionStorage.getItem("speaking-fixture")) {
        sessionStorage.setItem("speaking-fixture", "1");
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        localStorage.setItem(
          "helena.profile.v1",
          JSON.stringify({
            name: "Visitante de teste",
            photoUrl: "/profile-avatars/oliver.webp",
            englishCheckpoints: {
              [`${part}:practice`]: {
                owner: null,
                part,
                mode: "practice",
                question: id,
                updatedAt: Date.now(),
              },
            },
          }),
        );
      }
      Object.defineProperty(window, "webkitSpeechRecognition", {
        value: class {
          constructor() {
            throw new Error("Unexpected speech recognition");
          }
        },
      });
    },
    { workspace, part, theme, id: q.id },
  );
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Explorar Inglês", exact: true }).click();
  if (part >= 6) {
    const image = page.locator(".math-journey-island.is-current img");
    await expect(image).toHaveAttribute(
      "src",
      "/languages/english-parts/" + (part === 6 ? "market" : "archive") + ".webp",
    );
    await expect(image).toHaveJSProperty("naturalWidth", 800);
    await page.locator(".english-parts-journey").evaluate(async (root) => {
      await document.fonts.ready;
      await Promise.all(
        root
          .getAnimations({ subtree: true })
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    await page
      .locator(".english-parts-journey")
      .screenshot({ path: test.info().outputPath("new-part-map.png") });
  }
  await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
  await page.getByText("Aprender antes de praticar", { exact: true }).click();
  await expect(page.locator(".english-study-guide section")).toHaveCount(part === 0 ? 12 : 4);
  await expect(page.locator(".english-study-guide blockquote").first()).toBeVisible();
  await expect(page.locator(".math-time")).toHaveCount(0);
  await page.getByText("Aprender antes de praticar", { exact: true }).click();
  await page.clock.install();
  await page
    .locator(".english-island-interior")
    .getByRole("button", { name: "Praticar", exact: true })
    .click();
  await expect(page.locator(".math-countdown")).toBeVisible();
  await page.clock.runFor(3000);
  await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", String(q.id));
  return q;
}

for (const theme of ["light", "dark"]) {
  for (const part of [0, 1, 2, 3, 4, 5, 6, 7]) {
    test("orders a sentence in part " + part + " in " + theme, async ({ page }, info) => {
      if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const question = await setup(page, part, theme);
      await expect(page.locator(".english-speaking")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Monte a fala em inglês." })).toBeVisible();
      const words = question.phrase.split(" ");
      const shown = await page.locator(".english-word-bank button").allInnerTexts();
      expect([...shown].sort()).toEqual([...words].sort());
      if (new Set(words).size === words.length && words.length >= 3) {
        expect(shown).not.toEqual(words);
        expect(shown).not.toEqual([...words].reverse());
      }
      for (const word of question.phrase.split(" ")) {
        await page
          .locator('.english-word-bank button[aria-disabled="false"]')
          .getByText(word, { exact: true })
          .first()
          .click();
      }
      await expect(page.locator(".math-answer-reaction.is-correct")).toBeVisible();
      expect(errors).toEqual([]);
    });
    test("writes without word support in part " + part + " in " + theme, async ({ page }, info) => {
      if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
      const question = await setup(page, part, theme);
      await page.getByRole("button", { name: "Responder sem as palavras", exact: true }).click();
      await expect(page.locator(".english-word-bank")).toBeHidden();
      await page.getByRole("textbox", { name: "Escreva a fala em inglês" }).fill(question.phrase);
      const root = page.locator(".english-island-interior");
      expect(await root.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await root.screenshot({ path: test.info().outputPath("written-answer.png") });
      await page.getByRole("button", { name: "Conferir resposta", exact: true }).click();
      await expect(page.locator(".english-written-answer [role=status]")).toHaveText("Muito bem!");
      await page.clock.runFor(1000);
      await expect(page.locator(".math-score")).toHaveAttribute("aria-label", /20/);
    });
  }
}

for (const theme of ["light", "dark"]) {
  for (const part of [0, 1, 2, 3, 4, 5, 6, 7]) {
    test("English streak grows and resets in part " + part + " in " + theme, async ({ page }) => {
      await setup(page, part, theme);
      const lesson = page.locator(".english-lesson");
      for (let index = 0; index < 4; index++) {
        const id = Number(await lesson.getAttribute("data-question-id"));
        const question = englishQuestion(course, part, id);
        if (question.kind === "order") {
          for (const word of question.phrase.split(" "))
            await page
              .locator('.english-word-bank button[aria-disabled="false"]')
              .getByText(word, { exact: true })
              .first()
              .click();
        } else {
          await page
            .locator(".english-options button")
            .getByText(question.answer, { exact: true })
            .click();
        }
        await expect(page.locator(".math-answer-reaction.is-correct")).toBeVisible();
        if (index < 3) await expect(page.locator(".english-insane")).toHaveCount(0);
        else {
          await expect(page.locator(".english-insane")).toBeVisible();
          await expect(page.locator(".english-insane img")).toHaveAttribute(
            "src",
            "/languages/english-streak-flame.svg",
          );
          await page.screenshot({ path: test.info().outputPath("english-streak.png") });
        }
        await page.clock.runFor(700);
        await expect(lesson).not.toHaveAttribute("data-question-id", String(id));
      }
      const id = Number(await lesson.getAttribute("data-question-id"));
      const question = englishQuestion(course, part, id);
      if (question.kind === "order") {
        await page.getByRole("button", { name: "Responder sem as palavras", exact: true }).click();
        await page.getByRole("textbox", { name: "Escreva a fala em inglês" }).fill("wrong answer");
        await page.getByRole("button", { name: "Conferir resposta", exact: true }).click();
      } else {
        const wrong = question.options.find((value) => value !== question.answer)!;
        await page.locator(".english-options button").getByText(wrong, { exact: true }).click();
      }
      if (question.kind === "order")
        await expect(page.locator(".english-written-answer [role=status]")).toHaveText(
          "Vamos entender juntos?",
        );
      else await expect(page.locator(".math-answer-reaction.is-wrong")).toBeVisible();
      await expect(page.locator(".english-insane")).toHaveCount(0);
    });
  }
}
