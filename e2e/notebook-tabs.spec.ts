import { expect, test } from "@playwright/test";

test("folhas duplas e divisórias de matérias persistem no caderno", async ({
  page,
  browserName,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais ferramentas", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Mais ferramentas" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  } else {
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("button", { name: "Cadernos", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  const preview = page.getByRole("region", { name: "Preview do caderno" });
  await expect(preview.getByText("MEU UNIVERSO PARTICULAR")).toHaveCount(0);
  await expect(preview.getByText("Escolha uma folha para continuar suas ideias.")).toHaveCount(0);
  await preview.getByRole("button", { name: "Criar primeira folha" }).click();
  await page
    .getByRole("dialog", { name: "Escrever à mão" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await preview.getByRole("button", { name: "Criar nova folha" }).click();
  await page
    .getByRole("dialog", { name: "Escrever à mão" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await expect(preview.getByRole("button", { name: /Abrir preview de / })).toHaveCount(2);
  await expect(preview.getByText("Folhas 1 e 2 de 2")).toBeVisible();
  await preview.getByRole("button", { name: "Criar nova folha" }).click();
  await page
    .getByRole("dialog", { name: "Escrever à mão" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  const book = preview.getByLabel("Prévia folheável do caderno");
  await book.scrollIntoViewIfNeeded();
  const bounds = await book.boundingBox();
  if (!bounds) throw new Error("Prévia não renderizada");
  if (testInfo.project.name === "mobile" && browserName === "chromium") {
    const session = await page.context().newCDPSession(page);
    const x = bounds.x + bounds.width * 0.8;
    const y = bounds.y + bounds.height * 0.45;
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - 90, y }],
    });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.45, {
      steps: 8,
    });
    await page.mouse.up();
  }
  await expect(preview.getByText("Folhas 3 de 3")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Escrever à mão" })).toHaveCount(0);
  await preview.getByRole("button", { name: "‹ Anterior" }).click();
  await preview.getByRole("button", { name: "Matérias", exact: true }).click();
  await preview.getByLabel("Nova matéria", { exact: true }).fill("Matemática");
  await preview.getByRole("button", { name: "Adicionar divisória" }).click();
  await preview
    .getByLabel("Matéria da folha 2", { exact: true })
    .selectOption({ label: "Matemática" });
  const tabs = preview.getByRole("navigation", { name: "Divisórias de matérias" });
  await preview.getByRole("button", { name: "Fechar matérias", exact: true }).click();
  await tabs.getByRole("button", { name: "Matemática", exact: true }).click();
  await expect(preview.getByRole("button", { name: /Abrir preview de / })).toHaveCount(1);
  await expect(preview.getByRole("button", { name: /Abrir preview de .*folha 2/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("abas-do-caderno.png") });
  await preview.getByRole("button", { name: /Abrir preview de / }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão" });
  const gear = editor.locator('[data-paper-editor-icon="settings"]');
  await expect(gear.locator('path[fill="#17151C"]')).toHaveCount(0);
  await editor.getByRole("button", { name: "Configurações do editor" }).click();
  const close = page.getByRole("button", { name: "Fechar configurações" });
  await expect(close.locator("path[transform]")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("configuracoes-e-fechar.png") });
  await close.click();
  for (const [label, paper] of [
    ["Plano semanal", "weekly"],
    ["Calendário", "calendar"],
  ]) {
    await editor.getByRole("button", { name: "Tipo de papel", exact: true }).click();
    await editor.getByRole("button", { name: label!, exact: true }).click();
    await editor.getByRole("button", { name: "Salvar caderno", exact: true }).click();
    await expect(editor.getByText("Escreva ou adicione um post-it antes de salvar.")).toHaveCount(
      0,
    );
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("helenastudy.workspace.v1")))
      .toContain(`"paper":"${paper}"`);
    await page.screenshot({ path: testInfo.outputPath(`${paper}.png`) });
  }
  await editor.getByRole("button", { name: "Fechar", exact: true }).click();
  const keepDraft = editor.getByRole("button", { name: "Fechar e manter rascunho" });
  if (await keepDraft.isVisible()) await keepDraft.click();
  await preview.getByRole("button", { name: /Abrir preview de .*folha 2/ }).click();
  await editor.getByRole("button", { name: "Tipo de papel", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Calendário", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await editor.getByRole("button", { name: "Fechar", exact: true }).click();
  if (await keepDraft.isVisible()) await keepDraft.click();
  await preview.getByRole("button", { name: "Ver capa", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("capa-helena.png") });
  if (testInfo.project.name === "mobile") {
    for (const size of [
      { width: 390, height: 720 },
      { width: 320, height: 640 },
    ]) {
      await page.setViewportSize(size);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight))
        .toBeLessThanOrEqual(1);
      const cover = await preview.locator(".notebook-concept-cover").boundingBox();
      const nav = await page.locator(".mobile-nav").boundingBox();
      expect(cover).not.toBeNull();
      expect(cover!.y + cover!.height).toBeLessThan(nav!.y);
      await preview.getByRole("button", { name: "Ver folhas" }).click();
      const spread = await book.boundingBox();
      expect(spread!.width).toBeLessThan(size.width);
      const create = await preview.getByRole("button", { name: "Criar nova folha" }).boundingBox();
      expect(create!.y + create!.height).toBeLessThan(nav!.y);
      await preview.getByRole("button", { name: "Ver capa" }).click();
    }
  }
});
