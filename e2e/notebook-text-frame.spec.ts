import { expect, test } from "@playwright/test";

test("a caixa de texto move, redimensiona e mantém a posição ao trocar de folha", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/");
  if (info.project.name === "mobile") {
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
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await editor.getByRole("button", { name: "Texto na página inteira" }).click();
  await editor
    .getByRole("textbox", { name: "Texto da página inteira" })
    .fill("Texto que acompanha a caixa");
  await editor.getByRole("button", { name: "Aumentar tamanho do texto" }).click();
  await expect(editor.getByLabel("Tamanho do texto", { exact: true })).toContainText("30px");
  const frame = editor.locator(".handwriting-text-frame");
  const before = await frame.boundingBox();
  const move = await editor.getByRole("button", { name: "Mover caixa de texto" }).boundingBox();
  await page.mouse.move(move!.x + move!.width / 2, move!.y + move!.height / 2);
  await page.mouse.down();
  await page.mouse.move(move!.x + move!.width / 2 + 35, move!.y + move!.height / 2 + 25, {
    steps: 4,
  });
  await page.mouse.up();
  const moved = await frame.boundingBox();
  expect(moved!.x).toBeGreaterThan(before!.x + 20);
  expect(moved!.y).toBeGreaterThan(before!.y + 10);

  const resize = await editor
    .getByRole("button", { name: "Redimensionar caixa de texto" })
    .boundingBox();
  await page.mouse.move(resize!.x + resize!.width / 2, resize!.y + resize!.height / 2);
  await page.mouse.down();
  await page.mouse.move(resize!.x + resize!.width / 2 - 45, resize!.y + resize!.height / 2 - 30, {
    steps: 4,
  });
  await page.mouse.up();
  const resized = await frame.boundingBox();
  expect(resized!.width).toBeLessThan(moved!.width - 20);
  expect(resized!.height).toBeLessThan(moved!.height - 10);
  await page.screenshot({ path: info.outputPath("texto-ajustado.png") });
  await editor.getByRole("button", { name: "Criar próxima folha" }).click();
  await editor.getByRole("button", { name: "Folha anterior" }).click();
  await editor.getByRole("button", { name: "Texto na página inteira" }).click();
  await expect(editor.getByRole("textbox", { name: "Texto da página inteira" })).toHaveValue(
    "Texto que acompanha a caixa",
  );
  const restored = await frame.boundingBox();
  expect(restored!.x).toBeCloseTo(resized!.x, 0);
  expect(restored!.width).toBeCloseTo(resized!.width, 0);
});
