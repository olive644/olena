import { activateHandwritingPen, openHandwritingA4 } from "./notebook-helpers";
import { expect, test } from "@playwright/test";

// O canto de cima à direita da folha é cortado (a "dobra"). Ali não há papel: o toque não pode
// chegar às camadas de escrita nem deixar tinta.
test("a dobra do canto da folha não aceita escrita", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxo de desenho verificado no desktop.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.locator(".notebook-spine").first().click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  await openHandwritingA4(page);
  const dialog = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await activateHandwritingPen(page);
  const shell = dialog.locator(".handwriting-page-shell");
  await shell.scrollIntoViewIfNeeded();
  // A folha se ajusta à janela logo depois de abrir.
  await page.waitForTimeout(800);
  const box = (await shell.boundingBox())!;
  const hit = (x: number, y: number) =>
    page.evaluate(
      ([px, py]) => {
        const element = document.elementFromPoint(px!, py!);
        return element instanceof HTMLCanvasElement ? "canvas" : (element?.className ?? "nada");
      },
      [x, y],
    );
  // Dentro do triângulo cortado (perto da quina) não há camada de escrita; logo ao lado, há.
  expect(await hit(box.x + box.width - 6, box.y + 6)).not.toBe("canvas");
  expect(await hit(box.x + box.width - 50, box.y + 6)).toBe("canvas");
  expect(await hit(box.x + box.width - 6, box.y + 60)).toBe("canvas");

  // Começar o traço no triângulo cortado não escreve nada.
  const ink = () =>
    dialog.locator(".handwriting-committed-ink").evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      let count = 0;
      for (let index = 3; index < data.length; index += 4) if (data[index]! > 200) count += 1;
      return count;
    });
  await page.mouse.move(box.x + box.width - 6, box.y + 6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 6, box.y + 90, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  expect(await ink()).toBe(0);

  // A dobra (::after) fica acima de todas as camadas de escrita e não pega toque: é o que esconde
  // tinta que já estivesse no triângulo (a tinta fica acima do ::after da dobra no empilhamento).
  const cover = await shell.evaluate((element) => {
    const style = getComputedStyle(element, "::after");
    return { z: Number(style.zIndex), events: style.pointerEvents, content: style.content };
  });
  expect(cover.events).toBe("none");
  expect(cover.z).toBeGreaterThan(5);
  expect(cover.content).not.toBe("none");

  // Um traço que começa no papel e entra na dobra para no limite do triângulo: nenhum ponto dentro
  // do triângulo entra no traço.
  const inTriangleAndElsewhere = () =>
    dialog.locator(".handwriting-committed-ink").evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const fold = Math.ceil((34 * canvas.width) / rect.width);
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      let inside = 0;
      let outside = 0;
      for (let y = 0; y < canvas.height; y += 1)
        for (let x = 0; x < canvas.width; x += 1) {
          if (data[(y * canvas.width + x) * 4 + 3]! <= 40) continue;
          const fromRight = canvas.width - x;
          if (y < fold && fromRight + y < fold - 2) inside += 1;
          else outside += 1;
        }
      return { inside, outside };
    });
  await page.mouse.move(box.x + box.width - 90, box.y + 120);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 8, box.y + 6, { steps: 14 });
  await page.mouse.move(box.x + box.width - 30, box.y + 70, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const dragged = await inTriangleAndElsewhere();
  expect(dragged.outside).toBeGreaterThan(100);
  expect(dragged.inside).toBe(0);
});
