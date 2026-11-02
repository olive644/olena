import { test, expect } from "@playwright/test";
for (const theme of ["light", "dark"])
  test("lista social de papel, fixture visual: " + theme, async ({ page }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/perfil");
    await expect(page.locator(".profile-cover__portrait")).toBeVisible();
    // A fixture mede CSS real; comportamento e dados do componente são cobertos em profile-social.test.tsx.
    await page.evaluate(() => {
      const dialog = document.createElement("dialog");
      dialog.className = "profile-editor social-directory";
      dialog.setAttribute("aria-label", "Lista visual de teste");
      dialog.innerHTML =
        "<header><h2>Seguindo</h2></header>" +
        [
          ["Alice", "alice.svg", "lesbian"],
          ["Oliver", "oliver.webp", "mathematics"],
          ["Olena", "helena.webp", "trans"],
        ]
          .map(
            ([name, id, frame]) =>
              '<div class="social-connection-row"><button class="social-person"><div class="social-person-portrait"><img src="/profile-avatars/' +
              id +
              '" width="44" height="44" alt=""><img class="profile-frame-art" src="/profile-cosmetics/' +
              frame +
              '.svg" alt=""></div><span><strong>' +
              name +
              '</strong><small>@perfil-teste</small><small class="social-person-relation">Segue você</small></span></button><button class="secondary-button">Seguindo</button></div>',
          )
          .join("");
      document.querySelector(".app-shell")!.append(dialog);
      dialog.showModal();
    });
    const dialog = page.getByRole("dialog", { name: "Lista visual de teste" });
    for (const row of await dialog.locator(".social-person").all()) {
      expect(await row.evaluate((node) => getComputedStyle(node).backgroundImage)).toContain(
        "linear-gradient",
      );
      expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(70);
    }
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect
      .poll(() =>
        dialog
          .locator("img")
          .evaluateAll((nodes) => nodes.every((node) => node.complete && node.naturalWidth > 0)),
      )
      .toBe(true);
    await dialog.screenshot({ path: info.outputPath("usuarios-" + theme + ".png") });
  });
