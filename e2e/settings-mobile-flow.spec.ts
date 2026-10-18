import { expect, test } from "@playwright/test";

test("configurações móveis começam no menu e voltam sem rolagem herdada", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Seções do Perfil" });
  const mobile = page.viewportSize()!.width <= 760;
  await expect(menu.getByRole("button", { name: "Segurança", exact: true })).toBeVisible();
  await expect(
    menu.getByRole("button", { name: "Conversar com o time", exact: true }),
  ).toBeVisible();
  await expect(menu.getByRole("link", { name: "Instagram", exact: true })).toHaveAttribute(
    "href",
    "https://www.instagram.com/olenastudy.app/",
  );
  await expect(menu.getByRole("link", { name: "TikTok", exact: true })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  if (mobile) {
    await expect(menu.locator("[aria-current]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Informações" })).toHaveCount(0);
  }
  await page.screenshot({
    path: test.info().outputPath("configuracoes-menu.png"),
    animations: "disabled",
  });
  await menu.getByRole("button", { name: "Conta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Informações" })).toBeVisible();
  if (mobile) {
    await expect(menu).toBeHidden();
    const card = await page.locator(".profile-information").boundingBox();
    expect(card!.y).toBeGreaterThanOrEqual(0);
    expect(card!.y + card!.height).toBeLessThan(page.viewportSize()!.height - 90);
    await page.getByRole("button", { name: "Voltar às configurações" }).click();
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: "Conta", exact: true })).toBeFocused();
  }
  await menu.getByRole("button", { name: "Privacidade e dados", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Política de privacidade", exact: true }),
  ).toHaveAttribute("href", /privacidade/);
});

test("preferências por tipo persistem e atendimento sem login não inventa conversa", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Seções do Perfil" });
  await menu.getByRole("button", { name: "Agenda e notificações", exact: true }).click();
  const followers = page.getByRole("checkbox", { name: /Novos seguidores/ });
  await expect(followers).toBeChecked();
  await followers.uncheck();
  await expect(followers).not.toBeChecked();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}").notificationPreferences
          .followers,
    ),
  ).toBe(false);
  if (page.viewportSize()!.width <= 760)
    await page.getByRole("button", { name: "Voltar às configurações" }).click();
  await menu.getByRole("button", { name: "Conversar com o time", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Sua mensagem" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tickets do time" })).toHaveCount(0);
});

test("modal de exclusão fica no top layer sem corte em viewport curta", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  // Fixture visual sem conta real: comportamento de portal/confirmar é testado no componente.
  await page.evaluate(() => {
    const dialog = document.createElement("dialog");
    dialog.className = "delete-account-dialog";
    dialog.innerHTML = `<h2>Tem certeza de que quer excluir a conta?</h2><p>Isto vai apagar para sempre:</p><ul><li>a sua conta e o acesso com o Google;</li><li>todos os estudos, cadernos e anotações guardados na nuvem;</li><li>os dados deste aparelho.</li></ul><p>Outros aparelhos com esta conta também deixam de ter acesso. Salas e cadernos compartilhados já abertos expiram sozinhos.</p><label>Para confirmar, digite Estudante</label><input><p class="delete-account-dialog__note">Vamos pedir o login do Google mais uma vez para confirmar que é você.</p><div class="delete-account-dialog__actions"><button class="secondary-button">Cancelar</button><button class="delete-account-dialog__confirm" disabled>Excluir esta conta para sempre</button></div>`;
    document.body.append(dialog);
    dialog.showModal();
  });
  for (const height of [700, 480]) {
    await page.setViewportSize({ width: page.viewportSize()!.width, height });
    const dialog = page.locator("dialog.delete-account-dialog");
    expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
    const box = (await dialog.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    const cancel = dialog.getByRole("button", { name: "Cancelar" });
    await cancel.scrollIntoViewIfNeeded();
    const action = (await cancel.boundingBox())!;
    expect(action.y + action.height).toBeLessThanOrEqual(height);
    await page.screenshot({
      path: test.info().outputPath(`exclusao-${height}.png`),
      animations: "disabled",
    });
  }
});
