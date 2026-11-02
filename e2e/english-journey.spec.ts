import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { createInitialWorkspace, type PracticeActivity } from "../src/domain/workspace";
import { readFileSync } from "node:fs";
const a1: unknown = JSON.parse(readFileSync("public/languages/en/english.json", "utf8"));
import { validEnglishCourse } from "../src/data/english-journey";
import { englishQuestion } from "../src/data/english-journey";
import { ENGLISH_ISLAND_CATALOG } from "../src/data/english-island-catalog";

async function seed(page: Page, theme: string, activities: PracticeActivity[] = []) {
  const workspace = createInitialWorkspace();
  workspace.studyPreferences.initialIslandId = "languages";
  workspace.practiceActivities = activities;
  await page.addInitScript(
    ({ theme, workspace }) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      if (sessionStorage.getItem("english-seeded")) return;
      sessionStorage.setItem("english-seeded", "1");
      localStorage.setItem("helenastudy.theme", theme);
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
      localStorage.setItem(
        "helena.profile.v1",
        JSON.stringify({ name: "Visitante de teste", photoUrl: "/profile-avatars/oliver.webp" }),
      );
    },
    { theme, workspace },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Porto das Vozes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ilha de Inglês", exact: true })).toBeVisible();
}
async function enter(page: Page) {
  await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
}
async function solve(page: Page, part: number, id: number, correct = true) {
  if (!validEnglishCourse(a1)) throw new Error("Invalid A1 content");
  const question = englishQuestion(a1, part, id);
  if (question.kind === "order") {
    for (const word of question.phrase.split(" "))
      await page
        .locator(".english-word-bank")
        .getByRole("button", { name: word, exact: true })
        .filter({ visible: true })
        .first()
        .click();
    await page.getByRole("button", { name: "Conferir resposta", exact: true }).click();
  } else
    await page
      .locator(".english-options")
      .getByRole("button", {
        name: correct
          ? question.answer
          : question.options.find((item) => item !== question.answer)!,
        exact: true,
      })
      .click();
  await expect(page.locator(".english-feedback")).toBeVisible();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
}
for (const theme of ["light", "dark"]) {
  test(`one English island with six internal parts and mathematics navigation: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, theme);
    await expect(page.locator(".english-subject-journey .math-journey-island")).toHaveCount(4);
    await expect(page.locator(".math-journey-completion")).toHaveAttribute("aria-valuenow", "0");
    await expect(page.locator(".math-journey-progress-pieces > span")).toHaveCount(6);
    await expect(page.locator(".math-journey-completion .paper-digits")).toHaveCSS(
      "--digit-face",
      "#292432",
    );
    for (const title of ["Ilha de Espanhol", "Ilha de Japonês", "Ilha de Chinês"]) {
      await page.getByRole("button", { name: "Próxima ilha de idioma", exact: true }).click();
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.locator(".math-place-start")).toBeDisabled();
    }
    for (let i = 0; i < 3; i++)
      await page.getByRole("button", { name: "Ilha de idioma anterior", exact: true }).click();
    const directory = "C:/Users/User/Documents/Codex/2026-09-10/b/previews-voices-port-single";
    await mkdir(directory, { recursive: true });
    await page
      .locator(".math-journey-island.is-current img")
      .evaluate((img: HTMLImageElement) => img.decode());
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-island.png`,
      fullPage: true,
    });
    await page.route("**/languages/en/english.json", (route) =>
      route.fulfill({ status: 503, body: "unavailable" }),
    );
    await enter(page);
    await expect(page.getByRole("alert")).toContainText("Não foi possível carregar");
    await page.unroute("**/languages/en/english.json");
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await expect(page.locator(".english-parts > button")).toHaveCount(6);
    for (const [i, title] of ENGLISH_ISLAND_CATALOG[0]!.parts.entries()) {
      await page.locator(".english-parts > button").nth(i).click();
      await expect(page.getByRole("heading", { name: title["pt-BR"], exact: true })).toBeVisible();
      await expect(page.locator(".english-mini-lesson p")).not.toBeEmpty();
      if (i > 0)
        await expect(
          page
            .locator(".english-part-detail")
            .getByRole("button", { name: "Praticar", exact: true }),
        ).toBeDisabled();
    }
    await noOverflow(page);
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-parts.png`,
      fullPage: true,
    });
  });
  test(`English journey, persisted mastery, rewards and accessible alternatives: ${theme}`, async ({
    page,
  }, info) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, theme);
    const directory = "C:/Users/User/Documents/Codex/2026-09-10/b/previews-voices-port-final";
    await mkdir(directory, { recursive: true });
    await noOverflow(page);
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-island.png`,
      fullPage: true,
    });
    await enter(page);
    await page.getByRole("button", { name: /Rotina e presente simples/ }).click();
    await expect(
      page.locator(".english-part-detail").getByRole("button", { name: "Praticar", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: /Apresentações e verbo to be/ }).click();
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-parts.png`,
      fullPage: true,
    });
    await page
      .locator(".english-journey")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await page.evaluate(() => {
      Object.defineProperty(window.speechSynthesis, "getVoices", {
        configurable: true,
        value: () => [{ lang: "en-US", localService: false }],
      });
      Object.defineProperty(window.speechSynthesis, "speak", {
        configurable: true,
        value: () => {
          throw new Error("Remote voice must not be used");
        },
      });
    });
    await page.getByRole("button", { name: "Ouvir a fala", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Não há uma voz inglesa local");
    await page.getByRole("button", { name: "Ver texto da fala", exact: true }).click();
    await expect(page.locator(".english-dialogue")).toContainText("Hello! My name is Olena.");
    await noOverflow(page);
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-lesson.png`,
      fullPage: true,
    });
    for (let id = 0; id < 6; id++) await solve(page, 0, id, id !== 2);
    await expect(page.locator(".english-summary")).toContainText(
      "Acertos: 5 · Erros: 1 · Pontos: 100",
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("helena.englishRewards.v1") ?? "{}")["english-english"]
              ?.points,
        ),
      )
      .toBe(100);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("helenastudy.workspace.v1") ?? "{}").practiceActivities
              ?.length,
        ),
      )
      .toBe(1);
    await page
      .locator(".english-journey")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    const leave = page.getByRole("dialog", { name: "Sair desta rodada?" });
    await expect(leave).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(leave).not.toBeVisible();
    await expect(page.locator(".english-lesson")).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Entrar em Porto das Vozes", exact: true }).click();
    await enter(page);
    await expect(page.locator(".english-part-detail")).toContainText("Acertos: 5 · Erros: 1");
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("helena.englishRewards.v1") ?? "{}")["english-english"]
            .points,
      ),
    ).toBe(100);
    await expect(page.locator(".math-chest-slot")).toHaveCount(1);
    await page.clock.install();
    await page.clock.fastForward(11000);
    await page.locator(".math-chest-slot").click();
    for (let i = 1; i <= 4; i++)
      await page.getByRole("button", { name: `Revelar raridade, toque ${i} de 4` }).click();
    await page.getByRole("button", { name: "Revelar carta", exact: true }).click();
    await expect(page.locator(".oliver-flip-card")).toHaveClass(/is-revealed/);
    expect(errors).toEqual([]);
  });
  test(`English confirmation unlocks the next part without modifying mathematics: ${theme}`, async ({
    page,
  }) => {
    const activities: PracticeActivity[] = Array.from({ length: 4 }, (_, group) => ({
      id: `seed-${group}`,
      islandId: "languages",
      islandName: "English",
      answers: 6,
      correct: 6,
      completedAt: new Date(1700000000000 + group * 1000).toISOString(),
      languageAttempt: {
        curriculum: 3,
        area: "english",
        part: 0,
        mode: "practice",
        questions: Array.from({ length: 6 }, (_, id) => id + group * 6),
        correctQuestions: Array.from({ length: 6 }, (_, id) => id + group * 6),
      },
    }));
    await seed(page, theme, activities);
    await enter(page);
    await page.getByRole("button", { name: /Rotina e presente simples/ }).click();
    await expect(
      page.locator(".english-part-detail").getByRole("button", { name: "Praticar", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: /Apresentações e verbo to be/ }).click();
    await page.getByRole("button", { name: "Confirmar esta parte", exact: true }).click();
    for (let id = 4; id < 9; id++) await solve(page, 0, id);
    await expect(page.locator(".english-summary")).toContainText("Parte confirmada!");
    await expect(page.getByRole("button", { name: /Rotina e presente simples/ })).toBeEnabled();
    await page.getByRole("button", { name: /Rotina e presente simples/ }).click();
    await expect(
      page.getByRole("heading", { name: "Rotina e presente simples", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("helena.mathGame.v5"))).toBeNull();
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(page.locator(".math-journey-completion")).toHaveAttribute("aria-valuenow", "16");
    await noOverflow(page);
  });
}
