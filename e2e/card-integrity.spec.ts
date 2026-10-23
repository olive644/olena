import { test, expect } from "@playwright/test";
import { OLIVER_CARDS } from "../src/data/oliver-cards";

test("all Oliver cards rotate as one surface without dragging art or selecting lore", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const ids = [...OLIVER_CARDS.map((card) => card.id), "oliver-star-tarot"];
  await page.addInitScript((cards) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem(
      "helena.mathPlaceRewards.v1",
      JSON.stringify({
        foundations: {
          points: 1100,
          receipts: cards,
          chests: cards.map((id, index) => ({
            id,
            opened: true,
            unlockAt: 0,
            revealed: index === 0 ? 0 : 1,
            ...(id === "oliver-star-tarot" ? { kind: "arcane", arcana: id } : { cards: [id] }),
          })),
        },
      }),
    );
  }, ids);
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Entrar em Picos dos Padrões" }).click();
  await expect(page.getByRole("button", { name: "Cartas do Oliver", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar Poeira cósmica" }).click();
  for (let i = 1; i <= 4; i++)
    await page.getByRole("button", { name: `Revelar raridade, toque ${i} de 4` }).click();
  await page.getByRole("button", { name: "Revelar carta", exact: true }).click();
  await page.getByRole("button", { name: "Guardar cartas" }).click();
  await expect(page.getByRole("dialog", { name: "Coleção do Oliver" })).toBeVisible();
  const labels = [
    ...OLIVER_CARDS.map((card) => `${card.title}, 1 cópias`),
    "Ver tarot do Oliver, A Estrela",
  ];
  for (const label of labels) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const stage = page.locator(".oliver-inspection-stage");
    await stage.scrollIntoViewIfNeeded();
    const art = page.locator(".oliver-inspection-front img");
    await expect(art).toHaveAttribute("draggable", "false");
    const lore = page.locator(".oliver-inspection-front .oliver-card-lore");
    // WebKit exposes its selection rule through the prefixed property.
    await expect
      .poll(() =>
        lore.evaluate((element) => {
          const style = getComputedStyle(element);
          return [style.userSelect, style.getPropertyValue("-webkit-user-select")];
        }),
      )
      .toContain("none");
    expect(
      await art.evaluate((image) =>
        image.dispatchEvent(new Event("dragstart", { bubbles: true, cancelable: true })),
      ),
    ).toBe(false);
    const box = (await stage.boundingBox())!;
    await page.mouse.move(box.x + 70, box.y + 160);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + 185, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator(".oliver-inspection-turn")).toHaveAttribute(
      "style",
      /rotateY\(81deg\)/,
    );
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
    await page.getByRole("button", { name: "Recentralizar carta" }).click();
    if (label.startsWith("Ver tarot"))
      await stage.screenshot({ path: info.outputPath("embedded-tarot.png") });
    await page.getByRole("button", { name: "Voltar à coleção" }).click();
  }
});
