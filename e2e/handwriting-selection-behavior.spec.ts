import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`seleção contextual, redimensionamento e estilo persistem: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "desktop") await page.setViewportSize({ width: 1126, height: 800 });
    await page.addInitScript((appearance) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.theme", appearance);
    }, theme);
    if (theme === "dark") await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cadernos");
    const notice = page.getByRole("button", { name: "Entendi", exact: true });
    if (await notice.isVisible()) await notice.click();
    await page.getByRole("button", { name: "Crie", exact: true }).click();
    await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
    await page.locator(".notebook-spine").first().click();
    await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
    await expect(editor.locator(".handwriting-canvas")).toBeVisible();
    const topPositions = async () =>
      Promise.all(
        [".handwriting-tool-group", ".handwriting-history", ".notebook-file-tools"].map(
          async (selector) => (await editor.locator(selector).boundingBox())!.y,
        ),
      );
    const initialTop = info.project.name === "desktop" ? await topPositions() : [];
    if (info.project.name === "desktop")
      expect(Math.max(...initialTop) - Math.min(...initialTop)).toBeLessThan(2);
    await editor.getByRole("button", { name: "Texto na página inteira", exact: true }).click();
    await expect(editor.locator(".handwriting-selection-actions > button")).toHaveCount(0);
    if (info.project.name === "desktop") {
      const tools = editor.locator(".handwriting-tool-group");
      expect(await tools.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await expect
        .poll(() =>
          editor
            .locator(".handwriting-commandbar")
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
        )
        .toBe(true);
    }
    const text = editor.locator(".handwriting-sticky--text").first();
    await expect(text.locator("textarea")).toHaveAttribute("readonly", "");
    await expect(editor.locator(".handwriting-selection-float")).toBeVisible();
    if (info.project.name === "desktop") expect(await topPositions()).toEqual(initialTop);
    if (info.project.name === "desktop") {
      const initialX = await text.evaluate((element) => element.style.left);
      const created = (await text.boundingBox())!;
      await page.mouse.move(created.x + created.width / 2, created.y + created.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        created.x + created.width / 2 + 30,
        created.y + created.height / 2 + 18,
        { steps: 8 },
      );
      await page.mouse.up();
      await expect.poll(() => text.evaluate((element) => element.style.left)).not.toBe(initialX);
    }
    const editBox = (await text.boundingBox())!;
    await page.mouse.click(editBox.x + editBox.width / 2, editBox.y + editBox.height / 2);
    await expect(text.locator("textarea")).not.toHaveAttribute("readonly");
    await text.locator("textarea").fill("Texto para conferir largura e tamanho da fonte.");
    await editor
      .getByRole("button", {
        name: info.project.name === "desktop" ? "Retângulo" : "Selecionar traços",
        exact: true,
      })
      .click();
    await expect(text.locator("textarea")).toHaveAttribute("readonly", "");
    await expect(editor.locator(".handwriting-selection-float")).toBeVisible();
    const canvas = editor.locator(".handwriting-canvas");
    const dimensions = await canvas.evaluate((element) => ({
      width: Number(element.dataset["pageWidth"]),
      height: Number(element.dataset["pageHeight"]),
    }));
    const geometry = async () => {
      const box = (await canvas.boundingBox())!;
      const bounds = await text.evaluate((element) => ({
        x: parseFloat(element.style.left),
        y: parseFloat(element.style.top),
        width: parseFloat(element.style.width),
        height: parseFloat(element.style.height),
      }));
      return {
        box,
        x: box.x + (bounds.x / 100) * box.width,
        y: box.y + (bounds.y / 100) * box.height,
        width: (bounds.width / 100) * box.width,
        height: (bounds.height / 100) * box.height,
        scale: box.width / dimensions.width,
      };
    };
    let item = await geometry();
    const toolbar = editor.locator(".handwriting-selection-float");
    await expect(toolbar).toBeVisible();
    const beforeFont = await text
      .locator("textarea")
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    // A alça fica fora do objeto, preservando o corpo como área de arrasto.
    const pad = 12 * item.scale;
    await page.evaluate(() => {
      const frames: number[] = [];
      let previous = performance.now();
      let active = true;
      window.addEventListener(
        "selection-profile-stop",
        () => {
          active = false;
        },
        { once: true },
      );
      requestAnimationFrame(function sample(now) {
        frames.push(now - previous);
        previous = now;
        if (active) requestAnimationFrame(sample);
        else performance.measure("selection-profile", { start: 0, end: 1, detail: frames });
      });
    });
    await page.mouse.move(item.x + item.width + pad, item.y + item.height / 2);
    await page.mouse.down();
    await page.mouse.move(item.x + item.width + pad + 35, item.y + item.height / 2, { steps: 8 });
    await expect(toolbar).toBeHidden();
    await page.mouse.up();
    await page.evaluate(() => window.dispatchEvent(new Event("selection-profile-stop")));
    await page.waitForFunction(() => performance.getEntriesByName("selection-profile").length > 0);
    const frames = await page.evaluate(
      () =>
        (performance.getEntriesByName("selection-profile")[0] as PerformanceMeasure)
          .detail as number[],
    );
    const sortedFrames = frames.slice(1).sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        theme,
        device: info.project.name,
        frames: sortedFrames.length,
        p95: sortedFrames[Math.floor(sortedFrames.length * 0.95)],
      }),
    );
    await info.attach("selection-frame-times", {
      body: JSON.stringify(frames),
      contentType: "application/json",
    });
    await expect(toolbar).toBeVisible();
    expect(
      await text
        .locator("textarea")
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeCloseTo(beforeFont, 1);
    expect((await geometry()).width).toBeGreaterThan(item.width + 20);
    item = await geometry();
    await page.mouse.move(item.x + item.width + pad, item.y + item.height + pad);
    await page.mouse.down();
    await page.mouse.move(item.x + item.width + pad + 25, item.y + item.height + pad + 25, {
      steps: 8,
    });
    await page.mouse.up();
    const enlargedFont = await text
      .locator("textarea")
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(enlargedFont).toBeGreaterThan(beforeFont);
    await editor.getByRole("button", { name: "Adicionar post-it", exact: true }).click();
    const note = editor.locator(".handwriting-sticky--yellow").last();
    await note.locator("textarea").fill("Destino do estilo");
    const background = await note.evaluate((element) => getComputedStyle(element).backgroundColor);
    if (
      (await editor
        .getByRole("button", { name: "Selecionar traços", exact: true })
        .getAttribute("aria-pressed")) !== "true"
    )
      await editor.getByRole("button", { name: "Selecionar traços", exact: true }).click();
    item = await geometry();
    await page.mouse.click(item.box.x + item.box.width - 20, item.box.y + 20);
    await page.mouse.click(item.x + item.width / 2, item.y + 2);
    await expect(text).toHaveClass(/is-selected/);
    await editor.getByRole("button", { name: "Copiar estilo do texto", exact: true }).click();
    const target = (await note.boundingBox())!;
    await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
    expect(await note.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      background,
    );
    expect(
      await note
        .locator("textarea")
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeCloseTo(enlargedFont, 1);
    const historyToggle = editor.getByRole("button", { name: "Histórico e zoom", exact: true });
    if (await historyToggle.isVisible()) await historyToggle.click();
    await editor.getByRole("button", { name: "Desfazer", exact: true }).click();
    await expect
      .poll(() =>
        note
          .locator("textarea")
          .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
      )
      .toBeCloseTo(beforeFont, 1);
    await editor.getByRole("button", { name: "Refazer", exact: true }).click();
    await expect
      .poll(() =>
        note
          .locator("textarea")
          .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
      )
      .toBeCloseTo(enlargedFont, 1);
    await expect
      .poll(async () =>
        page.evaluate(() =>
          Object.keys(localStorage)
            .filter((key) => key.startsWith("helenastudy.handwriting.draft."))
            .some((key) => (localStorage.getItem(key) ?? "").includes('"textSize":')),
        ),
      )
      .toBe(true);
    if (await historyToggle.isVisible()) await historyToggle.click();
    item = await geometry();
    if (info.project.name === "mobile")
      await page.touchscreen.tap(item.x + item.width / 2, item.y + 2);
    else await page.mouse.click(item.x + item.width / 2, item.y + 2);
    await expect(toolbar).toBeVisible();
    const toolbarBounds = (await toolbar.boundingBox())!;
    const viewportBounds = (await editor.locator(".handwriting-viewport").boundingBox())!;
    expect(toolbarBounds.x).toBeGreaterThanOrEqual(viewportBounds.x);
    expect(toolbarBounds.x + toolbarBounds.width).toBeLessThanOrEqual(
      viewportBounds.x + viewportBounds.width + 1,
    );
    await toolbar.locator("summary").click();
    await expect(toolbar.locator('[data-paper-editor-icon="copyLink"]')).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(140, 196, 234)" : "rgb(38, 91, 162)",
    );
    await expect(toolbar.locator('[data-paper-editor-icon="trash"]')).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(255, 159, 186)" : "rgb(195, 52, 102)",
    );
    const menu = toolbar.locator(".handwriting-selection-float__menu");
    await expect(menu).toBeVisible();
    await expect(menu.locator('[data-paper-editor-icon="cut"] use')).toHaveAttribute(
      "href",
      "/navigation-icons/paper/notebook-cut.svg#art",
    );
    expect(await menu.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(
      await editor
        .locator(".handwriting-sticky__resize, .handwriting-sticky__menu-trigger")
        .count(),
    ).toBe(0);
    await expect(editor.getByRole("button", { name: "Copiar", exact: true })).toHaveCount(1);
    await editor.screenshot({ path: info.outputPath(`selection-menu-${theme}.png`) });
    const pendingDownload = page.waitForEvent("download");
    await toolbar.getByRole("button", { name: "Baixar seleção em PNG", exact: true }).click();
    const download = await pendingDownload;
    expect(download.suggestedFilename()).toBe("selecao-do-caderno.png");
    expect(await download.failure()).toBeNull();
    const viewport = editor.locator(".handwriting-viewport");
    await viewport.evaluate((element) => element.scrollTo({ top: 40, behavior: "instant" }));
    await expect
      .poll(async () => {
        const bar = await toolbar.boundingBox();
        const view = await viewport.boundingBox();
        return Boolean(
          bar && view && bar.y >= view.y && bar.y + bar.height <= view.y + view.height,
        );
      })
      .toBe(true);
    await canvas.focus();
    await page.keyboard.press("Control+=");
    await expect
      .poll(async () => {
        const bar = await toolbar.boundingBox();
        const view = await viewport.boundingBox();
        return Boolean(
          bar && view && bar.x >= view.x && bar.x + bar.width <= view.x + view.width + 1,
        );
      })
      .toBe(true);
    await page.keyboard.press("Control+0");
    await editor.screenshot({ path: info.outputPath(`selection-${theme}.png`) });
    await editor.getByRole("button", { name: "Salvar caderno", exact: true }).click();
    await editor.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByRole("button", { name: /^Abrir preview de / }).click();
    const restoredText = page
      .getByRole("dialog", { name: "Escrever à mão", exact: true })
      .locator(".handwriting-sticky--text textarea")
      .first();
    await expect(restoredText).toHaveValue("Texto para conferir largura e tamanho da fonte.");
    expect(
      await restoredText.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeCloseTo(enlargedFont, 1);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<string | undefined>((resolve) => {
              const request = indexedDB.open("helenastudy", 1);
              request.onerror = () => resolve(undefined);
              request.onsuccess = () => {
                const database = request.result;
                const read = database
                  .transaction("workspace", "readonly")
                  .objectStore("workspace")
                  .get("current");
                read.onsuccess = () => {
                  resolve(read.result as string | undefined);
                  database.close();
                };
                read.onerror = () => {
                  resolve(undefined);
                  database.close();
                };
              };
            }),
        ),
      )
      .toContain('"textSize":');
    await page
      .getByRole("dialog", { name: "Escrever à mão", exact: true })
      .getByRole("button", { name: "Fechar", exact: true })
      .click();
    await page.reload();
    await page.locator(".notebook-spine").first().click();
    await page.getByRole("button", { name: /^Abrir preview de / }).click();
    const reloaded = page
      .getByRole("dialog", { name: "Escrever à mão", exact: true })
      .locator(".handwriting-sticky--text textarea")
      .first();
    await expect(reloaded).toHaveValue("Texto para conferir largura e tamanho da fonte.");
    expect(
      await reloaded.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ).toBeCloseTo(enlargedFont, 1);
    const activeEditor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
    await activeEditor.getByRole("button", { name: "Adicionar tabela", exact: true }).click();
    const table = activeEditor.locator(".handwriting-sticky--table").last();
    await expect(table).toHaveClass(/is-selected/);
    await expect(
      activeEditor.getByRole("button", { name: "Selecionar traços", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    if (info.project.name === "desktop") {
      const beforeX = await table.evaluate((element) => element.style.left);
      const box = (await table.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 32, box.y + box.height / 2 + 20, { steps: 8 });
      await page.mouse.up();
      await expect.poll(() => table.evaluate((element) => element.style.left)).not.toBe(beforeX);
      const moved = (await table.boundingBox())!;
      await page.mouse.click(moved.x + moved.width / 2, moved.y + moved.height / 2);
      await expect(activeEditor.locator(".handwriting-studio")).toHaveAttribute(
        "data-tool",
        "text",
      );
      await table.locator("textarea").first().fill("Célula editada");
      await expect(activeEditor.locator(".handwriting-selection-actions > button")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(table.locator("textarea").first()).toHaveValue("Célula editada");
    }
    await activeEditor.getByRole("button", { name: "Adicionar linha", exact: true }).click();
    await expect(table.locator("textarea")).toHaveCount(12);
    const rowActionColor = await activeEditor
      .getByRole("button", { name: "Adicionar linha", exact: true })
      .evaluate((element) => getComputedStyle(element).color);
    if (theme === "light") expect(rowActionColor).not.toBe("rgb(255, 249, 239)");
    else expect(rowActionColor).toBe("rgb(255, 249, 239)");
    const grid = table.locator(".handwriting-sticky__table-grid");
    expect(await grid.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(
      true,
    );
    await activeEditor.getByRole("button", { name: "Adicionar post-it", exact: true }).click();
    const editableNote = activeEditor.locator(".handwriting-sticky--yellow").last();
    const noteBox = (await editableNote.boundingBox())!;
    await page.mouse.click(noteBox.x + noteBox.width / 2, noteBox.y + noteBox.height / 2);
    await expect(activeEditor.locator(".handwriting-studio")).toHaveAttribute("data-tool", "text");
    await editableNote.locator("textarea").fill("Post-it editável pelo clique");
    await expect(editableNote.locator("textarea")).toHaveValue("Post-it editável pelo clique");
  });
}
