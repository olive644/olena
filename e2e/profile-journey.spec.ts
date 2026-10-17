import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`layout da jornada com CSS real e dados ilustrativos: ${theme}`, async ({ page }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: "Guest", exact: true })).toBeVisible();
    // Fixture de layout: não simula autenticação nem grava dados de uma conta.
    const markup = `<section class="profile-journey" aria-label="Complete seu perfil">
      <div class="profile-journey__copy"><small>SEU PERFIL · 0 DE 3 ETAPAS</small>
      <h2>Quem é você?</h2><p>Seu nome e um @ só seu.</p></div>
      <img src="/profile-journey/helena-identity.webp" width="120" height="120" alt="">
      <ol aria-label="Etapas do perfil"><li><button aria-current="step">1</button></li>
      <li><button>2</button></li><li><button>3</button></li></ol>
      <button class="primary-button profile-journey__continue">Escolher meu nome</button></section>`;
    await page.evaluate((markup) => {
      const side = document.createElement("div");
      side.className = "profile-journey-slot--side";
      side.innerHTML = markup;
      document.querySelector(".profile-chrome")!.append(side);
      const below = document.createElement("div");
      below.className = "profile-journey-slot--below";
      below.innerHTML = markup;
      document.querySelector(".profile-cover-spacer")!.after(below);
    }, markup);
    const card = page
      .getByRole("region", { name: "Complete seu perfil" })
      .filter({ visible: true });
    await expect(card).toBeVisible();
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expect(card.locator("img")).toHaveJSProperty("naturalWidth", 512);
    const button = (await card.getByRole("button", { name: "Escolher meu nome" }).boundingBox())!;
    expect(Math.round(button.height)).toBeGreaterThanOrEqual(44);
    const mascot = (await card.locator("img").boundingBox())!;
    expect(mascot.y).toBeLessThan(button.y);
    expect(mascot.y + mascot.height).toBeGreaterThan(button.y);
    expect(mascot.y + mascot.height).toBeLessThan(button.y + button.height);
    await page.screenshot({
      path: info.outputPath(`jornada-${theme}.png`),
      animations: "disabled",
      fullPage: true,
    });
    await card.screenshot({ path: info.outputPath(`card-${theme}.png`), animations: "disabled" });
    await card.locator("img").evaluate((image) => {
      (image as HTMLImageElement).src = "/profile-journey/helena-complete.webp";
    });
    await card.locator(".profile-journey__copy").evaluate((copy) => {
      copy.innerHTML =
        "<small>FICOU ÓTIMO!</small><h2>Seu perfil está perfeito.</h2><p>Agora é só espalhar suas descobertas por aqui.</p>";
    });
    await expect(card.locator("img")).toHaveJSProperty("naturalWidth", 512);
    await card.screenshot({
      path: info.outputPath(`concluido-${theme}.png`),
      animations: "disabled",
    });
  });
}
