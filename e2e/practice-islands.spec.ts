import { test, expect } from "@playwright/test";
import { shownMathQuestion } from "./math-question";
test("mathematics islands use the shared adaptive engine and resume mastery", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const randomValues = crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto, "getRandomValues", {
      value: (values: ArrayBufferView) => {
        if (values instanceof Uint32Array && values.length === 1) {
          values[0] = 2147483648;
          return values;
        }
        return randomValues(values);
      },
    });
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.soloProgress", "4");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ name: "Aluno", photoUrl: "/profile-avatars/helena.webp" }),
    );
    const Native = window.AudioContext;
    const proof = { contexts: [] as AudioContext[], tones: 0 };
    (window as Window & { mathAudioProof?: typeof proof }).mathAudioProof = proof;
    if (Native)
      window.AudioContext = class extends Native {
        constructor(options?: AudioContextOptions) {
          super(options);
          proof.contexts.push(this);
        }
        override createOscillator() {
          proof.tones++;
          return super.createOscillator();
        }
      };
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await expect(page.getByRole("region", { name: "Ilhas de Matemática" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pátio das Primeiras Contas" })).toBeVisible();
  await expect(page.locator(".math-journey")).toHaveClass(/is-map/);
  await expect(page.getByRole("button", { name: "Próxima ilha de Matemática" })).toHaveCount(0);
  const stage = await page.locator(".math-journey-stage").boundingBox();
  const x = stage!.x + stage!.width / 2,
    y = stage!.y + stage!.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 140, y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Oficina das Equações" })).toBeVisible();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 100, y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Pátio das Primeiras Contas" })).toBeVisible();
  await expect(page.locator(".math-journey-avatar")).toHaveCSS("opacity", "1");
  const avatarBox = await page
    .locator(".math-journey-avatar .practice-user-portrait")
    .boundingBox();
  expect(Math.abs(avatarBox!.width - avatarBox!.height)).toBeLessThan(1);
  for (let place = 0; place < 6; place++) {
    const scene = page.locator(".math-journey-island.is-current img.math-place-scene");
    await expect(scene).toBeVisible();
    await expect
      .poll(() => scene.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(scene).toHaveCSS("object-fit", "contain");
    await expect(scene).toHaveCSS("clip-path", "none");
    if (place < 5) await page.keyboard.press("ArrowRight");
  }
  for (let place = 0; place < 5; place++) await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".math-journey-avatar")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("math-islands.png") });
  await page.getByRole("button", { name: "Entrar em Pátio das Primeiras Contas" }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.locator(".math-countdown")).toBeVisible();
  await expect(page.locator(".math-reserve")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Resposta/ })).toHaveCount(4);
  expect(Number(await page.locator(".math-reserve").getAttribute("aria-valuenow"))).toBeGreaterThan(
    58,
  );
  for (let index = 0; index < 6; index++) {
    const { answer } = await shownMathQuestion(page, "foundations");
    await page.getByRole("button", { name: "Resposta " + answer, exact: true }).click();
    await expect(page.locator(".math-answer-reaction")).toBeVisible();
    await expect(page.locator(".math-answer-reaction .practice-user-portrait")).toHaveCount(0);
    await expect(page.locator(".math-answer-reaction")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Parabéns, você se superou!" })).toHaveCount(0);
  }
  await expect(page.getByText("Adição", { exact: true })).toBeVisible();
  await expect(page.getByText(/VOCÊ ESTÁ INSANO/)).toBeVisible();
  const audioProof = await page.evaluate(() => {
    const proof = (
      window as Window & { mathAudioProof?: { contexts: AudioContext[]; tones: number } }
    ).mathAudioProof!;
    return {
      contexts: proof.contexts.length,
      running: proof.contexts.every((context) => context.state === "running"),
      tones: proof.tones,
    };
  });
  expect(audioProof.contexts).toBe(1);
  expect(audioProof.running).toBe(true);
  expect(audioProof.tones).toBeGreaterThan(10);
  await expect(page.locator(".math-user-avatar svg")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("math-playing.png") });
  const geometry = await page.locator(".math-answers").boundingBox();
  await expect(page.locator(".math-game-stats")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: /^Resposta/ }).last()).toBeInViewport({ ratio: 1 });
  expect(geometry!.x).toBeGreaterThanOrEqual(0);
  expect(geometry!.x + geometry!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  for (let index = 0; index < 3; index++) {
    const { answer: value } = await shownMathQuestion(page, "foundations");
    const buttons = page.getByRole("button", { name: /^Resposta/ });
    const labels = await buttons.evaluateAll((items) =>
      items.map((item) => item.getAttribute("aria-label")),
    );
    await buttons.nth(labels.findIndex((label) => Number(label!.split(" ")[1]) !== value)).click();
    await expect(page.locator(".math-answer-reaction")).toBeVisible();
    await expect(page.locator(".math-answer-reaction")).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
  await expect(page.getByText(/XP pela prática de Matemática/)).toBeVisible();
  await expect(page.locator('.room-reward-notice [data-paper-editor-icon="close"]')).toBeVisible();
  await expect(page.locator(".room-reward-notice")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("math-result.png") });
  await page.getByRole("button", { name: "Levar Poeira cósmica aos espaços da ilha" }).click();
  await expect(page.locator(".math-chest-flight")).toHaveCount(1);
  await expect(page.locator(".math-journey")).toHaveClass(/is-map/);
  await page.getByRole("button", { name: "Explorar lugar" }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByText("Adição", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Voltar às ilhas" }).click();
  await expect(page.getByRole("region", { name: "Ilhas de Matemática" })).toBeVisible();
  await expect(page.locator(".math-journey")).toHaveClass(/is-map/);
  await expect(page.locator(".math-chest-slot")).toBeVisible();
  await expect(page.locator(".math-chest-slot")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("math-place-chest.png") });
  const sceneBottom = (await page.locator(".math-journey-island.is-current").boundingBox())!;
  const dock = (await page.locator(".math-chest-dock").boundingBox())!;
  expect(dock.y).toBeGreaterThan(sceneBottom.y + sceneBottom.height * 0.88);
  await page.clock.install();
  await page.clock.fastForward(11_000);
  await page.getByRole("button", { name: "Abrir Poeira cósmica" }).click();
  await page.clock.fastForward(1000);
  await expect(page.getByRole("dialog", { name: "Poeira cósmica", exact: true })).toBeVisible();
  for (let i = 1; i <= 4; i++)
    await page.getByRole("button", { name: `Revelar raridade, toque ${i} de 4` }).click();
  await page.clock.fastForward(1000);
  await expect(page.locator(".oliver-flip-card")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("oliver-card-back.png") });
  const cardBox = (await page
    .getByRole("button", { name: "Revelar carta", exact: true })
    .boundingBox())!;
  await page.mouse.move(cardBox.x + 40, cardBox.y + 100);
  await page.mouse.down();
  await page.mouse.move(cardBox.x + 120, cardBox.y + 100, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".oliver-flip-card")).toHaveClass(/is-revealed/);
  await expect
    .poll(() =>
      page
        .locator(".arcana-paper__scene img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.clock.fastForward(1000);
  await expect(page.locator(".oliver-inspection-turn")).toHaveAttribute("style", /rotateY\(0deg\)/);
  await expect(page.getByText("Stamina", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("oliver-card-front.png") });
  await expect(page.getByRole("button", { name: /Inspecionar carta em 360/ })).toBeVisible();
  if (await page.getByRole("button", { name: "Próxima carta" }).count()) {
    await page.getByRole("button", { name: "Próxima carta" }).click();
    await page.getByRole("button", { name: "Revelar carta", exact: true }).click();
  }
  await expect(page.getByLabel("0 cartas restantes na Poeira cósmica")).toBeVisible();
  await page.getByRole("button", { name: "Guardar cartas" }).click();
  await expect(page.getByLabel("Espaço de Poeira cósmica vazio")).toHaveCount(3);
  await expect(page.getByRole("dialog", { name: "Arcano" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("oliver-collection.png") });
  await page.locator(".profile-cards__gallery-item.is-owned .profile-cards__tile").first().click();
  const inspect = page.getByRole("button", { name: /Inspecionar carta em 360/ });
  await inspect.focus();
  for (let index = 0; index < 8; index++) await inspect.press("ArrowRight");
  await expect(page.locator(".oliver-inspection-turn")).toHaveAttribute(
    "style",
    /rotateY\(200deg\)/,
  );
  await page.screenshot({ path: testInfo.outputPath("oliver-card-inspection.png") });
  await page.getByRole("button", { name: "Recentralizar carta" }).click();
  await page.getByRole("button", { name: "Voltar à coleção" }).click();
  await page.getByRole("button", { name: "Inspecionar carta A Estrela" }).click();
  await expect(page.locator(".library-dialog > header h2")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".arcana-paper__scene img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("oliver-tarot.png") });
  await page
    .locator(".oliver-inspection-front .arcana-paper")
    .screenshot({ path: testInfo.outputPath("oliver-tarot-card.png") });
  await page.getByRole("button", { name: "Voltar à coleção" }).click();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Voltar às ilhas" }).click();
  await expect(page.getByRole("heading", { name: "Picos dos Padrões" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("helena.soloProgress"))).toBe("4");
});
