import { expect, test } from "@playwright/test";

test("Helena appears in the real app, keeps history between tabs and stays above mobile navigation", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/aprender");
  const launcher = page.getByRole("button", { name: "Conversar com Helena" });
  await expect(launcher).toBeVisible();
  await expect(page.locator(".loading-view")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".helena-chat--application")).toHaveCount(1);
  if (testInfo.project.name === "mobile") {
    const star = (await launcher.boundingBox())!;
    const navigation = (await page.locator(".mobile-nav").boundingBox())!;
    expect(star.y + star.height).toBeLessThan(navigation.y);
  }
  await page.screenshot({ path: testInfo.outputPath("helena-in-app.png") });
  await launcher.click();
  const dialog = page.getByRole("dialog", { name: "Helena" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Preview", { exact: true })).toHaveCount(0);
  await dialog.getByRole("textbox").fill("Quero revisar matemática");
  await dialog.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(dialog.getByText(/Uma revisão curta/)).toBeVisible();
  await dialog.getByRole("button", { name: "Recolher conversa", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const navigation = page.getByRole("navigation", {
    name: testInfo.project.name === "mobile" ? "Navegação móvel" : "Navegação principal",
    exact: true,
  });
  await navigation.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page).toHaveURL(/\/planejador/);
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(dialog.getByText("Quero revisar matemática", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Recolher conversa", exact: true }).click();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
    await expect(launcher).toBeHidden();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: "Fechar menu" })
      .click();
    await expect(launcher).toBeVisible();
  }
});

test("does not overlay onboarding", async ({ page }) => {
  await page.goto("/?onboarding=1&login=1");
  await expect(page.getByRole("button", { name: "Conversar com Helena" })).toHaveCount(0);
});

test("does not overlay the classroom projector", async ({ page }) => {
  await page.goto("/sala/ABCDE/projetor");
  await expect(page.getByRole("button", { name: "Conversar com Helena" })).toHaveCount(0);
});
