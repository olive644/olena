import { expect, type Page } from "@playwright/test";

// Pré-condição visual dos testes de outras telas. O fluxo real de troca é
// exercitado em app.spec.ts e profile-settings.spec.ts, dentro do Perfil.
export async function setTestTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => {
    localStorage.setItem("helenastudy.theme", value);
    window.dispatchEvent(new Event("helena:synced-storage-change"));
  }, theme);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}
