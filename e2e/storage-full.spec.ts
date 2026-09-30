import { expect, test } from "@playwright/test";

// Os dois testes abaixo enchem o localStorage até a cota: rodar em paralelo (cada um no seu
// próprio contexto de navegador, mas disputando o mesmo disco) pode fazer o IndexedDB do
// primeiro teste também esbarrar num limite passageiro. Em série, cada um sai do caminho do
// outro.
test.describe.configure({ mode: "serial" });

function fillLocalStorageToQuota() {
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
}

test("com o armazenamento cheio mas o IndexedDB disponível, o app salva de verdade e não avisa", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A cota é a mesma nos dois projetos.");
  await page.addInitScript(() =>
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true })),
  );
  await page.goto("/cadernos");
  await page.evaluate(fillLocalStorageToQuota);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Com cota cheia");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Com cota cheia" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "sem espaço" })).toHaveCount(0);
  // A gravação no IndexedDB é assíncrona: espera ela realmente terminar antes de recarregar,
  // para não confundir uma gravação ainda em andamento com uma falha de verdade.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string | undefined>((resolve) => {
            const request = indexedDB.open("helenastudy", 1);
            request.onerror = () => resolve(undefined);
            request.onsuccess = () => {
              const read = request.result
                .transaction("workspace", "readonly")
                .objectStore("workspace")
                .get("current");
              read.onsuccess = () => resolve(read.result as string | undefined);
              read.onerror = () => resolve(undefined);
            };
          }),
      ),
    )
    .toContain("Com cota cheia");
  // O IndexedDB é quem garante o salvamento de verdade agora: recarregar a página (sem nada
  // no localStorage além do que já estava cheio, que volta à lista de cadernos) ainda mostra
  // o caderno criado.
  await page.reload();
  await expect(page.getByRole("button", { name: "Abrir Com cota cheia" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("sem localStorage nem IndexedDB disponíveis, o app segue de pé e avisa", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "A cota é a mesma nos dois projetos.");
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    // Simula um navegador sem IndexedDB (como em alguns modos de navegação privada), para o
    // localStorage cheio a seguir não ter mais para onde salvar de verdade.
    Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true });
  });
  await page.goto("/cadernos");
  await page.evaluate(fillLocalStorageToQuota);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Sem onde salvar");
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "sem espaço" })).toBeVisible();
  // O caderno continua na tela: o app não ficou em branco.
  await expect(page.getByRole("heading", { name: "Sem onde salvar" })).toBeVisible();
  expect(errors).toEqual([]);
});
