import { expect, test } from "@playwright/test";

test("contrato visual das conexões mantém nome e @ em uma linha no celular", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/perfil");
  await expect(page.getByRole("button", { name: "Adicionar amigo", exact: true })).toBeVisible();
  // Fixture só de layout com o DOM validado no teste de SocialDirectory, sem simular conta.
  await page.evaluate(() => {
    const dialog = document.createElement("dialog");
    dialog.className = "social-directory";
    for (const [name, username] of [
      ["Drey", "dreyxnn"],
      ["teco", "eito"],
      ["it's Erick bro", "pranksterbrain"],
    ]) {
      const row = document.createElement("div");
      row.className = "social-connection-row";
      const person = document.createElement("button");
      person.className = "social-person";
      const avatar = document.createElement("img");
      avatar.src = "/profile-avatars/helena.webp";
      avatar.width = avatar.height = 44;
      const identity = document.createElement("span");
      for (const [tag, text] of [
        ["strong", name],
        ["small", `@${username}`],
        ["small", "Segue você"],
      ]) {
        const element = document.createElement(tag!);
        element.textContent = text!;
        if (text === "Segue você") element.className = "social-person-relation";
        identity.append(element);
      }
      person.append(avatar, identity);
      const remove = document.createElement("button");
      remove.className = "secondary-button";
      remove.textContent = "Remover";
      row.append(person, remove);
      dialog.append(row);
    }
    document.querySelector(".app-shell")!.append(dialog);
    dialog.showModal();
  });
  for (const row of await page.locator(".social-connection-row").all()) {
    for (const text of await row.locator(".social-person strong, .social-person small").all()) {
      await expect(text).toHaveCSS("white-space", "nowrap");
      const box = (await text.boundingBox())!;
      expect(box.width).toBeGreaterThan(100);
      expect(box.height).toBeLessThanOrEqual(
        parseFloat(await text.evaluate((el) => getComputedStyle(el).lineHeight)) + 1,
      );
    }
    const person = (await row.locator(".social-person").boundingBox())!;
    const action = (await row.getByRole("button", { name: "Remover" }).boundingBox())!;
    expect(person.x + person.width).toBeLessThanOrEqual(action.x);
  }
});
