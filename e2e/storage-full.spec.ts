import { expect, test } from "@playwright/test";

test("com o armazenamento do navegador cheio o app segue de pé e avisa", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A cota é a mesma nos dois projetos.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.evaluate(() => {
    // Sem o histórico de versões (que cede lugar) para o espaço realmente faltar.
    localStorage.removeItem("helenastudy.workspace.history.v1");
    for (const chunk of ["x".repeat(1024), "y"]) {
      for (let index = 0; index < 20000; index += 1) {
        try {
          localStorage.setItem(`zz-fill-${chunk.length}-${index}`, chunk);
        } catch {
          break;
        }
      }
    }
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Com cota cheia");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "sem espaço" })).toBeVisible();
  // O caderno continua na tela: o app não ficou em branco.
  await expect(page.getByRole("heading", { name: "Com cota cheia" })).toBeVisible();
  expect(errors).toEqual([]);
});
