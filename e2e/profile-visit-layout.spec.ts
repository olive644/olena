import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`contrato visual do perfil separado: ${theme}`, async ({ page }, info) => {
    await page.addInitScript((value) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helena.theme.v1", value);
    }, theme);
    await page.goto("/perfil");
    await expect(page.locator(".profile-level-badge").first()).toBeVisible();
    // Fixture de layout, não conta autenticada. O componente real tem teste de integração Vitest.
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
      const badge = document.querySelector(".profile-level-badge")!.cloneNode(true);
      const dialog = document.createElement("dialog");
      dialog.className = "profile-editor social-directory profile-visit-dialog";
      dialog.dataset.inspecting = "true";
      dialog.setAttribute("aria-label", "Perfil de teste visual");
      dialog.innerHTML = `<header><button class="icon-button" aria-label="Fechar"><img class="paper-editor-icon agenda-close-icon" src="/navigation-icons/paper/agenda-close.svg" width="32" height="32" alt=""></button></header><section class="social-profile"><div class="social-visit-cover"></div><div class="social-visit-avatar"><img src="/profile-avatars/helena.webp" width="140" height="140" alt="Avatar"></div><div class="social-profile-name"><h3>Leo Bizzocchi</h3><div class="social-profile-streaks"><span class="profile-streak-inspection"><button class="profile-streak" aria-label="Ilhas: 4 dias"><img src="/math-islands/flame.svg" width="28" height="28" alt=""><strong>4</strong></button></span></div></div><p>@layout</p><div class="social-profile-counts"><button class="secondary-button">1 Seguidores</button><button class="secondary-button">1 Seguindo</button></div><section class="profile-safety"><details open><summary>Segurança do perfil</summary><div class="profile-safety-actions"><button class="achievement-bare-action" aria-label="Bloquear usuário"><img src="/navigation-icons/paper/profile-block.svg" width="36" height="36" alt=""></button><button class="achievement-bare-action" aria-label="Denunciar usuário"><img src="/navigation-icons/paper/profile-report.svg" width="36" height="36" alt=""></button></div></details></section></section>`;
      dialog.querySelector(".social-visit-avatar")!.append(badge);
      document.querySelector(".app-shell")!.append(dialog);
      dialog.showModal();
    }, theme);
    const dialog = page.getByRole("dialog", { name: "Perfil de teste visual" });
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    const header = (await dialog.locator("header").boundingBox())!;
    const close = (await dialog
      .getByRole("button", { name: "Fechar", exact: true })
      .boundingBox())!;
    expect(Math.abs(close.x + close.width - header.x - header.width)).toBeLessThan(2);
    const avatar = (await dialog.locator(".social-visit-avatar").boundingBox())!;
    const badge = (await dialog.locator(".profile-level-badge").boundingBox())!;
    expect(badge.x).toBeGreaterThan(avatar.x);
    expect(badge.y).toBeLessThan(avatar.y + avatar.height);
    const actions = dialog.locator(".profile-safety-actions");
    const box = (await actions.boundingBox())!;
    const buttons = await actions.getByRole("button").all();
    const first = (await buttons[0]!.boundingBox())!;
    const last = (await buttons[1]!.boundingBox())!;
    expect(Math.abs((first.x + last.x + last.width) / 2 - (box.x + box.width / 2))).toBeLessThan(2);
    for (const button of buttons) {
      await expect(button).toHaveText("");
      await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      expect((await button.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    }
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect(dialog.locator(".social-profile-name .profile-streak")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await expect(dialog.locator(".social-profile-name .profile-streak")).toHaveCSS(
      "box-shadow",
      "none",
    );
    const name = (await dialog.locator(".social-profile-name h3").boundingBox())!,
      streak = (await dialog.locator(".social-profile-name .profile-streak").boundingBox())!;
    expect(Math.abs(name.y + name.height / 2 - streak.y - streak.height / 2)).toBeLessThan(20);
    expect(
      await dialog
        .locator(".social-profile-counts")
        .evaluate((n) => n.previousElementSibling?.textContent),
    ).toBe("@layout");
    await dialog.screenshot({ path: info.outputPath(`perfil-${theme}.png`) });
  });
}

test("seta de voltar fica à esquerda, na mesma linha do X", async ({ page }) => {
  // Sem a animação de entrada do diálogo, as posições medidas em instantes diferentes coincidem.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/perfil");
  await expect(page.locator(".profile-level-badge").first()).toBeVisible();
  // Fixture de layout, como no teste acima: o componente real tem teste de integração Vitest.
  await page.evaluate(() => {
    const dialog = document.createElement("dialog");
    dialog.className = "profile-editor social-directory profile-visit-dialog";
    dialog.dataset.inspecting = "true";
    dialog.setAttribute("aria-label", "Perfil de teste visual");
    dialog.innerHTML = `<header><button class="icon-button social-visit-back" aria-label="Voltar"><img class="onboarding-paper-arrow is-back" src="/paper-arrow.svg" alt=""></button><button class="icon-button" aria-label="Fechar"><img class="paper-editor-icon agenda-close-icon" src="/navigation-icons/paper/agenda-close.svg" width="32" height="32" alt=""></button></header><section class="social-profile"><h3>Perfil de teste visual</h3></section>`;
    document.querySelector(".app-shell")!.append(dialog);
    dialog.showModal();
  });
  const dialog = page.getByRole("dialog", { name: "Perfil de teste visual" });
  const header = (await dialog.locator("header").boundingBox())!;
  const back = (await dialog.getByRole("button", { name: "Voltar", exact: true }).boundingBox())!;
  const close = (await dialog.getByRole("button", { name: "Fechar", exact: true }).boundingBox())!;
  expect(back.x - header.x).toBeLessThan(2);
  expect(Math.abs(close.x + close.width - header.x - header.width)).toBeLessThan(2);
  expect(Math.abs(back.y + back.height / 2 - (close.y + close.height / 2))).toBeLessThan(2);
  await expect(dialog.getByRole("button", { name: "Voltar", exact: true })).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
});
