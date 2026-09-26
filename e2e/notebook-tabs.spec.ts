import { expect, test, type Locator } from "@playwright/test";

test("folhas duplas e divisórias reordenáveis persistem no caderno", async ({
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
  const layers = await preview.evaluate((element) => {
    const paper = element.querySelector<HTMLElement>(".notebook-paper-spread");
    const tabs = element.querySelector<HTMLElement>(".notebook-attached-tabs");
    return {
      paper: paper ? getComputedStyle(paper).zIndex : "",
      tabs: tabs ? getComputedStyle(tabs).zIndex : "",
    };
  });
  expect(layers).toEqual({ paper: "2", tabs: "1" });
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
    await expect(preview.locator(".notebook-turn-leaf")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("folha-em-movimento.png") });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.45, {
      steps: 8,
    });
    await expect(preview.locator(".notebook-turn-leaf")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("folha-em-movimento.png") });
    await page.mouse.up();
  }
  await expect(preview.getByText("Folhas 3 de 3")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Escrever à mão" })).toHaveCount(0);
  await preview.getByRole("button", { name: "‹ Anterior" }).click();
  await expect(book).toHaveAttribute("aria-busy", "false");
  async function dragPiece(source: Locator, relativeX: number, relativeY: number) {
    await source.evaluate((element) =>
      element.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    const target = (await book.boundingBox())!;
    const x = target.x + target.width * relativeX;
    const y = target.y + target.height * relativeY;
    const box = await source.boundingBox();
    if (!box) throw new Error("Ferramenta não renderizada");
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    if (testInfo.project.name === "mobile" && browserName === "chromium") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y: startY }],
      });
      for (let step = 1; step <= 8; step++)
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: startX + ((x - startX) * step) / 8, y: startY + ((y - startY) * step) / 8 },
          ],
        });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
    } else {
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(x, y, { steps: 8 });
      await page.mouse.up();
    }
  }
  await dragPiece(preview.getByRole("button", { name: "Colocar divisória" }), 0.99, 0.35);
  await preview.getByLabel("Nome da marcação").fill("Matemática");
  await preview.getByRole("button", { name: "Verde", exact: true }).click();
  await preview.getByRole("button", { name: "Pronto", exact: true }).click();
  const divider = preview.getByRole("button", {
    name: "Divisória Matemática, folha 2",
    exact: true,
  });
  await expect(divider).toBeVisible();
  const beforeY = (await divider.boundingBox())!.y - (await book.boundingBox())!.y;
  await dragPiece(divider, 0.99, 0.7);
  await preview.getByRole("button", { name: "Pronto", exact: true }).click();
  expect((await divider.boundingBox())!.y - (await book.boundingBox())!.y).toBeGreaterThan(beforeY);
  await dragPiece(preview.getByRole("button", { name: "Colocar marcador" }), 0.28, 0.6);
  await preview.getByRole("button", { name: "Pronto", exact: true }).click();
  const marker = preview.getByRole("button", { name: "Marcador Marcador, folha 1", exact: true });
  await expect(marker).toBeVisible();
  await expect(marker.locator(".notebook-attached-tab__moon")).toHaveCount(1);
  const markerBox = (await marker.boundingBox())!;
  const currentBox = (await book.boundingBox())!;
  expect(markerBox.y + markerBox.height).toBeGreaterThan(currentBox.y + currentBox.height);
  await dragPiece(preview.getByRole("button", { name: "Colocar marcador" }), 0.73, 0.7);
  await preview.getByRole("button", { name: "Pronto", exact: true }).click();
  const markerOnSecondPage = preview.getByRole("button", {
    name: "Marcador Marcador, folha 2",
    exact: true,
  });
  await expect(markerOnSecondPage).toBeVisible();
  await expect(preview.getByRole("button", { name: /Abrir preview de / })).toHaveCount(2);
  await expect(preview.getByRole("button", { name: /Abrir preview de .*folha 2/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("abas-do-caderno.png") });
  await preview.getByRole("button", { name: "Próxima ›" }).click();
  await expect(preview.getByText("Folhas 3 de 3")).toBeVisible();
  await expect(divider).toBeVisible();
  await expect(marker).toBeVisible();
  await expect(markerOnSecondPage).toBeVisible();
  await divider.click();
  await expect(preview.getByText("Folhas 1 e 2 de 3")).toBeVisible();
  await expect(preview.getByLabel("Nome da marcação")).toHaveCount(0);
  const secondMarkerBox = (await markerOnSecondPage.boundingBox())!;
  await markerOnSecondPage.click({
    position: { x: secondMarkerBox.width / 2, y: secondMarkerBox.height - 8 },
  });
  await expect(preview.getByText("Folhas 1 e 2 de 3")).toBeVisible();
  await preview.getByRole("button", { name: "Editar marcas", exact: true }).click();
  await divider.click();
  await expect(preview.getByLabel("Nome da marcação")).toBeVisible();
  await preview.getByRole("button", { name: "Pronto", exact: true }).click();
  await preview.getByRole("button", { name: "Concluir edição", exact: true }).click();
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  const toolColor = await preview
    .getByRole("button", { name: "Colocar divisória" })
    .evaluate((element) => getComputedStyle(element).color);
  expect(toolColor).not.toBe("rgb(15, 15, 20)");
  await expect
    .poll(() =>
      preview
        .getByRole("button", { name: "Colocar divisória" })
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe("rgb(32, 29, 38)");
  await page.screenshot({ path: testInfo.outputPath("marcacoes-modo-escuro.png") });
  await preview.getByRole("button", { name: /Abrir preview de .*folha 2/ }).click();
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
  await expect(editor).toHaveCount(0);
  await preview.getByRole("button", { name: /Abrir preview de .*folha 2/ }).click();
  await editor.getByRole("button", { name: "Tipo de papel", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Calendário", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await editor.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(editor).toHaveCount(0);
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
  await preview.getByRole("button", { name: "Ver folhas" }).click();
  await preview.getByRole("button", { name: "Remover folha 2", exact: true }).click();
  await expect(preview.locator(".notebook-crumple")).toBeVisible();
  await preview.locator(".notebook-crumple").evaluate((element) => {
    for (const animation of element.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = 560;
    }
  });
  await page.screenshot({ path: testInfo.outputPath("papel-amassando.png") });
  await expect(preview.locator(".notebook-crumple")).toHaveCount(0);
  await expect(preview.getByText("Folhas 1 e 2 de 2")).toBeVisible();
  await expect(preview.getByRole("button", { name: "Divisória Matemática, folha 2" })).toHaveCount(
    0,
  );
  await expect(preview.getByRole("button", { name: "Marcador Marcador, folha 2" })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await preview.getByRole("button", { name: "Remover folha 2", exact: true }).click();
  await expect(preview.locator(".notebook-crumple")).toHaveCount(0);
  await expect(preview.getByText("Folhas 1 de 1")).toBeVisible();
  await preview.getByRole("button", { name: "Colocar divisória" }).focus();
  await page.keyboard.press("Enter");
  await preview.getByRole("button", { name: /Abrir preview de .*folha 1/ }).focus();
  await page.keyboard.press("Enter");
  await expect(preview.getByLabel("Nome da marcação")).toBeVisible();
  await preview.getByRole("button", { name: "Pronto", exact: true }).click();
  const keyboardDivider = preview.getByRole("button", {
    name: "Divisória Divisória, folha 1",
    exact: true,
  });
  await keyboardDivider.focus();
  const originalPosition = await keyboardDivider.evaluate((element) =>
    element.style.getPropertyValue("--tab-position"),
  );
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(() =>
      keyboardDivider.evaluate((element) =>
        Number(element.style.getPropertyValue("--tab-position")),
      ),
    )
    .toBeLessThan(Number(originalPosition));
  await preview.getByRole("button", { name: "Meus Cadernos", exact: true }).click();
  await expect(page.locator(".book-cover__mark.is-divider")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("vitrine-com-divisoria.png") });
});
