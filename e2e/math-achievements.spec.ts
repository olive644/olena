import { expect, test } from "@playwright/test";
import { upgradeMasteryProgress } from "../src/domain/math-mastery-progress";
import { createInitialWorkspace } from "../src/domain/workspace";

for (const theme of ["light", "dark"]) {
  test(`conquistas de papel têm inspeção 3D e aviso real: ${theme}`, async ({ page }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    const collection = page.getByRole("region", { name: "Conquistas de matemática" });
    await expect(collection).toBeVisible();
    await expect(collection.locator(".achievement-tile")).toHaveCount(3);
    await collection.getByRole("button", { name: "Ver todas as conquistas" }).click();
    const gallery = page.getByRole("dialog", { name: "Todas as conquistas", exact: true });
    await expect(gallery.locator(".achievement-tile")).toHaveCount(57);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await gallery.getByRole("button", { name: /Cartógrafo do infinito 6\./ }).click();
    const dialog = page.getByRole("dialog", { name: "Cartógrafo do infinito 6", exact: true });
    await expect(dialog).toBeVisible();
    const stage = dialog.getByRole("button", { name: /Girar conquista/ });
    await stage.focus();
    await page.keyboard.press("ArrowRight");
    await expect(stage.locator(".oliver-inspection-turn")).toHaveCSS("transform", /matrix3d/);
    await page.keyboard.press("Home");
    await expect(dialog.locator(".math-achievement-art").first()).toHaveClass(/is-locked/);
    await dialog.screenshot({
      path: info.outputPath(`conquista-3d-${theme}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(gallery.getByRole("button", { name: /Cartógrafo do infinito 6\./ })).toBeFocused();
    await page.keyboard.press("Escape");
    await page.evaluate(
      (progress) => {
        localStorage.setItem("helena.mathGame.v5", JSON.stringify({ foundations: progress }));
        window.dispatchEvent(new Event("helena:synced-storage-change"));
      },
      { ...upgradeMasteryProgress(), correct: 1 },
    );
    const notice = page.getByRole("complementary", { name: "Nova conquista" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Parabéns! Conquista desbloqueada");
    await notice.screenshot({ path: info.outputPath(`conquista-aviso-${theme}.png`) });
    await notice.getByRole("button", { name: "Inspecionar" }).click();
    await expect(
      page.getByRole("dialog", { name: "Constelação de acertos 1", exact: true }),
    ).toBeVisible();
  });
}

test("galeria compacta, data real, Oliver shiny e card compartilhável", async ({ page }, info) => {
  const workspace = createInitialWorkspace();
  workspace.practiceActivities = [0, 1, 2, 3, 4, 5].map((level) => ({
    id: `math:foundations:round${level}:1:1`,
    islandId: "mathematics:foundations",
    islandName: "Matemática",
    answers: 500,
    correct: 500,
    moduleLevel: level,
    completedAt: `2026-10-${10 + level}T12:00:00Z`,
  }));
  await page.addInitScript((seed) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(seed));
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ name: "Oliver", username: "oliver" }),
    );
  }, workspace);
  await page.goto("/perfil");
  const preview = page.getByRole("region", { name: "Conquistas de matemática" });
  await expect(preview.locator(".achievement-tile")).toHaveCount(3);
  await expect(preview).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await preview.screenshot({ path: info.outputPath("conquistas-perfil.png") });
  await preview.getByRole("button", { name: "Ver todas as conquistas" }).click();
  const gallery = page.getByRole("dialog", { name: "Todas as conquistas", exact: true });
  if (info.project.name === "mobile")
    await expect(gallery.locator(".math-achievement-grid")).toHaveCSS(
      "grid-template-columns",
      /\S+ \S+ \S+$/,
    );
  await gallery.screenshot({ path: info.outputPath("conquistas-galeria.png") });
  await gallery.getByRole("button", { name: /Constelação de acertos 2500\./ }).click();
  const inspection = page.getByRole("dialog", { name: "Constelação de acertos 2500", exact: true });
  await expect(inspection.locator("time")).toHaveAttribute("datetime", "2026-10-14T12:00:00Z");
  await expect(inspection.locator(".achievement-foil").first()).toBeVisible();
  await expect(inspection.locator("image").first()).toHaveAttribute(
    "href",
    "/oliver-math-islands.png",
  );
  await inspection.screenshot({
    path: info.outputPath("conquista-oliver-shiny.png"),
    animations: "disabled",
  });
  await inspection.getByRole("button", { name: "Compartilhar conquista" }).click();
  const card = inspection.getByRole("img", { name: "Card da conquista para compartilhar" });
  await expect(card).toBeVisible();
  await expect
    .poll(() => card.evaluate((node) => (node as HTMLImageElement).naturalWidth))
    .toBe(1080);
  await inspection.screenshot({ path: info.outputPath("conquista-compartilhar.png") });
  const download = page.waitForEvent("download");
  await inspection.getByRole("link", { name: "Salvar imagem" }).click();
  expect((await download).suggestedFilename()).toBe("olena-conquista-correct-2500.png");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false }),
  );
  await inspection.getByRole("button", { name: "Compartilhar", exact: true }).click();
  await expect(inspection.getByRole("alert")).toContainText("Salve o card para enviar");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        document.documentElement.dataset["sharedAchievement"] = data.files?.[0]?.name ?? "";
      },
    });
  });
  await inspection.getByRole("button", { name: "Compartilhar", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-shared-achievement",
    "olena-conquista-correct-2500.png",
  );
  await expect(inspection.getByRole("alert")).toHaveCount(0);
});
