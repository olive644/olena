import { expect, test } from "@playwright/test";

test("escreve, ajusta e salva uma folha manuscrita", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais", exact: true }).click();
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
  await expect(page.getByText("Matéria do novo caderno")).toHaveCount(0);
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Meu universo");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Meu universo" })).toBeVisible();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByRole("button", { name: "Escrever à mão" }).click();

  const dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Caneta" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(dialog.getByRole("button", { name: "Pautado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByRole("button", { name: "Quadriculado" }).click();
  await expect(dialog.getByRole("button", { name: "Quadriculado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const canvas = dialog.locator("canvas.handwriting-canvas");
  await dialog.getByRole("button", { name: "Lupa para ampliar" }).click();
  await canvas.click({ position: { x: 60, y: 60 } });
  await expect(dialog.getByRole("button", { name: "115%" })).toBeVisible();
  await dialog.getByRole("button", { name: "Lupa para reduzir" }).click();
  await canvas.click({ position: { x: 60, y: 60 } });
  await expect(dialog.getByRole("button", { name: "100%" })).toBeVisible();
  await dialog.getByRole("button", { name: "Mover folha" }).click();
  await expect(dialog.getByRole("button", { name: "Mover folha" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const panStart = await canvas.boundingBox();
  const initialScroll = await dialog
    .locator(".handwriting-viewport")
    .evaluate((node) => node.scrollTop);
  expect(panStart).not.toBeNull();
  if (!panStart) return;
  await page.mouse.move(panStart.x + 60, panStart.y + 150);
  await page.mouse.down();
  await page.mouse.move(panStart.x + 60, panStart.y + 50, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(() => dialog.locator(".handwriting-viewport").evaluate((node) => node.scrollTop))
    .toBeGreaterThan(initialScroll);
  await expect(dialog.getByRole("button", { name: "Limpar folha" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Régua", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("estudio-manuscrito.png") });

  const bounds = await canvas.boundingBox();
  const viewport = await dialog.locator(".handwriting-viewport").boundingBox();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!bounds || !viewport) return;
  expect(viewport.x).toBeGreaterThanOrEqual(0);
  expect(viewport.x + viewport.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const startX = Math.max(bounds.x, viewport.x) + 40;
  const startY = Math.max(bounds.y, viewport.y) + 40;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 100, startY + 7, { steps: 10 });
  await page.mouse.up();
  await expect(dialog.getByRole("button", { name: "Desfazer" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Desfazer" }).click();
  await expect(dialog.getByRole("button", { name: "Refazer" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Refazer" }).click();
  await dialog.getByRole("button", { name: "Selecionar traços" }).click();
  await page.mouse.move(startX - 10, startY - 10);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY + 25, { steps: 8 });
  await page.mouse.up();
  await expect(dialog.getByRole("button", { name: "Apagar" })).toBeVisible();
  await dialog.getByRole("button", { name: "Apagar" }).click();
  await dialog.getByRole("button", { name: "Desfazer" }).click();
  await dialog.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("img", { name: /folha manuscrita/i })).toBeVisible();
  await page.getByRole("button", { name: "Abrir Folha manuscrita" }).click();
  const reopened = page.getByRole("dialog", { name: "Folha manuscrita" });
  await expect(reopened.getByRole("button", { name: "Quadriculado" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(reopened.getByRole("button", { name: "Limpar folha" })).toBeEnabled();
  await reopened.getByRole("button", { name: "Escura", exact: true }).click();
  await reopened.getByRole("button", { name: "Adicionar texto" }).click();
  await reopened.getByLabel("Texto na folha").fill("Minha anotação pelo teclado");
  await reopened.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await page.reload();
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem("helenastudy.workspace.v1");
    if (!raw) return null;
    const workspace = JSON.parse(raw) as {
      notes: { assets: { handwriting?: { paper: string; strokes: { points: unknown[] }[] } }[] }[];
    };
    return workspace.notes[0]?.assets[0]?.handwriting ?? null;
  });
  expect(saved?.paper).toBe("grid");
  expect(saved?.strokes).toHaveLength(1);
  expect(saved?.strokes[0]?.points).toHaveLength(2);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais", exact: true }).click();
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
  await page.screenshot({ path: testInfo.outputPath("vitrine-cadernos.png"), fullPage: true });
  await page.locator(".notebook-card").first().click();
  await page.locator(".notebook-page-card").first().click();
  await page.getByRole("button", { name: "Abrir Folha manuscrita" }).click();
  await expect(page.getByRole("dialog", { name: "Folha manuscrita" })).toBeVisible();
  await expect(page.getByLabel("Texto na folha")).toHaveValue("Minha anotação pelo teclado");
  await expect(page.getByRole("button", { name: "Escura", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("recupera rascunho, adiciona post-it e organiza folhas", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Mais", exact: true }).click();
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
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByRole("button", { name: "Escrever à mão" }).click();
  let dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await dialog.getByRole("button", { name: "Adicionar post-it" }).click();
  await dialog.getByRole("textbox", { name: "Texto do post-it" }).fill("Revisar gramática");
  await dialog.getByRole("button", { name: "Post-it azul" }).click();
  await page.screenshot({ path: testInfo.outputPath("postit-no-caderno.png") });
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(
    dialog.getByRole("alertdialog", { name: "Fechar folha com alterações" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar e manter rascunho" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Escrever à mão" }).click();
  dialog = page.getByRole("dialog", { name: "Escrever à mão" });
  await expect(dialog.getByRole("textbox", { name: "Texto do post-it" })).toHaveValue(
    "Revisar gramática",
  );
  await expect(dialog.getByText("Rascunho recuperado")).toBeVisible();
  await dialog.getByRole("button", { name: "Janela de escrita ampliada" }).click();
  await expect(dialog.getByRole("region", { name: "Janela de escrita ampliada" })).toBeVisible();
  await dialog.getByRole("button", { name: "Próxima linha" }).click();
  const writingCanvas = dialog.getByLabel("Área ampliada para escrever com dedo ou caneta");
  const bounds = await writingCanvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  await page.mouse.move(bounds.x + 30, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + bounds.height / 2, { steps: 6 });
  await page.mouse.up();
  await dialog.getByRole("button", { name: "Salvar folha no caderno" }).click();
  await expect(dialog).not.toBeVisible();
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem("helenastudy.workspace.v1");
    if (!raw) return null;
    const workspace = JSON.parse(raw) as {
      notes: {
        assets: {
          handwriting?: { strokes: unknown[]; stickies?: { text: string; color: string }[] };
        }[];
      }[];
    };
    return workspace.notes[0]?.assets[0]?.handwriting ?? null;
  });
  expect(saved?.stickies?.[0]).toMatchObject({ text: "Revisar gramática", color: "blue" });
  expect(saved?.strokes).toHaveLength(1);
  await page.getByRole("button", { name: "Abrir Folha manuscrita" }).click();
  const reopened = page.getByRole("dialog", { name: "Folha manuscrita" });
  const download = page.waitForEvent("download");
  await reopened.getByRole("button", { name: "PNG" }).click();
  expect((await download).suggestedFilename()).toBe("folha-do-caderno.png");
  await reopened.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Nova folha", exact: true }).click();
  await page.getByRole("button", { name: "Folhas do caderno" }).click();
  await expect(page.locator(".notebook-page-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Mover Nova folha para depois" }).first().click();
  await expect(page.locator(".notebook-page-card__number").first()).toHaveText("01");
});
