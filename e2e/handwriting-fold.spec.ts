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
});
