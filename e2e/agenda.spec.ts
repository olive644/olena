import { expect, test } from "@playwright/test";
import { createInitialWorkspace, toDateKey } from "../src/domain/workspace";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("agenda-test-initialized")) {
      localStorage.clear();
      sessionStorage.setItem("agenda-test-initialized", "1");
    }
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.route("**/api/google-calendar**", (route) =>
    route.fulfill({ json: { connected: false } }),
  );
});
test("agenda creates, edits, completes, reschedules and persists tasks on desktop and mobile", async ({
  page,
}, info) => {
  await page.goto("/planejador");
  await expect(page.getByRole("heading", { name: "Minha agenda" })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
  await form.getByRole("textbox", { name: "Título", exact: true }).fill("Revisar frações");
  await form.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(form).not.toBeVisible();
  await page.getByRole("button", { name: "Editar Revisar frações" }).click();
  await page.getByRole("textbox", { name: "Título", exact: true }).fill("Revisar porcentagens");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.getByRole("button", { name: "Concluir Revisar porcentagens" }).click();
  await expect(page.getByRole("button", { name: "Reabrir Revisar porcentagens" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Reabrir Revisar porcentagens" })).toBeVisible();
  await page.getByRole("button", { name: "Semana", exact: true }).click();
  await expect(page.getByRole("region", { name: "Plano da semana" })).toBeVisible();
  await page.getByRole("button", { name: "Mês", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Calendário mensal" }).getByRole("button"),
  ).toHaveCount(42);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath(`agenda-${info.project.name}.png`) });
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "dark";
  });
  await expect(page.locator(".agenda-month-grid button").nth(10)).toHaveCSS(
    "background-color",
    "rgb(41, 36, 50)",
  );
  await page.screenshot({ path: info.outputPath(`agenda-${info.project.name}-dark.png`) });
});
test("weekly study opens focus without completing, records real minutes and returns to agenda", async ({
  page,
}) => {
  await page.goto("/planejador");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
  await form.getByLabel("Tipo", { exact: true }).selectOption("study");
  await form.getByRole("textbox", { name: "Título", exact: true }).fill("Estudar frações");
  await form.getByLabel("Duração em minutos").fill("1");
  await form.getByLabel("Repetir", { exact: true }).selectOption("weekly");
  await form.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByRole("button", { name: "Começar estudo Estudar frações" }).click();
  await expect(page).toHaveURL(/\/foco/);
  await expect(page.getByRole("region", { name: "Estudo da agenda" })).toContainText(
    "Meta de 1 min",
  );
  await expect(page.getByRole("button", { name: "Encerrar e registrar" })).toBeDisabled();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).events[0].completedDates,
    ),
  ).toBeUndefined();
  // Resume a genuinely elapsed minute, rather than waiting a minute in every browser run.
  await page.evaluate(() => {
    const key = "olena.focus-session.v1";
    const session = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(
      key,
      JSON.stringify({ ...session, running: false, elapsedMilliseconds: 61_000 }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: "Encerrar e registrar" }).click();
  const navigation = page
    .getByRole("navigation", { name: /Navegação (principal|móvel)/ })
    .filter({ visible: true });
  await navigation.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByText("Concluído", { exact: true })).toBeVisible();
});
test("overdue tasks move to today and Helena only gets a draft after user action", async ({
  page,
}) => {
  const state = createInitialWorkspace();
  state.tasks = [
    {
      id: "past",
      title: "Entrega pendente",
      subjectId: state.subjects[0]!.id,
      dueDate: "2020-01-01",
      completed: false,
    },
  ];
  await page.addInitScript(
    (workspace) => localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace)),
    state,
  );
  await page.goto("/planejador");
  await page.getByRole("button", { name: "Mover Entrega pendente para hoje" }).click();
  await expect(page.getByRole("button", { name: "Concluir Entrega pendente" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Helena", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Planejar com Helena" }).click();
  await expect(page.getByRole("dialog", { name: "Helena", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Escreva para a Helena" })).toHaveValue(
    /Não altere minha agenda/,
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).tasks[0].dueDate,
    ),
  ).toBe(toDateKey(new Date()));
});
