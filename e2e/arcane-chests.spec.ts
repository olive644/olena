import { test, expect } from "@playwright/test";

test("legacy rewards become one cosmic dust, reveal saved rarity and inspect naturally", async ({
  page,
}, info) => {
  await page.clock.install();
  await page.addInitScript(() => {
    if (window !== window.top) return;
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    if (sessionStorage.getItem("dust-seeded")) return;
    localStorage.setItem(
      "helena.mathPlaceRewards.v1",
      JSON.stringify({
        foundations: {
          points: 200,
          receipts: ["common", "arcane"],
          rounds: { common: 100, arcane: 100 },
          chests: [
            { id: "common", unlockAt: 0, opened: true, cards: ["first-star"], revealed: 0 },
            {
              id: "arcane",
              unlockAt: Date.now() + 60_000,
              opened: false,
              kind: "arcane",
              arcana: "oliver-star-tarot",
            },
          ],
        },
      }),
    );
    sessionStorage.setItem("dust-seeded", "1");
  });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await expect(page.getByLabel("Espaço de Poeira cósmica vazio")).toBeVisible();
  const timer = page.getByRole("progressbar", { name: "Preparando Poeira cósmica" });
  await expect(timer).toHaveAttribute("max", "10");
  await page.clock.fastForward(11_000);
  await page.getByRole("button", { name: "Abrir Poeira cósmica", exact: true }).click();
  await page.clock.fastForward(600);
  const dialog = page.getByRole("dialog", { name: "Poeira cósmica", exact: true });
  for (let i = 1; i <= 4; i++)
    await page.getByRole("button", { name: `Revelar raridade, toque ${i} de 4` }).click();
  await expect(dialog).toHaveAttribute("data-rarity", "Lendária");
  await expect(dialog).toHaveCSS("background-color", "rgb(89, 66, 10)");
  await page.screenshot({ path: info.outputPath("cosmic-legendary.png") });
  await page.clock.fastForward(1000);
  await page.getByRole("button", { name: "Revelar carta", exact: true }).click();
  const inspect = page.getByRole("button", { name: /Inspecionar carta em 360/ });
  await expect(inspect).toBeVisible();
  await expect(page.getByRole("button", { name: "Inspecionar carta em 3D" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "A Estrela" })).toBeVisible();
  await inspect.focus();
  for (let i = 0; i < 16; i++) await inspect.press("ArrowRight");
  await expect(page.locator(".oliver-inspection-turn")).toHaveAttribute(
    "style",
    /rotateY\(400deg\)/,
  );
  await inspect.press("Home");
  await page.getByRole("button", { name: "Fechar cartas" }).click();
  await expect(dialog).toHaveClass(/is-departing/);
  await expect(page.locator(".oliver-store-flight")).toHaveCount(0);
  await page.clock.fastForward(1000);
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Coleção do Oliver" })).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar Poeira cósmica" }).click();
  for (let i = 1; i <= 4; i++)
    await page.getByRole("button", { name: `Revelar raridade, toque ${i} de 4` }).click();
  await expect(dialog).toHaveAttribute("data-rarity", "Comum");
  await expect(dialog).toHaveCSS("background-color", "rgb(23, 75, 59)");
  await page.clock.fastForward(1000);
  await page.getByRole("button", { name: "Revelar carta", exact: true }).click();
  await page.clock.fastForward(700);
  await expect(page.locator(".oliver-inspection.is-inline")).toHaveCSS(
    "transform",
    /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/,
  );
  await expect(page.getByLabel("Raridade comum")).toBeVisible();
  await page.screenshot({ path: info.outputPath("cosmic-common-card.png") });
  const box = (await inspect.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + 120, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".oliver-inspection-turn")).not.toHaveAttribute(
    "style",
    /rotateY\(0deg\)/,
  );
  await page.getByRole("button", { name: "Guardar cartas" }).click();
  await expect(page.locator(".oliver-store-flight > div")).toHaveCount(1);
  await page.clock.fastForward(1000);
  await expect(page.getByRole("dialog", { name: "Coleção do Oliver" })).toBeVisible();
  await expect(page.getByText("1 cópia · Lendária")).toBeVisible();
  await page.getByRole("button", { name: "Fechar coleção" }).click();
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("helena.mathPlaceRewards.v1")!),
  );
  expect(saved.foundations.points).toBe(200);
  expect(saved.foundations.chests.map((c: { revealed: number }) => c.revealed)).toEqual([1, 1]);
});
