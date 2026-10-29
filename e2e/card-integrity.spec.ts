import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalog: { id: string; title: string; asset: string; group: string }[] = JSON.parse(
  readFileSync(new URL("../public/arcana/catalog.json", import.meta.url), "utf8"),
);
import { ARCANA_IDS } from "../src/data/arcana-ids";
for (const group of ["major", "wands", "cups", "swords", "pentacles"])
  test(`arcana ${group} rotate as one surface and use only the new artwork`, async ({
    page,
  }, info) => {
    test.setTimeout(90000);
    await page.route("https://tarotapi.dev/**", (r) => r.abort());
    await page.addInitScript((ids) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem(
        "helena.mathPlaceRewards.v1",
        JSON.stringify({
          foundations: {
            points: 7800,
            receipts: ids,
            chests: ids.map((id) => ({ id, opened: true, unlockAt: 0, cards: [id], revealed: 1 })),
          },
        }),
      );
    }, ARCANA_IDS);
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Ver todas as cartas" }).click();
    const label = {
      major: "Arcano maior",
      wands: "Paus · Fogo",
      cups: "Copas · Água",
      swords: "Espadas · Ar",
      pentacles: "Ouros · Terra",
    }[group]!;
    await page.getByRole("button", { name: label, exact: true }).click();
    const entries = catalog.filter((card) => card.group === group);
    await expect(page.locator(".profile-cards__gallery-item")).toHaveCount(entries.length);
    for (const card of entries) {
      const dialog = page.getByRole("dialog");
      await dialog
        .locator(".profile-cards__gallery-item")
        .getByRole("button", { name: `Inspecionar carta ${card.title}`, exact: true })
        .click();
      const stage = page.getByRole("button", { name: /Inspecionar carta em 360/ });
      await stage.focus();
      await stage.press("ArrowRight");
      await expect(page.locator(".oliver-inspection-turn")).toHaveAttribute(
        "style",
        /rotateY\(25deg\)/,
      );
      const image = page.locator(".oliver-inspection-front img");
      await expect(image).toHaveAttribute("src", card.asset);
      await expect
        .poll(() => image.evaluate((i) => (i as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      await expect(image).toHaveAttribute("draggable", "false");
      const frame = (await page.locator(".oliver-inspection-front .arcana-paper").boundingBox())!;
      const title = (await page
        .locator(".oliver-inspection-front .arcana-paper__title .paper-card-title")
        .boundingBox())!;
      expect(title.x).toBeGreaterThanOrEqual(frame.x);
      expect(title.x + title.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
      await page.getByRole("button", { name: "Voltar à coleção", exact: true }).click();
    }
    await page.screenshot({ path: info.outputPath("arcano-gallery.png") });
  });
