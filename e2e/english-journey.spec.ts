import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createInitialWorkspace, type PracticeActivity } from "../src/domain/workspace";
import { validEnglishCourse, englishQuestion } from "../src/data/english-journey";
import { validA1Content } from "../src/data/english-a1-content";
import { ENGLISH_PART_CATALOG } from "../src/data/english-part-catalog";
import { ENGLISH_PART_ORDER } from "../src/domain/english-part-order";
const raw: unknown = JSON.parse(readFileSync("public/languages/en/english-v4.json", "utf8"));
if (!validEnglishCourse(raw)) throw new Error("Invalid English content");
const a1: unknown = JSON.parse(readFileSync("public/languages/en/english-a1-v1.json", "utf8"));
if (!validA1Content(a1)) throw Error("Invalid A1 content");
const course = { ...raw, a1 };
const readyIds = Array.from({ length: 6 }, (_, unit) =>
  Array.from({ length: 17 }, (_, i) => 120 + unit * 20 + i),
)
  .flat()
  .slice(0, 100);
const directory = "C:/Users/User/Documents/Codex/2026-09-10/b/previews-english-a1";
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
  await expect(page.locator(".english-entry")).toBeVisible();
  await expect(
    page.locator(".english-guide,.english-a1-materials,.english-course-heading"),
  ).toHaveCount(0);
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
  if (q.kind === "reply" || q.kind === "gap")
    await expect(page.locator(".english-reply-intent")).toHaveCSS("color", "rgb(255, 249, 239)");
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
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Pátio dos Traços", exact: true }),
    ).toBeVisible();
    for (let i = 0; i < 8; i++)
      await page.getByRole("button", { name: "Mundo anterior", exact: true }).click();
    await parts(page);
    await expect(page.locator(".math-journey-island")).toHaveCount(8);
    await page.route("**/languages/en/english-v4.json", (route) =>
      route.fulfill({ status: 503, body: "unavailable" }),
    );
    await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Não foi possível carregar");
    await page.unroute("**/languages/en/english-v4.json");
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await expect(page.locator(".english-entry")).toBeVisible();
    await expect(
      page.locator(".english-guide,.english-a1-materials,.english-course-heading"),
    ).toHaveCount(0);
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
  test(`all eight regions keep their own material and previously confirmed progress: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, theme, legacyCompleted());
    await parts(page);
    for (let i = 0; i < ENGLISH_PART_ORDER.length - 1; i++) {
      const previous = page.getByRole("button", { name: "Parte anterior de Inglês", exact: true });
      if (await previous.isDisabled()) break;
      await previous.click();
    }
    for (const [i, id] of ENGLISH_PART_ORDER.entries()) {
      const region = ENGLISH_PART_CATALOG[id]!;
      await expect(
        page.getByRole("heading", { name: region.title["pt-BR"], exact: true }),
      ).toBeVisible();
      await expect(page.locator(".math-journey-completion")).toHaveAttribute(
        "aria-valuenow",
        id < 6 ? "100" : "0",
      );
      await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
      await expect(page.locator(".english-entry")).toBeVisible();
      await expect(
        page.locator(".english-guide,.english-a1-materials,.english-course-heading"),
      ).toHaveCount(0);
      await expect(page.locator(".english-entry h1")).toHaveText(region.title["pt-BR"]);
      await expect(
        page.locator(".english-interior-emblem img,.math-game-landscape img"),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Confirmar esta parte", exact: true }),
      ).toHaveCount(0);
      await noOverflow(page);
      await page.getByRole("button", { name: "Voltar", exact: true }).click();
      if (i < ENGLISH_PART_ORDER.length - 1)
        await page.getByRole("button", { name: "Próxima parte de Inglês", exact: true }).click();
    }
    for (let i = 0; i < ENGLISH_PART_ORDER.length - 1 - ENGLISH_PART_ORDER.indexOf(2); i++)
      await page.getByRole("button", { name: "Parte anterior de Inglês", exact: true }).click();
    await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await expect(page.locator(".english-lesson")).toBeVisible();
    const pendingId = await page.locator(".english-lesson").getAttribute("data-question-id");
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await page.getByRole("button", { name: "Sair da rodada", exact: true }).click();
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await page.reload();
    await parts(page);
    await expect(
      page.getByRole("heading", { name: ENGLISH_PART_CATALOG[2]!.title["pt-BR"], exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", pendingId!);
  });
  test(`arcade countdown, adaptive answers and end-only specific correction: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await seed(page, theme);
    await materials(page);
    await page.evaluate(() => {
      Object.defineProperty(speechSynthesis, "getVoices", { configurable: true, value: () => [] });
      speechSynthesis.dispatchEvent(new Event("voiceschanged"));
    });
    await page.clock.install();
    const api = page.waitForResponse(
      (r) => r.url().includes("action=english") && r.request().method() === "POST",
    );
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    expect((await api).status()).toBe(200);
    await expect(page.locator(".math-countdown")).toBeVisible();
    await expect(page.locator(".english-lesson")).toHaveCount(0);
    for (let beat = 0; beat < 3; beat++) {
      await expect(page.locator(".math-countdown .paper-digits")).toHaveText(String(3 - beat));
      await expect(page.locator(".english-lesson")).toHaveCount(0);
      await page.clock.runFor(1000);
    }
    await expect(page.locator(".english-lesson")).toBeVisible();
    await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
    await expect(page.locator(".math-time")).toHaveAttribute("aria-label", /30/);
    await expect(
      page.locator(".english-lesson progress,.english-lesson-top,.english-journey-header"),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Voltar", exact: true })).toHaveClass(
      /math-world-back/,
    );
    await expect(page.getByRole("button", { name: "Continuar", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ouvir a fala", exact: true })).toHaveCount(0);
    for (const option of await page.locator(".english-options button").all()) {
      const rect = await option.boundingBox();
      expect(rect!.y).toBeGreaterThanOrEqual(0);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
    }
    await expect(page.locator(".math-reserve")).toHaveAttribute("aria-valuenow", "60");
    await page.clock.runFor(1000);
    await expect(page.locator(".math-reserve")).toHaveAttribute("aria-valuenow", "59");
    await expect(page.locator(".english-scene > img")).toHaveCount(0);
    const tones = await page
      .locator(".english-options button")
      .evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundColor));
    expect(new Set(tones).size).toBe(3);
    await page.screenshot({
      path: `${directory}/${info.project.name}-${theme}-activity.png`,
      fullPage: false,
    });
    let lastFailedId = "";
    for (let at = 0; at < 8; at++) {
      const previous = await page.locator(".english-lesson").getAttribute("data-question-id");
      if (at === 7) lastFailedId = previous!;
      await answer(page, at < 5);
      if (at === 5 || at === 6) await expect(page.locator(".english-mentor")).toHaveCount(0);
      await page.clock.runFor(at < 5 ? 650 : 1300);
      if (at < 7)
        await expect(page.locator(".english-lesson")).not.toHaveAttribute(
          "data-question-id",
          previous!,
        );
    }
    await expect(page.getByRole("region", { name: "Revisão com a Olena" })).toBeVisible();
    await expect(page.locator(".math-hearts")).toHaveCount(0);
    // A explicação não mostra a Olena (nem imagem, nem rótulo) e o cartão usa a largura toda.
    await expect(
      page.locator('.english-mentor img[src*="characters"], .english-mentor img[alt="Olena"]'),
    ).toHaveCount(0);
    await expect(page.locator(".english-mentor .oliver-review__speaker")).toHaveCount(0);
    await expect(page.locator(".english-mentor .oliver-review__character")).toHaveCount(0);
    {
      const lesson = (await page.locator(".english-mentor .oliver-review__lesson").boundingBox())!;
      const speech = (await page.locator(".english-mentor .oliver-review__speech").boundingBox())!;
      expect(speech.width).toBeGreaterThan(lesson.width - 2);
    }
    await page.keyboard.press("Tab");
    await page.locator(".english-mentor h1").focus();
    await expect(page.locator(".english-mentor h1")).toHaveCSS("text-decoration-line", "none");
    await expect(page.locator(".english-mentor h1")).toHaveCSS("filter", "none");
    await expect(page.locator(".english-mentor blockquote")).toHaveCSS(
      "background-color",
      "rgb(255, 225, 125)",
    );
    await expect(page.locator(".english-mentor blockquote")).toHaveCSS("color", "rgb(41, 36, 50)");
    const explanations: string[] = [];
    for (let i = 0; i < 3; i++) {
      explanations.push(await page.locator(".english-specific-explanation").innerText());
      await expect(page.locator(".english-mentor")).toContainText("Sua resposta:");
      if (i === 0)
        await page.screenshot({
          path: `${directory}/${info.project.name}-${theme}-correction.png`,
          fullPage: false,
        });
      await noOverflow(page);
      await page
        .getByRole("button", { name: i < 2 ? "Próxima explicação" : "Ver resultado", exact: true })
        .click();
    }
    expect(new Set(explanations).size).toBeGreaterThan(1);
    await expect(page.locator(".math-results h1")).toHaveText("100 pontos");
    await expect(page.locator(".room-reward-notice")).toContainText(
      "+20 XP pela prática de Inglês!",
    );
    await expect(page.locator(".math-result-xp")).toHaveCount(0);
    await expect(page.locator(".room-reward-notice")).toHaveCSS(
      "color",
      theme === "light" ? "rgb(15, 15, 20)" : "rgb(244, 242, 238)",
    );
    await expect(
      page.getByRole("button", { name: "Levar Poeira cósmica aos espaços da ilha", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `${directory}/${info.project.name}-${theme}-results.png` });
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
      .toBe(8);
    const rewardsBeforeDelivery = await page.evaluate(() =>
      localStorage.getItem("helena.englishRewards.v1"),
    );
    await page
      .getByRole("button", { name: "Levar Poeira cósmica aos espaços da ilha", exact: true })
      .click();
    await expect(page.locator(".english-parts-journey")).toBeVisible();
    await expect(page.locator(".math-chest-flight")).toHaveCount(1);
    expect(await page.evaluate(() => localStorage.getItem("helena.englishRewards.v1"))).toBe(
      rewardsBeforeDelivery,
    );
    await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await page.clock.runFor(3000);
    await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
    await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", lastFailedId);
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await page.getByRole("button", { name: "Sair da rodada", exact: true }).click();
    await page.reload();
    await materials(page);
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).practiceActivities.reduce(
          (n: number, a: { correct: number }) => n + a.correct,
          0,
        ),
      ),
    ).toBe(5);
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await page.clock.runFor(3000);
    await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", lastFailedId);
    expect(failures).toEqual([]);
  });
  test(`zero-point result has no dust or inline XP and keeps retry: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, theme);
    await materials(page);
    await page.clock.install();
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await page.clock.runFor(3000);
    for (let i = 0; i < 3; i++) {
      await expect(page.locator(".english-lesson")).toBeVisible();
      const previous = await page.locator(".english-lesson").getAttribute("data-question-id");
      await answer(page, false);
      await page.clock.runFor(1300);
      if (i < 2)
        await expect(page.locator(".english-lesson")).not.toHaveAttribute(
          "data-question-id",
          previous!,
        );
      else await expect(page.locator(".english-mentor")).toBeVisible();
    }
    for (let i = 0; i < 3; i++)
      await page
        .getByRole("button", { name: i < 2 ? "Próxima explicação" : "Ver resultado", exact: true })
        .click();
    await expect(page.locator(".math-results h1")).toHaveText("0 pontos");
    await expect(page.locator(".math-result-xp,.math-earned-chest")).toHaveCount(0);
    await page.getByRole("button", { name: "Tentar de novo", exact: true }).click();
    await page.clock.runFor(3000);
    await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
  });
  test(`expired deadlines cost hearts without inventing a chosen answer: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, theme);
    await materials(page);
    await page.clock.install();
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await expect(page.locator(".math-countdown")).toBeVisible();
    await page.clock.runFor(3000);
    for (let at = 0; at < 3; at++) {
      const previous = await page.locator(".english-lesson").getAttribute("data-question-id");
      const deadline = Number(
        await page.locator(".math-time .math-number").getAttribute("aria-label"),
      );
      await page.clock.runFor(deadline * 1000);
      await expect(page.locator(".math-hearts .is-breaking")).toHaveCount(1);
      await expect(page.locator('.english-options [aria-pressed="true"]')).toHaveCount(0);
      await page.clock.runFor(1300);
      if (at < 2)
        await expect(page.locator(".english-lesson")).not.toHaveAttribute(
          "data-question-id",
          previous!,
        );
    }
    await expect(page.locator(".english-mentor")).toContainText("Tempo esgotado");
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
    await expect(page.locator(".english-lesson")).toBeVisible();
    await page.clock.install();
    const answeredId = await page.locator(".english-lesson").getAttribute("data-question-id");
    await answer(page);
    await page.clock.runFor(650);
    await expect(page.locator(".english-lesson")).not.toHaveAttribute(
      "data-question-id",
      answeredId!,
    );
    const pendingId = await page.locator(".english-lesson").getAttribute("data-question-id");
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
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).practiceActivities.reduce(
          (n: number, a: { correct: number }) => n + a.correct,
          0,
        ),
      ),
    ).toBe(1);
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await page.clock.runFor(3000);
    await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", pendingId!);
    await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
  });
}

for (const theme of ["light", "dark"]) {
  test(`expanded confirmation keeps the last percent until passing and unlocks the next area: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const records: PracticeActivity[] = [];
    for (let first = 0; first < 100; first += 6) {
      const ids = Array.from(
        { length: Math.min(6, 100 - first) },
        (_, offset) => readyIds[first + offset]!,
      );
      records.push({
        id: `expanded:${first}`,
        islandId: "english",
        islandName: "Cais dos Encontros",
        answers: ids.length,
        correct: ids.length,
        completedAt: new Date(1700000000000 + first * 1000).toISOString(),
        englishA1Attempt: {
          curriculum: 5,
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
    await expect(page.locator(".english-lesson")).toBeVisible();
    for (let at = 0; at < 5; at++) {
      if (at === 2) {
        const pendingId = await page.locator(".english-lesson").getAttribute("data-question-id");
        await page.getByRole("button", { name: "Voltar", exact: true }).click();
        await page.getByRole("button", { name: "Sair da rodada", exact: true }).click();
        await page.reload();
        await materials(page);
        await page.getByRole("button", { name: "Confirmar esta parte", exact: true }).click();
        await expect(page.locator(".english-lesson")).toHaveAttribute(
          "data-question-id",
          pendingId!,
        );
      }
      const previous = await page.locator(".english-lesson").getAttribute("data-question-id");
      await answer(page);
      if (at < 4)
        await expect(page.locator(".english-lesson")).not.toHaveAttribute(
          "data-question-id",
          previous!,
        );
    }
    await expect(page.locator(".math-results")).toContainText("Parte confirmada!");
    const finals = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).practiceActivities.filter(
        (item: { englishA1Attempt?: { mode: string } }) => item.englishA1Attempt?.mode === "final",
      ),
    );
    expect(finals).toHaveLength(1);
    expect(finals[0].answers).toBe(5);
    expect(finals[0].correct).toBe(5);
    await expect(
      page.getByRole("button", { name: "Confirmar esta parte", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Voltar", exact: true }).click();
    await expect(page.locator(".math-journey-completion")).toHaveAttribute("aria-valuenow", "100");
    await page.getByRole("button", { name: "Próxima parte de Inglês", exact: true }).click();
    await expect(page.locator(".math-place-start")).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem("helena.mathPlaceRewards.v1"))).toBe(
      mathBefore,
    );
  });
  test(`failed confirmation records only answered questions and requires recovery: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const records: PracticeActivity[] = Array.from({ length: 100 }, (_, at) => {
      const id = readyIds[at]!;
      return {
        id: "ready:" + id,
        islandId: "english",
        islandName: "English",
        answers: 1,
        correct: 1,
        completedAt: new Date(1700000000000 + id * 1000).toISOString(),
        englishA1Attempt: {
          curriculum: 5,
          area: "english",
          part: 0,
          mode: "practice",
          questions: [id],
          correctQuestions: [id],
        },
      };
    });
    await seed(page, theme, records);
    await materials(page);
    await page.clock.install();
    await page.getByRole("button", { name: "Confirmar esta parte", exact: true }).click();
    await expect(page.locator(".math-countdown")).toBeVisible();
    await page.clock.runFor(3000);
    for (let at = 0; at < 3; at++) {
      const previous = await page.locator(".english-lesson").getAttribute("data-question-id");
      await answer(page, false);
      await page.clock.runFor(1300);
      if (at < 2)
        await expect(page.locator(".english-lesson")).not.toHaveAttribute(
          "data-question-id",
          previous!,
        );
    }
    for (let i = 0; i < 3; i++)
      await page
        .getByRole("button", { name: i < 2 ? "Próxima explicação" : "Ver resultado", exact: true })
        .click();
    await expect(page.locator(".math-results")).toContainText("Revise quatro respostas corretas");
    await expect(
      page.getByRole("button", { name: "Confirmar esta parte", exact: true }),
    ).toHaveCount(0);
    const entry = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("helenastudy.workspace.v1") ?? "{}").practiceActivities.at(
        -1,
      ),
    );
    expect(entry.answers).toBe(3);
    expect(entry.correct).toBe(0);
    expect(entry.englishA1Attempt.mode).toBe("practice");
    expect(entry.englishA1FinalFailure).toBe(true);
  });
  test(`remembers a destination opened by an explicit mathematics shortcut: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await seed(page, theme);
    await page.evaluate(() => sessionStorage.setItem("olena:enter-mathematics", "foundations"));
    await page.reload();
    await expect(page.locator(".math-world-back")).toBeVisible();
    await page.locator(".math-world-back").click();
    await expect(page.locator(".practice-carousel-island.is-current img").first()).toHaveAttribute(
      "src",
      "/practice-islands/mathematics.webp",
    );
    await page.reload();
    await expect(page.locator(".practice-carousel-island.is-current img").first()).toHaveAttribute(
      "src",
      "/practice-islands/mathematics.webp",
    );
  });
}
