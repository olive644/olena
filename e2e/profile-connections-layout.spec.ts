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
      // Mesma estrutura de Person: retrato com avatar e moldura sobreposta.
      const portrait = document.createElement("div");
      portrait.className = "social-person-portrait";
      const frame = document.createElement("img");
      frame.className = "profile-frame-art";
      frame.src = "/profile-cosmetics/bi.svg";
      frame.alt = "";
      frame.width = frame.height = 180;
      portrait.append(avatar, frame);
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
      person.append(portrait, identity);
      const remove = document.createElement("button");
      remove.className = "secondary-button";
      remove.textContent = "Remover";
      row.append(person, remove);
      dialog.append(row);
    }
    const note = document.createElement("p");
    note.className = "social-support-note";
    note.textContent = "Somente o nome do contato escolhido é preenchido aqui.";
    dialog.prepend(note);
    document.querySelector(".app-shell")!.append(dialog);
    dialog.showModal();
  });
  // A moldura fica centrada no avatar, 24% maior, em qualquer largura.
  for (const portrait of await page.locator(".social-person-portrait").all()) {
    const [avatar, frame] = await portrait.evaluate((element) =>
      [...element.querySelectorAll("img")].map((image) => {
        const box = image.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width };
      }),
    );
    expect(Math.abs(frame!.x - avatar!.x)).toBeLessThan(1);
    expect(Math.abs(frame!.y - avatar!.y)).toBeLessThan(1);
    expect(frame!.width / avatar!.width).toBeCloseTo(1.24, 1);
  }
  const note = page.locator(".social-support-note");
  if ((page.viewportSize()?.width ?? 1000) <= 600) await expect(note).toBeHidden();
  else await expect(note).toBeVisible();
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
