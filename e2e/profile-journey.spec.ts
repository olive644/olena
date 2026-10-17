import { test, expect } from "@playwright/test";
import { profileCompletion } from "../src/domain/profile-completion";

for (const theme of ["light", "dark"]) {
  test(`layout da recomendação e ausência quando completo (fixture): ${theme}`, async ({
    page,
  }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { name: "Guest", exact: true })).toBeVisible();
    // Fixture só de layout. A integração API/hook/componente é validada nos testes React.
    const markup = `<section class="profile-journey" aria-label="Complete seu perfil"><button class="profile-journey-close" aria-label="Dispensar recomendação de perfil"><img src="/navigation-icons/paper/agenda-close.svg" alt=""></button><div class="profile-journey__copy"><small>FALTA 1 ETAPA</small><h2>Qual é o seu personagem?</h2><p>Um companheiro com a sua cara.</p></div><img src="/profile-journey/helena-avatar.webp" width="120" height="120" alt=""><ol aria-label="Etapas pendentes do perfil"><li><button aria-current="step">1</button></li></ol><button class="primary-button profile-journey__continue">Escolher personagem</button></section>`;
    await page.evaluate((markup) => {
      const slot = document.createElement("div");
      const below = matchMedia("(max-width: 1000px)").matches;
      slot.className = `profile-journey-slot--${below ? "below" : "side"}`;
      slot.innerHTML = markup;
      if (below) document.querySelector(".profile-cover-spacer")!.after(slot);
      else document.querySelector(".profile-chrome")!.append(slot);
    }, markup);
    const card = page.getByRole("region", { name: "Complete seu perfil" });
    await expect(card).toHaveCount(1);
    await expect(card.getByText("FALTA 1 ETAPA")).toBeVisible();
    await expect(card.getByRole("button", { name: "Escolher meu nome" })).toHaveCount(0);
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const mascot = card.locator('img[src^="/profile-journey/"]');
    await expect(mascot).toHaveJSProperty("naturalWidth", 512);
    const button = (await card.getByRole("button", { name: "Escolher personagem" }).boundingBox())!;
    expect(Math.round(button.height)).toBeGreaterThanOrEqual(44);
    const art = (await mascot.boundingBox())!;
    expect(art.y).toBeLessThan(button.y);
    expect(art.y + art.height).toBeGreaterThan(button.y);
    expect(art.y + art.height).toBeLessThan(button.y + button.height);
    if (page.viewportSize()!.width <= 600) await card.scrollIntoViewIfNeeded();
    await card.screenshot({
      path: info.outputPath(`recomendacao-${theme}.png`),
      animations: "disabled",
    });
    const completion = profileCompletion(
      { name: "Oli", photoUrl: "/profile-avatars/helena.webp", cover: "ocean" },
      "oli",
    );
    expect(completion.next).toBeNull();
    const completeMarkup = "";
    await page.locator('[class^="profile-journey-slot"]').evaluate((slot, markup) => {
      slot.innerHTML = markup;
    }, completeMarkup);
    await expect(card).toHaveCount(0);
    await expect(page.getByText("Revisar meu perfil", { exact: true })).toHaveCount(0);
  });
}
