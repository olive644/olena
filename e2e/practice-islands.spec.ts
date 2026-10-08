import { test, expect } from "@playwright/test";

test("foto do perfil acompanha a entrada até o nível atual", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.soloProgress", "3");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({
        name: "Poliana",
        photoUrl: "/profile-avatars/poliana.webp",
      }),
    );
  });
  await page.goto("/aprender");
  const portrait = page.getByAltText("Sua foto sobre a ilha");
  await expect(portrait).toHaveAttribute("src", "/profile-avatars/poliana.webp");
  await expect
    .poll(() =>
      page
        .locator(".is-current .solo-island-art")
        .evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.locator(".solo-traveler")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("foto-na-ilha.png") });
  await page.getByRole("button", { name: "Entrar no mundo", exact: true }).click();
  const flight = page.locator(".practice-avatar-flight");
  await expect(flight).toBeVisible();
  await flight.evaluate((element) => element.getAnimations()[0]!.pause());
  const alignment = await flight.evaluate((element) => {
    const animation = element.getAnimations()[0]!;
    animation.currentTime = 950;
    const from = element.getBoundingClientRect();
    const to = document.querySelector(".solo-path-avatar")!.getBoundingClientRect();
    const difference =
      Math.abs(from.x - to.x) + Math.abs(from.y - to.y) + Math.abs(from.width - to.width);
    animation.play();
    return difference;
  });
  expect(alignment).toBeLessThan(2);
  await expect(flight).toHaveCount(0);
  await expect(page.getByAltText("Sua foto no nível 3")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("foto-no-nivel.png") });
  await page.getByRole("button", { name: "Voltar aos mundos", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Entrar no mundo", exact: true }).click();
  await expect(page.getByAltText("Sua foto no nível 3")).toBeVisible();
  await expect(flight).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar aos mundos", exact: true }).click();
  await page.evaluate(() => {
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({
        name: "Oliver",
        photoUrl: "/profile-avatars/oliver.webp",
      }),
    );
    window.dispatchEvent(new Event("helena:synced-storage-applied"));
  });
  await expect(portrait).toHaveAttribute("src", "/profile-avatars/oliver.webp");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Entrar no mundo", exact: true }).click();
  await expect(flight).toBeVisible();
  await page.getByRole("button", { name: "Voltar aos mundos", exact: true }).click();
  await expect(flight).toHaveCount(0);
  await expect(portrait).toBeVisible();
});

test("navega com gesto de toque real sem entrar na ilha", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium" || testInfo.project.name !== "mobile",
    "Prova nativa de toque via Chromium",
  );
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/aprender");
  const stage = page.locator(".practice-carousel-stage");
  const box = (await stage.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const y = box.y + box.height * 0.85;
  const x = box.x + box.width * 0.72;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - step * 12, y }],
    });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByRole("heading", { name: "Vale das Histórias" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explorar ilha" })).toBeVisible();
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 65, y }],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(page.getByRole("heading", { name: "Vale das Histórias" })).toBeVisible();
  await expect(stage).not.toHaveClass(/is-dragging/);
  await session.detach();
});

for (const theme of ["light", "dark"])
  test(`carrossel de ilhas por setas, arraste e teclado, ${theme}`, async ({ page }, testInfo) => {
    const islandRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/practice-islands/")) islandRequests.push(request.url());
    });
    await page.addInitScript((value) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", value);
    }, theme);
    await page.goto("/aprender");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const carousel = page.getByRole("region", { name: "Ilhas de estudo" });
    const stage = page.locator(".practice-carousel-stage");
    const current = page.locator(".is-current .solo-island-art");
    await expect(page.getByRole("navigation", { name: "Ilhas de estudo" })).toHaveCount(0);
    await expect(page.getByText("Pratique para lembrar.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Ilhas do conhecimento", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.locator(".study-panel")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.getByRole("button", { name: "Mundo anterior" })).toBeDisabled();
    await expect(page.locator(".practice-carousel-arrow svg").first()).toHaveClass(
      "focus-paper-arrow",
    );
    const preview = page.locator(".is-preview").first();
    await expect(preview).toHaveCSS("opacity", "0.38");
    await current.evaluate(async (img: HTMLImageElement) => img.decode());
    await preview.locator("img").evaluate(async (img: HTMLImageElement) => img.decode());
    expect(islandRequests.every((url) => /languages|portuguese/.test(url))).toBe(true);
    expect(islandRequests.length).toBeLessThanOrEqual(2);
    const enterBox = await page.getByRole("button", { name: "Entrar no mundo" }).boundingBox();
    expect(enterBox!.y + enterBox!.height).toBeLessThanOrEqual(
      testInfo.project.use.viewport!.height,
    );
    const activeBox = await current.boundingBox();
    const previewBox = await preview.boundingBox();
    expect(previewBox!.width).toBeLessThan(activeBox!.width);
    expect(previewBox!.y).toBeLessThan(activeBox!.y);
    await page.screenshot({
      path: testInfo.outputPath(`primeira-ilha-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
    for (const [position, [subject, title]] of (
      [
        ["Idiomas", "Porto das Vozes"],
        ["Português", "Vale das Histórias"],
        ["Química", "Ilhas dos Elementos"],
        ["Biologia", "Jardim da Vida"],
        ["Matemática", "Picos dos Padrões"],
        ["Programação", "Oficina do Código"],
      ] as const
    ).entries()) {
      if (position > 0) await page.getByRole("button", { name: "Próximo mundo" }).click();
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(current).toHaveAttribute("alt", new RegExp(subject));
      await current.evaluate(async (img: HTMLImageElement) => img.decode());
      const box = await current.boundingBox();
      expect(box!.width).toBeLessThanOrEqual(testInfo.project.use.viewport!.width);
      await expect(current).toHaveAttribute("srcset", /480w, .*800w/);
      if (position === 1)
        await page.screenshot({
          path: testInfo.outputPath(`tres-ilhas-${theme}.png`),
          fullPage: true,
          animations: "disabled",
        });
      if (position > 0) {
        await page.getByRole("button", { name: "Explorar ilha" }).click();
        await expect(page.getByText(/Os exercícios desta ilha chegam depois/)).toBeVisible();
        await expect(
          page.getByRole("img", { name: `Ilha de ${subject} em papel recortado` }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Voltar aos mundos" }).click();
      }
    }
    await expect(page.getByRole("button", { name: "Próximo mundo" })).toBeDisabled();
    await carousel.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("heading", { name: "Picos dos Padrões" })).toBeVisible();
    const dragBox = await stage.boundingBox();
    const x = dragBox!.x + dragBox!.width * 0.3;
    const y = dragBox!.y + dragBox!.height * 0.85;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 90, y, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByRole("heading", { name: "Jardim da Vida" })).toBeVisible();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 5, y - 90, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByRole("heading", { name: "Jardim da Vida" })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const duration = await page
      .locator(".practice-carousel-island")
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration));
    expect(duration).toBeLessThanOrEqual(0.001);
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Mundo anterior" }).click();
    await page.getByRole("button", { name: "Entrar no mundo" }).click();
    await expect(page.getByRole("button", { name: /Nível 1: Escuta/ })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
  });
