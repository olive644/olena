import { expect, test } from "@playwright/test";
for (const theme of ["light", "dark"]) {
  test(`pautas amplas e lacre sem medalhão ${theme}`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/cadernos");
    for (const name of ["Crie", "Criar caderno"])
      await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("button", { name: "Editar prateleira", exact: true }).click();
    await page
      .getByRole("button", { name: "Inspecionar caderno Meu caderno", exact: true })
      .click();
    const details = page.getByRole("dialog", { name: "Meu caderno", exact: true });
    await expect(details.locator(".book-cover__clasp > i")).toHaveCount(0);
    await expect(details.locator(".book-cover__clasp-edge")).toHaveCount(1);
    await details.screenshot({ path: info.outputPath("lacre.png") });
    await details.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByRole("button", { name: "Cancelar edição da prateleira", exact: true }).click();
    await page.getByRole("button", { name: "Abrir Meu caderno", exact: true }).click();
    await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
    const pen = editor.getByRole("button", { name: "Caneta", exact: true });
    const inkOptions = editor.locator(".handwriting-ink-options");
    await expect(inkOptions).toHaveCount(0);
    await pen.click();
    await expect(pen).toHaveAttribute("aria-pressed", "true");
    await expect(inkOptions).toHaveCount(0);
    await pen.click();
    await expect(inkOptions).toBeVisible();
    await pen.click();
    await expect(inkOptions).toHaveCount(0);
    for (const name of ["Marca-texto", "Borracha", "Régua", "Sistema de coordenadas", "Curva"]) {
      const control = editor.getByRole("button", { name, exact: true });
      const studio = editor.locator(".handwriting-studio");
      await control.click();
      await expect(control.locator(".handwriting-tool-disclosure")).toBeVisible();
      await expect(studio).toHaveAttribute("data-tool-options", "false");
      await expect(inkOptions).toHaveCount(0);
      await control.click();
      await expect(studio).toHaveAttribute("data-tool-options", "true");
      await expect(inkOptions.getByRole("slider").first()).toBeVisible();
      await control.click();
      await expect(studio).toHaveAttribute("data-tool-options", "false");
    }
    const fileTools = editor.locator(".notebook-file-tools");
    await expect(fileTools.getByRole("button")).toHaveCount(4);
    // No celular as ferramentas de arquivo dividem a placa da barra de cima (sem fundo próprio).
    await expect(fileTools).toHaveCSS(
      "background-image",
      info.project.name === "mobile" ? "none" : /linear-gradient/,
    );
    expect((await fileTools.boundingBox())!.width).toBeLessThan(280);
    const save = fileTools.getByRole("button", { name: "Salvar caderno", exact: true });
    await save.hover();
    await expect(editor.locator(".handwriting-tool-tip")).toHaveText("Salvar caderno");
    const disclosure = editor.locator(".handwriting-paper-disclosure");
    await expect(editor.locator(":scope > header")).toBeHidden();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    const sheet = editor.locator(".handwriting-page-shell");
    const viewport = editor.locator(".handwriting-viewport");
    if (info.project.name === "mobile") {
      // No celular a folha cobre a altura da janela e o excesso de largura se alcança arrastando.
      await expect
        .poll(async () =>
          sheet.evaluate((node) => {
            const parent = node.parentElement!;
            const box = node.getBoundingClientRect();
            return box.height >= parent.clientHeight - 1 && box.width >= parent.clientWidth - 1;
          }),
        )
        .toBe(true);
    } else {
      await expect
        .poll(async () =>
          sheet.evaluate((node) => {
            const parent = node.parentElement!;
            const style = getComputedStyle(parent);
            return Math.abs(
              node.getBoundingClientRect().width -
                parent.clientWidth +
                parseFloat(style.paddingLeft) +
                parseFloat(style.paddingRight),
            );
          }),
        )
        .toBeLessThanOrEqual(1);
    }
    if (info.project.name === "desktop") {
      const before = await disclosure.boundingBox();
      await disclosure.hover();
      expect((await disclosure.boundingBox())?.y).toBe(before?.y);
    }
    await expect(viewport).toBeVisible();

    if (info.project.name === "mobile") {
      // No celular os papéis ficam sempre à mostra: a seta de recolher só existe no desktop.
      await expect(disclosure).toBeHidden();
    } else {
      await disclosure.click();
      await expect(editor.getByRole("button", { name: "Tipo de papel", exact: true })).toHaveCount(
        0,
      );
      await disclosure.click();
      await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    }

    const picker = editor.getByRole("button", { name: "Tipo de papel", exact: true });
    await expect(picker).toHaveCSS(
      "background-image",
      info.project.name === "mobile" ? "none" : /linear-gradient/,
    );
    await expect(picker.locator(".focus-paper-arrow")).toHaveCSS("rotate", "-90deg");
    const canvas = editor.locator(".handwriting-viewport canvas").first();
    const dimensions = () =>
      canvas.evaluate((el) => ({
        width: el.dataset["pageWidth"],
        height: el.dataset["pageHeight"],
      }));
    await expect.poll(dimensions).toEqual({ width: "3200", height: "2400" });
    for (const name of [
      "Quadro amplo",
      "Pautado",
      "Quadriculado",
      "Em branco",
      "Calendário",
      "Cornell",
    ]) {
      await editor.getByRole("button", { name: "Tipo de papel", exact: true }).click();
      const options = editor.locator(".handwriting-paper-options");
      await expect(options.getByRole("button")).toHaveCount(6);
      for (const removed of ["Pontilhado", "Plano semanal", "Pauta musical"])
        await expect(options.getByRole("button", { name: removed, exact: true })).toHaveCount(0);
      const sizes = await options.locator(".paper-preview").evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return [r.width, r.height];
        }),
      );
      expect(sizes.every((size) => size[0] === sizes[0]![0] && size[1] === sizes[0]![1])).toBe(
        true,
      );
      await options.getByRole("button", { name, exact: true }).click();
      await expect.poll(dimensions).toEqual({ width: "3200", height: "2400" });
    }
    if (info.project.name === "desktop") {
      await picker.click();
      await editor.getByRole("button", { name: "Quadro amplo", exact: true }).click();
      await editor.getByRole("button", { name: "Borracha", exact: true }).click();
      const sample = () =>
        canvas.evaluate((el: HTMLCanvasElement) => {
          const context = el.getContext("2d")!;
          const scale = el.width / 3200;
          return [72, 84].map((x) =>
            Array.from(
              context.getImageData(Math.round(x * scale), Math.round(72 * scale), 1, 1).data,
            ),
          );
        });
      const dots = await sample();
      expect(dots[0]).not.toEqual(dots[1]);
      const bounds = (await canvas.boundingBox())!;
      await page.mouse.move(bounds.x + 30, bounds.y + 30);
      await page.mouse.down();
      try {
        await page.mouse.move(bounds.x + 120, bounds.y + 42, { steps: 12 });
        expect(await sample()).toEqual(dots);
        expect(await canvas.boundingBox()).toEqual(bounds);
      } finally {
        await page.mouse.up();
      }
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const transition = editor.locator(".handwriting-paper-transition");
    await editor.getByRole("button", { name: "Cor da folha", exact: true }).click();
    await editor.getByRole("button", { name: "Papel de livro", exact: true }).click();
    await expect(transition).toBeVisible();
    await expect(transition).toHaveCount(0);
    await editor.getByRole("button", { name: "Tipo de papel", exact: true }).click();
    await editor.getByRole("button", { name: "Pautado", exact: true }).click();
    await expect(transition).toBeVisible();
    await expect(transition).toHaveCount(0);
    await editor.screenshot({ path: info.outputPath("folha-ampla.png") });
    await editor.getByRole("button", { name: "Salvar caderno", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Abrir Meu caderno", exact: true }).click();
    await page
      .getByRole("button", { name: /^Abrir preview de/ })
      .first()
      .click();
    await expect.poll(dimensions).toEqual({ width: "3200", height: "2400" });
  });
}
