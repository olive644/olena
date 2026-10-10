import { test, expect } from "@playwright/test";

test("arcane chest shares the minute, reveals by dragging and inspects foil tarot", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem(
      "helena.mathPlaceRewards.v1",
      JSON.stringify({
        foundations: {
          points: 200,
          receipts: ["common", "arcane"],
          rounds: { common: 100, arcane: 100 },
          chests: [
            { id: "common", unlockAt: null, opened: false },
            {
              id: "arcane",
              unlockAt: null,
              opened: false,
              kind: "arcane",
              arcana: "oliver-star-tarot",
            },
          ],
        },
      }),
    );
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await expect(page.getByLabel("Espaço de baú vazio")).toBeVisible();
  await expect(page.getByRole("button", { name: "Destrancar baú arcano" })).toBeVisible();
  await expect(page.locator(".math-journey")).toHaveClass(/is-map/);
  const island = (await page.locator(".math-journey-island.is-current").boundingBox())!;
  const viewport = page.viewportSize()!;
  const originalSize =
    viewport.width <= 600
      ? Math.min(viewport.width * 0.75, viewport.height * 0.48, viewport.height - 324)
      : Math.min(440, viewport.width * 0.64, viewport.height * 0.56, viewport.height - 356);
  expect(Math.abs(island.width - originalSize)).toBeLessThan(1);
  await page.clock.install();
  await page.getByRole("button", { name: "Destrancar baú arcano" }).click();
  await page.clock.fastForward(30_000);
  const bar = page.getByRole("progressbar", { name: "Destrancando baú" });
  await expect(bar).toBeVisible();
  await expect.poll(() => bar.getAttribute("value").then(Number)).toBeGreaterThanOrEqual(30);
  const label = await page.locator(".is-unlocking .math-chest-label").boundingBox();
  const progress = await bar.boundingBox();
  expect(progress!.y).toBeGreaterThanOrEqual(label!.y + label!.height);
  const dock = (await page.locator(".math-chest-dock").boundingBox())!;
  const caption = (await page.locator(".math-journey-label").boundingBox())!;
  expect(dock.y + dock.height + 4).toBeLessThanOrEqual(caption.y);
  await page.screenshot({ path: info.outputPath("chests-waiting.png") });
  await page.clock.fastForward(31_000);
  await expect(bar).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir baú arcano" }).click();
  await page.clock.fastForward(600);
  await expect(page.getByRole("dialog", { name: "Carta do baú arcano" })).toBeVisible();
  const card = page.getByRole("button", { name: "Revelar carta", exact: true });
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  if (info.project.name === "mobile") {
    await page.touchscreen.tap(box.x + 30, box.y + 100);
  } else {
    await page.mouse.move(box.x + 30, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 105, { steps: 6 });
    await page.mouse.up();
  }
  await page.clock.fastForward(1000);
  await expect(page.getByRole("heading", { name: "A Estrela" })).toBeVisible();
  await page.getByRole("button", { name: "Inspecionar carta em 3D" }).click();
  await expect
    .poll(() =>
      page
        .locator(".oliver-tarot-front .oliver-card-art")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.locator(".oliver-tarot-front").screenshot({ path: info.outputPath("tarot-foil.png") });
  const inspect = page.getByRole("button", { name: /Inspecionar carta em 360/ });
  await inspect.focus();
  for (let i = 0; i < 16; i++) await inspect.press("ArrowRight");
  await expect(page.locator(".oliver-inspection-turn")).toHaveAttribute(
    "style",
    /rotateY\(400deg\)/,
  );
  await page.getByRole("button", { name: "Voltar à carta" }).click();
  await page.getByRole("button", { name: "Guardar cartas" }).click();
  await page.clock.fastForward(1000);
  await expect(page.getByRole("dialog", { name: "Coleção do Oliver" })).toBeVisible();
  await expect(page.getByText("1 cópia · Baú arcano")).toBeVisible();
});
