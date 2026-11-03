import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createInitialWorkspace, type PracticeActivity } from "../src/domain/workspace";
import { validEnglishCourse, englishQuestion } from "../src/data/english-journey";
import { ENGLISH_PART_CATALOG } from "../src/data/english-part-catalog";
const raw: unknown = JSON.parse(readFileSync("public/languages/en/english-v4.json", "utf8"));
if (!validEnglishCourse(raw)) throw new Error("Invalid English content");
const course = raw;
const directory = "C:/Users/User/Documents/Codex/2026-09-10/b/previews-english-learning";
async function seed(page: Page, theme: string, activities: PracticeActivity[] = []) {
  const workspace = createInitialWorkspace();
  workspace.studyPreferences.initialIslandId = "languages"; // Older preference still opens English.
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
  await expect(
    page.getByRole("heading", { name: "Cais dos Encontros", exact: true }),
  ).toBeVisible();
  await mkdir(directory, { recursive: true });
}
async function parts(page: Page) {
  await page.getByRole("button", { name: "Explorar Inglês", exact: true }).click();
  await expect(page.locator(".english-parts-journey")).toBeVisible();
}
async function materials(page: Page) {
  await parts(page);
  await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
  await expect(page.locator(".english-guide > section")).toHaveCount(4);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const interior = page.locator(".english-island-interior");
  if (await interior.count()) {
    expect(await interior.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const bounds = await interior.boundingBox();
    expect(bounds?.y).toBe(0);
    expect(bounds?.height).toBe(await page.evaluate(() => innerHeight));
  }
}
async function answer(page: Page, correct = true) {
  const lesson = page.locator(".english-lesson");
  const id = Number(await lesson.getAttribute("data-question-id"));
  const q = englishQuestion(course, 0, id);
  if (q.kind === "order") {
    const words = q.phrase.split(" ");
    const order = correct ? words : [...words].reverse();
    for (const word of order)
      await page
        .locator('.english-word-bank button[aria-disabled="false"]')
        .getByText(word, { exact: true })
        .first()
        .click();
  } else
    await page
      .locator(".english-options")
      .getByRole("button", {
        name: correct ? q.answer : q.options.find((option) => option !== q.answer)!,
        exact: true,
      })
      .click();
  await expect(
    page.locator(`[data-feedback="${correct ? "correct" : "wrong"}"]`).first(),
  ).toBeVisible();
}
function legacyCompleted(): PracticeActivity[] {
  const records: PracticeActivity[] = [];
  for (let part = 0; part < 6; part++) {
    for (let group = 0; group < 4; group++)
      records.push({
        id: `old:${part}:${group}`,
        islandId: "languages",
        islandName: "English",
        answers: 6,
        correct: 6,
        completedAt: new Date(1700000000000 + records.length * 1000).toISOString(),
        languageAttempt: {
          curriculum: 3,
          area: "english",
          part,
          mode: "practice",
          questions: Array.from({ length: 6 }, (_, id) => group * 6 + id),
          correctQuestions: Array.from({ length: 6 }, (_, id) => group * 6 + id),
        },
      });
    records.push({
      id: `old:${part}:final`,
      islandId: "languages",
      islandName: "English",
      answers: 5,
      correct: 4,
      completedAt: new Date(1700000000000 + records.length * 1000).toISOString(),
      languageAttempt: {
        curriculum: 3,
        area: "english",
        part,
        mode: "final",
        questions: [0, 1, 2, 3, 4],
        correctQuestions: [0, 1, 2, 3],
      },
    });
  }
  return records;
}
for (const theme of ["light", "dark"]) {
  test(`general language islands and regional materials: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, theme);
    await expect(page.getByRole("heading", { name: "Porto das Vozes", exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.locator(".math-place-treasure,.math-journey-completion,.math-place-points"),
    ).toHaveCount(0);
    await expect(page.locator(".practice-carousel-island")).toHaveCount(9);
    await expect(page.locator(".practice-carousel-island.is-current img").first()).toHaveAttribute(
      "src",
      "/languages/islands/english.webp",
    );
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-general.png`,
      fullPage: false,
    });
    for (let i = 0; i < 6; i++)
      await page.getByRole("button", { name: "Próximo mundo", exact: true }).click();
    for (const [i, name] of [
      "Praça dos Ventos",
      "Jardim das Palavras",
      "Pátio dos Traços",
    ].entries()) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Ilha bloqueada", exact: true }),
      ).toBeDisabled();
      if (i < 2) await page.getByRole("button", { name: "Próximo mundo", exact: true }).click();
    }
    for (let i = 0; i < 8; i++)
      await page.getByRole("button", { name: "Mundo anterior", exact: true }).click();
    await parts(page);
    await expect(page.locator(".math-journey-island")).toHaveCount(6);
    await page.route("**/languages/en/english-v4.json", (route) =>
      route.fulfill({ status: 503, body: "unavailable" }),
    );
    await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Não foi possível carregar");
    await page.unroute("**/languages/en/english-v4.json");
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await expect(page.locator(".english-guide > section")).toHaveCount(4);
    await expect(page.locator(".english-guide")).toContainText(
      "To be pode significar ser ou estar",
    );
    await expect(page.locator(".english-guide")).toContainText("Eu gostaria de um café");
    await expect(page.locator(".english-part-detail")).toContainText("100 questões diferentes");
    await expect(page.locator(".math-treasure,.math-place-treasure")).toHaveCount(0);
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-materials.png`,
      fullPage: false,
    });
    await noOverflow(page);
    await page.locator(".english-island-interior").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-materials-end.png`,
      fullPage: false,
    });
    await expect(page.locator(".math-place-treasure")).toHaveCount(0);
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Cais das Boas-vindas", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Próxima parte de Inglês", exact: true }).click();
    await expect(page.locator(".math-place-start")).toBeDisabled();
  });
  test(`all six regions keep their own material and previously confirmed progress: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, theme, legacyCompleted());
    await parts(page);
    for (let i = 0; i < 5; i++)
      await page.getByRole("button", { name: "Parte anterior de Inglês", exact: true }).click();
    for (const [i, region] of ENGLISH_PART_CATALOG.entries()) {
      await expect(
        page.getByRole("heading", { name: region.title["pt-BR"], exact: true }),
      ).toBeVisible();
      await expect(page.locator(".math-journey-completion")).toHaveAttribute(
        "aria-valuenow",
        "100",
      );
      await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
      await expect(page.locator(".english-guide > section")).toHaveCount(4);
      await expect(page.locator(".english-interior-emblem img")).toHaveAttribute(
        "src",
        `/languages/english-parts/${region.art}.webp`,
      );
      await expect(
        page.getByRole("button", { name: "Confirmar esta parte", exact: true }),
      ).toBeDisabled();
      await noOverflow(page);
      await page.getByRole("button", { name: "Voltar", exact: true }).click();
      if (i < 5)
        await page.getByRole("button", { name: "Próxima parte de Inglês", exact: true }).click();
    }
  });
  test(`adaptive answers, Olena correction, immediate saving and quiet audio fallback: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await seed(page, theme);
    await materials(page);
    await page.evaluate(() => {
      Object.defineProperty(window.speechSynthesis, "getVoices", {
        configurable: true,
        value: () => [],
      });
      window.speechSynthesis.dispatchEvent(new Event("voiceschanged"));
    });
    const api = page.waitForResponse(
      (response) =>
        response.url().includes("action=english") && response.request().method() === "POST",
    );
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    expect((await api).status()).toBe(200);
    await expect(page.locator(".english-lesson")).toBeVisible();
    await expect(page.locator(".english-journey-header")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ver texto da fala", exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Continuar", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ouvir a fala", exact: true })).toHaveCount(0);
    await expect(page.locator(".english-options button")).toHaveCount(3);
    const tones = await page
      .locator(".english-options button")
      .evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundColor));
    expect(new Set(tones).size).toBe(3);
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-activity.png`,
      fullPage: false,
    });
    await answer(page, false);
    await expect(page.getByRole("region", { name: "Revisão com a Olena" })).toBeVisible();
    await expect(page.locator(".english-mentor")).toContainText("Sua resposta:");
    await expect(page.locator(".english-mentor")).toContainText("Resposta explicada");
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-correction.png`,
      fullPage: false,
    });
    await noOverflow(page);
    await page.getByRole("button", { name: "Agora é sua vez", exact: true }).click();
    await expect(page.locator(".english-lesson-top")).toContainText("Questão 2 de 6");
    for (let at = 1; at < 6; at++) {
      await answer(page);
      if (at < 5)
        await expect(page.locator(".english-lesson-top")).toContainText(`Questão ${at + 2} de 6`);
    }
    await expect(page.locator(".english-summary")).toContainText(
      "Acertos: 5 · Erros: 1 · Pontos: 100",
    );
    await expect(page.locator(".math-treasure,.math-place-treasure")).toHaveCount(0);
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
            JSON.parse(localStorage.getItem("helena.englishRewards.v1") ?? "{}")["english-english"]
              ?.chests.length,
        ),
      )
      .toBe(1);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("helenastudy.workspace.v1") ?? "{}").practiceActivities
              ?.length,
        ),
      )
      .toBe(6);
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(page.locator(".math-journey-completion")).toHaveAttribute("aria-valuenow", "5");
    await page.reload();
    await materials(page);
    await expect(page.locator(".english-part-detail")).toContainText("Acertos: 5 · Erros: 1");
    expect(failures).toEqual([]);
  });
  test(`offline scheduling still saves each answer without waiting for a full round: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, theme);
    await materials(page);
    await page.route("**/api/olena?action=english", (route) => route.abort());
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await page.clock.install();
    await answer(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Sair desta rodada?" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Sair desta rodada?" })).not.toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Sair da rodada", exact: true }).click();
    await page.clock.runFor(1500);
    await expect(page.locator(".english-lesson")).toHaveCount(0);
    await page.reload();
    await materials(page);
    await expect(page.locator(".english-part-detail")).toContainText("Acertos: 1 · Erros: 0");
  });
}

for (const theme of ["light", "dark"]) {
  test(`expanded confirmation keeps the last percent until passing and unlocks the next area: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const records: PracticeActivity[] = [];
    for (let first = 0; first < 100; first += 6) {
      const ids = Array.from({ length: Math.min(6, 100 - first) }, (_, offset) => first + offset);
      records.push({
        id: `expanded:${first}`,
        islandId: "english",
        islandName: "Cais dos Encontros",
        answers: ids.length,
        correct: ids.length,
        completedAt: new Date(1700000000000 + first * 1000).toISOString(),
        englishAttempt: {
          curriculum: 4,
          area: "english",
          part: 0,
          mode: "practice",
          questions: ids,
          correctQuestions: ids,
        },
      });
    }
    await seed(page, theme, records);
    await parts(page);
    await expect(page.locator(".math-journey-completion")).toHaveAttribute("aria-valuenow", "99");
    await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Confirmar esta parte", exact: true }),
    ).toBeEnabled();
    const mathBefore = await page.evaluate(() =>
      localStorage.getItem("helena.mathPlaceRewards.v1"),
    );
    await page.getByRole("button", { name: "Confirmar esta parte", exact: true }).click();
    for (let at = 0; at < 5; at++) {
      await answer(page);
      if (at < 4)
        await expect(page.locator(".english-lesson-top")).toContainText(`Questão ${at + 2} de 5`);
    }
    await expect(page.locator(".english-summary")).toContainText("Parte confirmada!");
    await expect(
      page.getByRole("button", { name: "Confirmar esta parte", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(page.locator(".math-journey-completion")).toHaveAttribute("aria-valuenow", "100");
    await page.getByRole("button", { name: "Próxima parte de Inglês", exact: true }).click();
    await expect(page.locator(".math-place-start")).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem("helena.mathPlaceRewards.v1"))).toBe(
      mathBefore,
    );
  });
}
