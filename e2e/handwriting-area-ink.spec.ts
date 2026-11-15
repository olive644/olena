import { expect, test } from "@playwright/test";
import { createInitialWorkspace, workspaceReducer } from "../src/domain/workspace";

for (const pointerType of ["mouse", "pen", "touch"]) {
  test(`tinta acompanha ${pointerType} e borracha recorta área com desfazer`, async ({ page }) => {
    let workspace = workspaceReducer(createInitialWorkspace(), {
      type: "notebook/added",
      id: "ink",
      title: "Tinta",
      subjectId: "",
      createdAt: "2026-09-26",
    });
    workspace = workspaceReducer(workspace, {
      type: "note/added",
      id: "sheet",
      notebookId: "ink",
      subjectId: "",
      updatedAt: "2026-09-26",
    });
    await page.addInitScript((state) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
      localStorage.setItem(
        "helena.notebookPreferences.v1",
        JSON.stringify({ shapeSnap: false, penOnly: false }),
      );
    }, workspace);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cadernos");
    await page.locator(".notebook-card").filter({ hasText: "Tinta" }).click();
    await page.getByRole("button", { name: /^Abrir preview/ }).click();
    const editor = page.getByRole("dialog", { name: "Escrever à mão" });
    const canvas = editor.locator(".handwriting-canvas");
    await expect(canvas).toBeVisible();
    // Eventos sintéticos permitem verificar os três caminhos de entrada no mesmo
    // navegador. A captura de ponteiro real continua coberta pelos testes de gesto.
    await canvas.evaluate((element) => {
      element.setPointerCapture = () => {};
    });
    const send = async (type: string, x: number, y: number) => {
      await canvas.evaluate(
        (element, input) => {
          const bounds = element.getBoundingClientRect();
          element.dispatchEvent(
            new PointerEvent(input.type, {
              bubbles: true,
              pointerId: 21,
              pointerType: input.pointerType,
              button: 0,
              buttons: input.type === "pointerup" ? 0 : 1,
              pressure: input.type === "pointerup" ? 0 : 0.5,
              clientX: bounds.x + (input.x / Number(element.dataset["pageWidth"])) * bounds.width,
              clientY: bounds.y + (input.y / Number(element.dataset["pageHeight"])) * bounds.height,
            }),
          );
        },
        { type, x, y, pointerType },
      );
    };
    await send("pointerdown", 100, 300);
    // Um traço de verdade tem um ponto a cada poucos milissegundos. Com poucos pontos e saltos
    // enormes, a largura (que afina nas pontas) seria interpolada pelo traço inteiro.
    for (let x = 120; x <= 300; x += 20) await send("pointermove", x, 300);
    const tipVisible = await editor.locator(".handwriting-live-layer").evaluate(async (element) => {
      await new Promise(requestAnimationFrame);
      const canvas = element as HTMLCanvasElement;
      const scale = canvas.width / Number(canvas.dataset["pageWidth"]);
      const data = canvas
        .getContext("2d")!
        .getImageData(
          Math.floor(294 * scale),
          Math.floor(294 * scale),
          Math.ceil(12 * scale),
          Math.ceil(12 * scale),
        ).data;
      return data.some((value, index) => index % 4 === 3 && value > 0);
    });
    expect(tipVisible).toBe(true);
    for (let x = 320; x <= 580; x += 20) await send("pointermove", x, 300);
    // Esta posição só chega ao levantar: precisa ser preservada no traço final.
    await send("pointerup", 600, 300);
    // A tinta confirmada fica na camada transparente da folha, não na que recebe o ponteiro.
    const sheet = editor.locator(".handwriting-committed-ink");
    // Mouse e dedo afinam a ponta do traço de propósito (largura pela velocidade): ali a tinta é
    // um fio e o alfa fica baixo. A caneta mantém a espessura até o fim.
    const inkAt = async (x: number, minAlpha = 200) =>
      sheet.evaluate(
        (element, [position, alpha]) => {
          const canvas = element as HTMLCanvasElement;
          const scale = canvas.width / Number(canvas.dataset["pageWidth"]);
          const data = canvas
            .getContext("2d")!
            .getImageData(
              Math.floor((position - 4) * scale),
              Math.floor(296 * scale),
              Math.ceil(8 * scale),
              Math.ceil(8 * scale),
            ).data;
          for (let i = 0; i < data.length; i += 4)
            if (data[i + 3]! > alpha! && data[i]! < 80 && data[i + 1]! < 80 && data[i + 2]! < 80)
              return true;
          return false;
        },
        [x, minAlpha] as const,
      );
    await expect.poll(() => inkAt(597, pointerType === "pen" ? 200 : 20)).toBe(true);
    await editor.getByRole("button", { name: "Borracha", exact: true }).click();
    await send("pointerdown", 350, 200);
    await send("pointermove", 350, 400);
    await send("pointerup", 350, 400);
    await expect.poll(() => inkAt(350)).toBe(false);
    expect(await inkAt(150)).toBe(true);
    expect(await inkAt(550)).toBe(true);
    const history = editor.getByRole("button", { name: "Histórico e zoom", exact: true });
    if (await history.isVisible()) await history.click();
    await editor.getByRole("button", { name: "Desfazer", exact: true }).click();
    await expect.poll(() => inkAt(350)).toBe(true);
    await editor.getByRole("button", { name: "Refazer", exact: true }).click();
    await expect.poll(() => inkAt(350)).toBe(false);
    await editor.getByRole("button", { name: "Fechar", exact: true }).click();
    const closeConfirmation = page.getByRole("alertdialog", {
      name: "Fechar folha com alterações",
    });
    if (await closeConfirmation.isVisible())
      await closeConfirmation.getByRole("button", { name: "Fechar e manter rascunho" }).click();
    await page.getByRole("button", { name: /^Abrir preview/ }).click();
    await expect(canvas).toBeVisible();
    await expect.poll(() => inkAt(350)).toBe(false);
    await expect.poll(() => inkAt(150)).toBe(true);
    expect(await inkAt(550)).toBe(true);
  });
}
