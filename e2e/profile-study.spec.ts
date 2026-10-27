import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

for (const theme of ["light", "dark"]) {
  test(`perfil com XP real, três cartas favoritas e inspeção datada: ${theme}`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    const workspace = createInitialWorkspace();
    const subjectId = workspace.subjects[0]!.id;
    workspace.notebooks = [
      {
        id: "profile-folder",
        kind: "folder",
        title: "Ciências",
        subjectId,
        createdAt: "2026-10-17",
        pageIds: [],
      },
      {
        id: "profile-book",
        title: "Meu laboratório",
        parentId: "profile-folder",
        subjectId,
        createdAt: "2026-10-17",
        pageIds: ["profile-page", "profile-page-2", "profile-page-3"],
      },
    ];
    workspace.notes = [
      {
        id: "profile-page",
        title: "Anotações de hoje",
        content: "Uma ideia que eu quero guardar.",
        subjectId,
        updatedAt: "2026-10-17T12:00:00Z",
        assets: [],
      },
    ];
    workspace.notes.push(
      ...[2, 3].map((number) => ({
        ...workspace.notes[0]!,
        id: `profile-page-${number}`,
        title: `Folha ${number}`,
      })),
    );
    await page.addInitScript(
      ({ workspace, theme }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", theme);
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        localStorage.setItem(
          "helena.room-xp.v1",
          JSON.stringify({ total: 1500, receipts: ["test-xp"] }),
        );
        localStorage.setItem(
          "helena.mathPlaceRewards.v1",
          JSON.stringify({
            foundations: {
              points: 1250,
              receipts: ["test-round"],
              chests: [
                {
                  id: "cards-a",
                  unlockAt: 0,
                  opened: true,
                  cards: ["first-star", "silent-bell"],
                  revealed: 2,
                  revealedAt: [1792497600000, 1792497700000],
                },
                {
                  id: "cards-b",
                  unlockAt: 0,
                  opened: true,
                  cards: ["chalk-map", "glass-seed"],
                  revealed: 2,
                },
              ],
            },
          }),
        );
      },
      { workspace, theme },
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/perfil");
    await expect(page.locator(".profile-level-badge")).toHaveAttribute("aria-label", "Nível 7");
    await expect(
      page.getByRole("progressbar", { name: "XP para o próximo nível" }),
    ).toHaveAttribute("value", "150");
    await expect(
      page.getByRole("progressbar", { name: "XP para o próximo nível" }),
    ).toHaveAttribute("max", "400");
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem("helena.room-xp.v1")!).total),
    ).toBe(1500);
    const xp = await page.locator(".profile-xp").boundingBox();
    const friends = await page
      .getByRole("button", { name: "Adicionar amigo", exact: true })
      .boundingBox();
    expect(xp!.y + xp!.height).toBeLessThanOrEqual(friends!.y);
    const qr = await page
      .getByRole("button", { name: "Compartilhar perfil por QR code" })
      .boundingBox();
    expect(qr!.x).toBeGreaterThanOrEqual(friends!.x + friends!.width);
    await expect(page.getByRole("region", { name: "Conquistas", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meu progresso", exact: true })).toHaveCount(0);
    await expect(page.getByText("O estudo que você já construiu", { exact: true })).toHaveCount(0);
    await expect(page.locator(".profile-islands")).toHaveCount(0);
    const cards = page.getByRole("region", { name: "Cartas do Oliver" });
    await expect(cards.locator(".profile-cards__featured > button")).toHaveCount(3);
    await cards
      .getByRole("button", { name: "Inspecionar carta A primeira estrela", exact: true })
      .click();
    const modal = page.getByRole("dialog");
    await expect(modal.locator("time")).toHaveAttribute(
      "datetime",
      new Date(1792497600000).toISOString(),
    );
    const inspection = modal.getByRole("button", { name: /Inspecionar carta em 360/ });
    await inspection.focus();
    await page.keyboard.press("ArrowRight");
    await expect(modal.locator(".oliver-inspection-turn")).toHaveCSS("transform", /matrix3d/);
    await modal.getByRole("button", { name: "Remover carta dos destaques", exact: true }).click();
    await modal.getByRole("button", { name: "Voltar à coleção", exact: true }).click();
    await expect(modal.locator(".profile-cards__gallery-item")).toHaveCount(11);
    if (info.project.name === "mobile") {
      expect(
        await modal
          .locator(".profile-cards__gallery")
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length),
      ).toBe(3);
    }
    await modal
      .getByRole("button", { name: "Inspecionar carta Semente de vidro", exact: true })
      .click();
    await expect(modal.getByText("Data não registrada", { exact: true })).toBeVisible();
    await expect(modal.getByRole("button", { name: "Fechar", exact: true })).toBeInViewport();
    expect(await modal.evaluate((el) => el.scrollTop)).toBe(0);
    await modal.getByRole("button", { name: "Destacar carta no perfil", exact: true }).click();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("helena.profile.v1")!).cardFavorites,
      ),
    ).toEqual(["silent-bell", "chalk-map", "glass-seed"]);
    await page.screenshot({
      path: info.outputPath("cartas-inspecao-" + theme + ".png"),
      fullPage: false,
      animations: "disabled",
    });
    await modal.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.screenshot({
      path: info.outputPath("perfil-cartas-" + theme + ".png"),
      fullPage: true,
      animations: "disabled",
    });
    const notebook = page.locator(".profile-notebook-widget");
    await expect(notebook).toHaveCount(0);
    await expect(page.getByText("Meu cantinho de ideias", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.goto("/cadernos");
    await expect(page.getByText("Ciências", { exact: true }).first()).toBeVisible();
  });
}
