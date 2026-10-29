import { test, expect } from "@playwright/test";
for (const theme of ["light", "dark"])
  test(`Arcano migration, earned highlights, real drag and responsive interpretation: ${theme}`, async ({
    page,
  }, info) => {
    await page.route("https://tarotapi.dev/**", (route) => route.abort());
    await page.addInitScript((theme) => {
      localStorage.setItem("helenastudy.theme", theme);
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem(
        "helena.profile.v1",
        JSON.stringify({ name: "Ana", cardFavorites: ["oliver-star-tarot"] }),
      );
      localStorage.setItem(
        "helena.mathPlaceRewards.v1",
        JSON.stringify({
          foundations: {
            points: 1000,
            receipts: ["old", "star", "new"],
            chests: [
              {
                id: "old",
                opened: true,
                unlockAt: 0,
                cards: ["first-star", "silent-bell"],
                revealed: 2,
              },
              {
                id: "star",
                opened: true,
                unlockAt: 0,
                kind: "arcane",
                arcana: "oliver-star-tarot",
                revealed: 1,
                revealedAt: [1792497600000],
              },
              {
                id: "new",
                opened: true,
                unlockAt: 0,
                cards: ["major-00", "major-01"],
                revealed: 2,
              },
            ],
          },
        }),
      );
    }, theme);
    await page.goto("/perfil");
    const region = page.getByRole("region", { name: "Arcano", exact: true });
    await expect(region.locator(".profile-cards__count")).toHaveText("3/78");
    await expect(
      region.getByRole("button", { name: "Inspecionar carta A Estrela" }).locator("img"),
    ).toHaveAttribute("src", "/arcana/ink/major-17-small.webp");
    await expect(region.locator("header button img")).toHaveCSS("width", "32px");
    await region.getByRole("button", { name: "Ver todas as cartas" }).click();
    const dialog = page.getByRole("dialog", { name: "Arcano", exact: true });
    await expect(dialog.locator(".profile-cards__gallery-item")).toHaveCount(78);
    const source = dialog
      .locator(".profile-cards__gallery-item")
      .filter({ has: page.getByRole("button", { name: "Inspecionar carta O Louco", exact: true }) })
      .locator(".arcana-favorite-handle");
    await expect(source).toHaveCSS("touch-action", "none");
    await source.scrollIntoViewIfNeeded();
    const from = (await source.boundingBox())!,
      to = (await dialog.locator('[data-arcana-slot="1"]').boundingBox())!;
    if (info.project.name === "mobile") {
      const input = await page.context().newCDPSession(page);
      await input.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: from.x + 22, y: from.y + 22 }],
      });
      for (let i = 1; i <= 12; i++)
        await input.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: from.x + 22 + ((to.x + to.width / 2 - (from.x + 22)) * i) / 12,
              y: from.y + 22 + ((to.y + to.height / 2 - (from.y + 22)) * i) / 12,
            },
          ],
        });
      await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await input.detach();
    } else {
      await page.mouse.move(from.x + 22, from.y + 22);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
      await page.mouse.up();
    }
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("helena.profile.v1")!).cardFavorites),
      )
      .toEqual(["major-17", "major-00"]);
    await dialog.evaluate((node) => {
      node.scrollTop = 0;
    });
    await dialog.screenshot({
      path: info.outputPath(`arcano-gallery-${theme}.png`),
      animations: "disabled",
    });
    await dialog.getByRole("button", { name: "Arcano maior", exact: true }).click();
    await expect(dialog.locator(".profile-cards__gallery-item")).toHaveCount(22);
    await dialog
      .locator(".profile-cards__gallery-item")
      .getByRole("button", { name: "Inspecionar carta A Estrela", exact: true })
      .click();
    await expect(page.locator(".arcana-interpretation")).toContainText("Esperança e renovação");
    await expect(page.locator(".arcana-interpretation")).toContainText("Significado");
    await expect(page.locator("time")).toHaveAttribute(
      "datetime",
      new Date(1792497600000).toISOString(),
    );
    const card = (await page.locator(".oliver-inspection").boundingBox())!,
      text = (await page.locator(".arcana-interpretation").boundingBox())!;
    if (info.project.name === "mobile") expect(text.y).toBeGreaterThan(card.y + card.height - 1);
    else expect(text.x).toBeGreaterThan(card.x + card.width - 1);
    await page.screenshot({
      path: info.outputPath(`arcano-inspection-${theme}.png`),
      animations: "disabled",
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
