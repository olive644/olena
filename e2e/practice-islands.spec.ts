import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"])
  test(`seis ilhas de papel navegáveis, ${theme}`, async ({ page }, testInfo) => {
    await page.addInitScript((value) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", value);
    }, theme);
    await page.goto("/aprender");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const navigation = page.getByRole("navigation", { name: "Ilhas de estudo" });
    await expect(navigation.getByRole("button")).toHaveCount(6);
    for (const [title, islandName] of [
      ["Idiomas", "Porto das Vozes"],
      ["Português", "Vale das Histórias"],
      ["Química", "Ilhas dos Elementos"],
      ["Biologia", "Jardim da Vida"],
      ["Matemática", "Picos dos Padrões"],
      ["Programação", "Oficina do Código"],
    ] as const) {
      await navigation.getByRole("button", { name: title, exact: true }).click();
      await expect(page.getByRole("heading", { name: islandName, exact: true })).toBeVisible();
      const art = page.locator(".solo-island-art");
      await expect(art).toHaveAttribute("alt", new RegExp(title));
      await art.evaluate(async (img: HTMLImageElement) => img.decode());
      const box = await art.boundingBox();
      expect(box!.width).toBeLessThanOrEqual(testInfo.project.use.viewport!.width);
      await page.locator(".solo-islands").screenshot({
        path: testInfo.outputPath(`ilha-${title}-${theme}.png`),
        animations: "disabled",
      });
      if (title !== "Idiomas") {
        await page.getByRole("button", { name: "Explorar ilha" }).click();
        await expect(page.getByText(/Os exercícios desta ilha chegam depois/)).toBeVisible();
        await expect(
          page.getByRole("img", { name: `Ilha de ${title} em papel recortado` }),
        ).toBeVisible();
        if (title === "Programação") {
          for (const topic of ["Python", "JavaScript", "HTML", "CSS"])
            await expect(page.getByText(topic, { exact: true })).toBeVisible();
          await page.screenshot({
            path: testInfo.outputPath(`programacao-${theme}.png`),
            fullPage: true,
            animations: "disabled",
          });
        }
        await page.getByRole("button", { name: "Voltar aos mundos" }).click();
      }
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    expect(overflow).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`ilhas-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await navigation.getByRole("button", { name: "Idiomas", exact: true }).click();
    await page.getByRole("button", { name: "Entrar no mundo" }).click();
    await expect(page.getByRole("button", { name: /Nível 1: Escuta/ })).toBeEnabled();
  });
