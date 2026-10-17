import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

for (const theme of ["light", "dark"]) {
  test(`perfil com XP real, ilha favorita, partes e caderno na pasta: ${theme}`, async ({
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
        pageIds: ["profile-page"],
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
    await page.addInitScript(
      ({ workspace, theme }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", theme);
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        localStorage.setItem(
          "helena.mathPlaceRewards.v1",
          JSON.stringify({ foundations: { points: 1250, receipts: ["test-round"], chests: [] } }),
        );
      },
      { workspace, theme },
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/perfil");
    await expect(page.locator(".profile-level-badge")).toHaveAttribute("aria-label", "Nível 3");
    await expect(
      page.getByRole("progressbar", { name: "XP para o próximo nível" }),
    ).toHaveAttribute("value", "250");
    const xp = await page.locator(".profile-xp").boundingBox();
    const friends = await page
      .getByRole("button", { name: "Adicionar amigo", exact: true })
      .boundingBox();
    expect(xp!.y + xp!.height).toBeLessThanOrEqual(friends!.y);
    await expect(page.getByRole("heading", { name: "Meu progresso", exact: true })).toBeVisible();
    await expect(page.getByText("O estudo que você já construiu", { exact: true })).toHaveCount(0);
    const islands = page.locator(".profile-islands");
    await expect(islands.locator(".profile-points-total")).toContainText("1250");
    await islands.getByRole("button", { name: "Favoritar", exact: true }).click();
    await expect(islands.getByRole("button", { name: "Favorita", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("helena.profile.v1")!).favoriteIsland,
      ),
    ).toBe("mathematics");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator(".profile-chrome")).toHaveAttribute("data-compact", "false");
    await page.screenshot({
      path: info.outputPath(`perfil-estudos-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await islands.getByRole("button", { name: "Explorar ilha", exact: true }).click();
    await expect(islands.locator(".profile-island-part")).toHaveCount(6);
    await expect(islands.locator(".profile-island-part").nth(1)).toBeDisabled();
    await islands.locator(".profile-island-part").first().click();
    await expect(page.getByRole("region", { name: "Ilhas de Matemática" })).toBeVisible();
    await page
      .getByRole("region", { name: "Ilhas de Matemática" })
      .getByRole("button", { name: "Voltar às ilhas", exact: true })
      .click();
    await expect(page.getByRole("region", { name: "Ilhas de Matemática" })).toHaveCount(0);
    const notebook = page.locator(".profile-notebook-widget");
    await expect(notebook.locator(".profile-notebook-trail")).toContainText("Ciências");
    await expect(notebook.locator(".profile-notebook-page")).toContainText("Anotações de hoje");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await notebook.getByRole("link", { name: "Continuar aqui", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Meu laboratório", exact: true })).toBeVisible();
  });
}
