import { expect, test } from "@playwright/test";

test("aviso social mantém foto, ação à direita e barra fora do cabeçalho", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/");
  await page.getByLabel(/Atualizações do sistema/).click();
  // Fixture apenas visual. Portal, recebimento, seguir e expiração têm testes de componente.
  await page.evaluate(() => {
    const toast = document.createElement("aside");
    toast.className = "social-follow-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `<button type="button" class="social-notice-person" aria-label="Visitar perfil de @alice"><img src="/profile-avatars/alice.svg" width="44" height="44" alt=""><span><strong>Alice te seguiu</strong><small>@alice</small></span></button><button type="button" class="secondary-button">Seguir de volta</button><button class="social-follow-toast-close" aria-label="Fechar aviso de novo seguidor">×</button><span class="social-follow-toast-countdown"></span>`;
    document.body.append(toast);
  });
  const toast = page.locator(".social-follow-toast");
  await toast.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  await expect(toast.locator("img")).toHaveJSProperty("complete", true);
  expect(
    await toast.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
  await expect(toast.getByRole("button", { name: "Seguir de volta" })).toHaveCSS(
    "background-color",
    "rgb(116, 51, 224)",
  );
  const person = await toast.locator(".social-notice-person").boundingBox();
  const action = await toast.getByRole("button", { name: "Seguir de volta" }).boundingBox();
  expect(action!.x).toBeGreaterThanOrEqual(person!.x + person!.width - 1);
  const box = (await toast.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.evaluate(() => window.scrollTo(0, 500));
  expect((await toast.boundingBox())!.y).toBeCloseTo(box.y, 0);
  await toast.screenshot({ path: info.outputPath("aviso-seguidor.png"), animations: "disabled" });
});
