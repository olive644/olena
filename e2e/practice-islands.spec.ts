import { test, expect } from "@playwright/test";
test("mathematics islands use the real adaptive API and resume mastery", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
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
  for (let index = 0; index < 5; index++) {
    const question = page.locator(".math-game-question h1");
    const text = await question.getAttribute("aria-label");
    const nums = text!.match(/\d+/g)!.map(Number);
    const answer = text!.includes("−")
      ? nums[0]! - nums[1]!
      : text!.includes("×")
        ? nums[0]! * nums[1]!
        : nums[0]! + nums[1]!;
    await page.getByRole("button", { name: "Resposta " + answer, exact: true }).click();
    await expect(page.locator(".math-answer-reaction")).toBeVisible();
    await expect(page.locator(".math-answer-reaction .practice-user-portrait")).toHaveCount(0);
    await expect(page.locator(".math-answer-reaction")).toHaveCount(0);
  }
  await expect(page.getByText("Multiplicação", { exact: true })).toBeVisible();
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
    const text = await page.locator(".math-game-question h1").getAttribute("aria-label");
    const nums = text!.match(/\d+/g)!.map(Number);
    const value = text!.includes("−")
      ? nums[0]! - nums[1]!
      : text!.includes("+")
        ? nums[0]! + nums[1]!
        : nums[0]! * nums[1]!;
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
  await page.getByRole("button", { name: "Levar baú aos espaços da ilha" }).click();
  await expect(page.locator(".math-chest-flight")).toHaveCount(1);
  await expect(page.locator(".math-journey")).toHaveClass(/is-map/);
  await page.getByRole("button", { name: "Explorar lugar" }).click();
  await page.getByRole("button", { name: "Vamos calcular!" }).click();
  await expect(page.getByText("Subtração", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Voltar às ilhas" }).click();
  await expect(page.getByRole("region", { name: "Ilhas de Matemática" })).toBeVisible();
  await expect(page.locator(".math-journey")).toHaveClass(/is-map/);
  await expect(page.getByRole("button", { name: "Destrancar baú comum" })).toBeVisible();
  await expect(page.locator(".math-chest-slot")).toHaveCSS("opacity", "1");
  await page.screenshot({ path: testInfo.outputPath("math-place-chest.png") });
  const sceneBottom = (await page.locator(".math-journey-island.is-current").boundingBox())!;
  const dock = (await page.locator(".math-chest-dock").boundingBox())!;
  expect(dock.y).toBeGreaterThan(sceneBottom.y + sceneBottom.height * 0.88);
  await page.getByRole("button", { name: "Destrancar baú comum" }).click();
  await expect(
    page.getByRole("button", { name: /Baú comum, .* segundos restantes/ }),
  ).toBeDisabled();
  await page.clock.install();
  await page.clock.fastForward(61_000);
  await page.getByRole("button", { name: "Abrir baú comum" }).click();
  await page.clock.fastForward(1000);
  await expect(page.getByRole("dialog", { name: "Cartas do baú comum" })).toBeVisible();
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
        .locator(".oliver-card-art")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.clock.fastForward(1000);
  await expect(page.locator(".oliver-card-turn")).toHaveCSS(
    "transform",
    "matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)",
  );
  await expect(page.getByText("Stamina", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("oliver-card-front.png") });
  if (await page.getByRole("button", { name: "Próxima carta" }).count()) {
    await page.getByRole("button", { name: "Próxima carta" }).click();
    await page.getByRole("button", { name: "Revelar carta", exact: true }).click();
  }
  await expect(page.getByLabel("0 cartas restantes no baú")).toBeVisible();
  await page.getByRole("button", { name: "Guardar cartas" }).click();
  await expect(page.getByLabel("Espaço de baú vazio")).toHaveCount(3);
  await expect(page.getByRole("dialog", { name: "Coleção do Oliver" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("oliver-collection.png") });
  await page.locator(".oliver-collection-item.is-owned").first().click();
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
  await page.getByRole("button", { name: "Ver tarot do Oliver, A Estrela" }).click();
  await expect(page.getByRole("heading", { name: "A Estrela" })).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".oliver-tarot-front .oliver-card-art")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("oliver-tarot.png") });
  await page
    .locator(".oliver-tarot-front")
    .screenshot({ path: testInfo.outputPath("oliver-tarot-card.png") });
  await page.getByRole("button", { name: "Voltar à coleção" }).click();
  await page.getByRole("button", { name: "Fechar coleção" }).click();
  await page.getByRole("button", { name: "Voltar às ilhas" }).click();
  await expect(page.getByRole("heading", { name: "Picos dos Padrões" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("helena.soloProgress"))).toBe("4");
});
