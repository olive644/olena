import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`trilhas das cinco disciplinas preservam perfil e progresso, ${theme}`, async ({
    page,
  }, testInfo) => {
    // Five decoded scenes and twenty real avatar transitions share this scenario.
    test.setTimeout(60_000);
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.soloProgress", "4");
      localStorage.setItem(
        "helena.profile.v1",
        JSON.stringify({ name: "Aluno", photoUrl: "/profile-avatars/oliver.webp" }),
      );
      localStorage.setItem("helenastudy.theme", appearance);
    }, theme);
    await page.goto("/aprender");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const subjects = ["Português", "Química", "Biologia", "Matemática", "Programação"];
    for (const [index, subject] of subjects.entries()) {
      await page.getByRole("button", { name: "Próximo mundo" }).click();
      if (index === 4) await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByRole("button", { name: "Explorar ilha" }).click();
      const trail = page.getByRole("region", { name: `Trilha de ${subject}` });
      await expect(trail).toBeVisible();
      const viewport = page.viewportSize()!;
      await expect
        .poll(async () => {
          const rect = (await trail.boundingBox())!;
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        })
        .toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
      await trail
        .locator(".solo-level-scenery__art")
        .evaluate(async (image: HTMLImageElement) => image.decode());
      await expect(page.locator(".practice-avatar-flight")).toHaveCount(0);
      const photo = trail.getByAltText("Sua foto no nível 1");
      await expect(photo).toHaveAttribute("src", "/profile-avatars/oliver.webp");
      const original = (await photo.elementHandle())!;
      const stages = trail.getByRole("button", { name: /^Etapa/ });
      await expect(stages).toHaveCount(4);
      for (let stage = 0; stage < 4; stage++) {
        await expect(stages.nth(stage).locator(".solo-path-level__badge b")).toHaveText(
          String(stage + 1),
        );
        const center = await stages
          .nth(stage)
          .locator(".solo-path-level__badge")
          .evaluate((element) => {
            const badge = element.getBoundingClientRect();
            const number = element.querySelector("b")!.getBoundingClientRect();
            return {
              x: Math.abs(number.x + number.width / 2 - (badge.x + badge.width / 2)),
              y: Math.abs(number.y + number.height / 2 - (badge.y + badge.height * 0.46)),
            };
          });
        expect(center.x).toBeLessThan(1);
        expect(center.y).toBeLessThan(1);
        await stages.nth(stage).click();
        await expect(trail.getByRole("button", { name: "Voltar aos mundos" })).toBeInViewport();
        if (subject === "Matemática" && viewport.width < 900) {
          await expect
            .poll(async () => {
              const badge = (await stages
                .nth(stage)
                .locator(".solo-path-level__badge")
                .boundingBox())!;
              const header = (await trail.locator(".practice-trail-heading").boundingBox())!;
              return (
                badge.y >= header.y + header.height - 1 && badge.y + badge.height <= viewport.height
              );
            })
            .toBe(true);
        }
        await expect(stages.nth(stage)).toHaveAttribute("aria-pressed", "true");
        const portrait = trail.getByAltText(`Sua foto no nível ${stage + 1}`);
        await expect(portrait).toHaveAttribute("src", "/profile-avatars/oliver.webp");
        expect(await original.evaluate((element) => element.isConnected)).toBe(true);
        await expect
          .poll(() =>
            trail
              .locator(".practice-trail-traveler")
              .evaluate(
                (element) =>
                  element.getAnimations().filter((animation) => animation.playState === "running")
                    .length,
              ),
          )
          .toBe(0);
      }
      await expect(trail.locator(".practice-trail-detail")).toContainText(
        "Exercícios em preparação",
      );
      if (subject === "Matemática") {
        await expect(trail.locator(".practice-trail-walkway")).toHaveCount(0);
        await expect
          .poll(() =>
            trail.evaluate((element) => {
              const art = element.querySelector(".solo-level-scenery")!.getBoundingClientRect();
              const overlay = element.querySelector(".solo-level-track")!.getBoundingClientRect();
              return Math.max(
                Math.abs(art.x - overlay.x),
                Math.abs(art.y - overlay.y),
                Math.abs(art.width - overlay.width),
                Math.abs(art.height - overlay.height),
              );
            }),
          )
          .toBeLessThan(1);
        await expect(trail.locator(".practice-trail-detail")).toContainText("Mirante dos dados");
        await page.screenshot({ path: testInfo.outputPath(`trilha-matematica-${theme}.png`) });
      }
      expect(
        await trail.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true);
      expect(await page.evaluate(() => localStorage.getItem("helena.soloProgress"))).toBe("4");
      await trail.getByRole("button", { name: "Voltar aos mundos" }).click();
      await expect(page.getByRole("region", { name: "Ilhas de estudo" })).toBeVisible();
      await expect(page.locator(".practice-avatar-flight")).toHaveCount(0);
    }
  });
}

test("avatar desliza entre ilhas sem remontar e acompanha o arraste", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/aprender");
  const avatar = page.locator(".practice-island-avatar");
  await expect(avatar).toBeVisible();
  const original = (await avatar.elementHandle())!;
  await page.getByRole("button", { name: "Próximo mundo" }).click();
  expect(
    await original.evaluate(
      (element) => element === document.querySelector(".practice-island-avatar"),
    ),
  ).toBe(true);
  const movement = await avatar.evaluate((element) => {
    const animations = element.getAnimations();
    const measure = () => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y };
    };
    animations.forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    const start = measure();
    animations.forEach((animation) => (animation.currentTime = 275));
    const middle = measure();
    animations.forEach((animation) => (animation.currentTime = 550));
    const end = measure();
    animations.forEach((animation) => animation.play());
    return { count: animations.length, start, middle, end };
  });
  expect(movement.count).toBeGreaterThan(0);
  expect(movement.middle.y).toBeGreaterThan(Math.min(movement.start.y, movement.end.y));
  expect(movement.middle.y).toBeLessThan(Math.max(movement.start.y, movement.end.y));
  await expect.poll(() => avatar.evaluate((element) => element.getAnimations().length)).toBe(0);

  const stage = page.locator(".practice-carousel-stage");
  const box = (await stage.boundingBox())!;
  const before = (await avatar.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.85);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height * 0.85, { steps: 5 });
  await expect.poll(async () => (await avatar.boundingBox())!.x).toBeLessThan(before.x - 65);
  await page.mouse.up();
  await expect(page.getByAltText("Mundo 3: Química")).toBeVisible();
  expect(
    await original.evaluate(
      (element) => element === document.querySelector(".practice-island-avatar"),
    ),
  ).toBe(true);
  await expect(avatar.locator(".practice-user-portrait")).toHaveCount(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Próximo mundo" }).click();
  expect(
    await avatar.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration)),
  ).toBeLessThanOrEqual(0.01);
  await expect(page.getByAltText("Mundo 4: Biologia")).toBeVisible();
});

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
        const trail = page.getByRole("region", { name: `Trilha de ${subject}` });
        await expect(trail).toBeVisible();
        await expect(trail.getByRole("button", { name: /^Etapa/ })).toHaveCount(4);
        await expect(trail.getByText("Exercícios em preparação")).toBeAttached();
        await trail
          .locator(".solo-level-scenery__art")
          .evaluate(async (img: HTMLImageElement) => img.decode());
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
