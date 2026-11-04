import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createInitialWorkspace, type PracticeActivity } from "../src/domain/workspace";
import { isWorkspaceState } from "../src/data/local-workspace";
import { englishQuestion, type EnglishCourse } from "../src/data/english-journey";
import { isSpeakingQuestion } from "../src/data/english-speaking";
import type { VoiceRecognition } from "../src/data/english-speaking";
const course = JSON.parse(
  readFileSync("public/languages/en/english-v4.json", "utf8"),
) as EnglishCourse;
course.a1 = JSON.parse(readFileSync("public/languages/en/english-a1-v1.json", "utf8"));
const directory = "C:/Users/User/Documents/Codex/2026-09-10/b/previews-english-speaking";
type BrowserVoice = Window & {
  voiceTest: { last?: VoiceRecognition; starts: number; aborts: number };
};
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
async function setup(page: Page, part: number, theme: string, supported = true) {
  const q = Array.from({ length: part === 0 ? 240 : 120 }, (_, id) =>
    englishQuestion(course, part, id),
  ).find(isSpeakingQuestion)!;
  const workspace = createInitialWorkspace();
  workspace.studyPreferences.initialIslandId = "languages";
  workspace.practiceActivities = completed();
  expect(isWorkspaceState(workspace)).toBe(true);
  await page.addInitScript(
    ({ workspace, part, theme, id, supported }) => {
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
      const harness: BrowserVoice["voiceTest"] = { starts: 0, aborts: 0 };
      Object.defineProperty(window, "voiceTest", { value: harness });
      class Recognition implements VoiceRecognition {
        lang = "";
        continuous = false;
        interimResults = false;
        maxAlternatives = 1;
        onstart: VoiceRecognition["onstart"] = null;
        onspeechend: VoiceRecognition["onspeechend"] = null;
        onend: VoiceRecognition["onend"] = null;
        onerror: VoiceRecognition["onerror"] = null;
        onresult: VoiceRecognition["onresult"] = null;
        constructor() {
          harness.last = this;
        }
        start() {
          harness.starts++;
          this.onstart?.();
        }
        stop() {}
        abort() {
          harness.aborts++;
        }
      }
      Object.defineProperty(window, "SpeechRecognition", {
        configurable: true,
        value: supported ? Recognition : undefined,
      });
      Object.defineProperty(window, "webkitSpeechRecognition", {
        configurable: true,
        value: undefined,
      });
    },
    { workspace, part, theme, id: q.id, supported },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Explorar Inglês", exact: true }).click();
  await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
  await page.clock.install();
  await page
    .locator(".english-island-interior")
    .getByRole("button", { name: "Praticar", exact: true })
    .click();
  await expect(page.locator(".math-countdown")).toBeVisible();
  await page.clock.runFor(3000);
  await expect(page.locator(".english-speaking")).toBeVisible();
  await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", String(q.id));
  return q;
}
async function finish(page: Page, transcript: string) {
  await page.evaluate((transcript) => {
    const r = (window as BrowserVoice).voiceTest.last!;
    r.onresult?.({ results: [{ isFinal: true, 0: { transcript } }] });
    r.onend?.();
  }, transcript);
}
for (const theme of ["light", "dark"]) {
  for (let part = 0; part < 6; part++)
    test(`speech in English part ${part + 1}, ${theme}`, async ({ page }, info) => {
      if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const q = await setup(page, part, theme);
      const before = await page.locator(".math-time").getAttribute("aria-label");
      await page.clock.runFor(5000);
      expect(await page.locator(".math-time").getAttribute("aria-label")).toBe(before);
      expect(await page.evaluate(() => (window as BrowserVoice).voiceTest.starts)).toBe(0);
      await expect(page.getByRole("button", { name: "Falar agora", exact: true })).toBeDisabled();
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Falar agora", exact: true }).click();
      await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", "listening");
      await page.clock.runFor(1000);
      expect(await page.locator(".math-time").getAttribute("aria-label")).not.toBe(before);
      await mkdir(directory, { recursive: true });
      await page.screenshot({
        path: `${directory}/${info.project.name}-${theme}-part${part + 1}-listening.png`,
      });
      await expect(page.locator(".english-speaking-wave i").first()).toHaveCSS(
        "animation-name",
        "none",
      );
      const back = await page.getByRole("button", { name: "Voltar", exact: true }).boundingBox();
      expect(back!.y).toBeGreaterThanOrEqual(0);
      await finish(page, q.answer);
      await expect(page.locator(".english-speaking-transcript")).toHaveText(q.answer);
      await expect(page.locator(".english-speaking-transcript")).toHaveCSS(
        "color",
        "rgb(41, 36, 50)",
      );
      await page.screenshot({
        path: `${directory}/${info.project.name}-${theme}-part${part + 1}-transcript.png`,
      });
      await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
      await page.getByRole("button", { name: "Enviar resposta", exact: true }).click();
      await expect(page.locator(".math-answer-reaction.is-correct")).toBeVisible();
      await expect(page.locator(".math-score")).toHaveAttribute("aria-label", /20/);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      expect(
        await page
          .locator(".english-island-interior")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  test(`speech denial, retry, private transcript and same-question fallback: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const q = await setup(page, 0, theme);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Falar agora", exact: true }).click();
    await page.evaluate(() =>
      (window as BrowserVoice).voiceTest.last!.onerror?.({ error: "not-allowed" }),
    );
    await expect(page.getByRole("alert")).toContainText("não foi autorizado");
    await page.clock.runFor(45000);
    await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
    await page.getByRole("button", { name: "Falar agora", exact: true }).click();
    await finish(page, "private microphone text do not save");
    await page.getByRole("button", { name: "Enviar resposta", exact: true }).click();
    await expect(page.locator(".math-answer-reaction.is-wrong")).toBeVisible();
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(storage).not.toContain("private microphone text");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Sair da rodada", exact: true }).click();
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await page.clock.runFor(3000);
    await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", String(q.id));
    await page.getByRole("button", { name: "Agora não posso falar", exact: true }).click();
    await expect(page.locator(".english-speaking")).toHaveCount(0);
    await expect(page.locator(".english-word-bank")).toBeVisible();
    await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
  });
  test(`speech aborts on account change: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await setup(page, 0, theme);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Falar agora", exact: true }).click();
    await page.evaluate(() => {
      localStorage.setItem("helena.account.v1", "other-test-account");
      window.dispatchEvent(new StorageEvent("storage"));
    });
    await expect(page.locator(".english-speaking")).toHaveCount(0);
    expect(await page.evaluate(() => (window as BrowserVoice).voiceTest.aborts)).toBeGreaterThan(0);
    await expect(page.locator(".english-entry")).toBeVisible();
  });
  test(`automatic speech processing pauses the deadline: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const q = await setup(page, 0, theme);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Falar agora", exact: true }).click();
    await page.clock.runFor(1000);
    const before = await page.locator(".math-time").getAttribute("aria-label");
    await page.evaluate(() => (window as BrowserVoice).voiceTest.last!.onspeechend?.());
    await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", "processing");
    await page.clock.runFor(5000);
    expect(await page.locator(".math-time").getAttribute("aria-label")).toBe(before);
    await finish(page, q.answer);
    await page.getByRole("button", { name: "Enviar resposta", exact: true }).click();
    await expect(page.locator(".math-answer-reaction.is-correct")).toBeVisible();
  });
  test(`unsupported voice uses words without penalty: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const q = await setup(page, 0, theme, false);
    await expect(page.getByRole("status")).toContainText("não oferece reconhecimento");
    await page.getByRole("button", { name: "Agora não posso falar", exact: true }).click();
    for (const word of q.phrase.split(" "))
      await page
        .locator('.english-word-bank button[aria-disabled="false"]')
        .getByText(word, { exact: true })
        .first()
        .click();
    await expect(page.locator(".math-answer-reaction.is-correct")).toBeVisible();
    expect(await page.evaluate(() => (window as BrowserVoice).voiceTest.starts)).toBe(0);
  });
}
