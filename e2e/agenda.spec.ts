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
  await expect(page.getByRole("button", { name: "Calendário", exact: true })).toBeVisible();
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
  await page.getByRole("button", { name: "Calendário", exact: true }).click();
  const count = await page.locator(".agenda-month-grid button").count();
  expect([35, 42]).toContain(count);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: info.outputPath(`agenda-${info.project.name}.png`),
    animations: "disabled",
  });
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "dark";
  });
  await expect(page.locator(".agenda-month-grid button").nth(10)).toHaveCSS(
    "background-color",
    "rgb(41, 36, 50)",
  );
  await page.screenshot({ path: info.outputPath(`agenda-${info.project.name}-dark.png`) });
});

test("calendar icon opens a compact date picker with the selected day's planning below", async ({
  page,
}) => {
  await page.goto("/planejador");
  const toggle = page.getByRole("button", { name: "Calendário", exact: true });
  const calendar = page.getByRole("region", { name: "Calendário mensal" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(calendar).toHaveCount(0);
  await expect(page.getByText("Estudos, tarefas e compromissos em um só lugar.")).toHaveCount(0);
  for (const name of ["Hoje", "Semana", "Mês", "Período anterior", "Próximo período"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await calendar.getByRole("button", { name: "Escolher mês", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Escolher mês e ano" });
  await picker.getByLabel("Ano", { exact: true }).fill("2027");
  await picker.getByRole("button", { name: "fevereiro", exact: true }).click();
  await expect(picker).not.toBeVisible();
  await calendar.getByRole("button", { name: "segunda-feira, 15 de fevereiro, 0 itens" }).click();
  await expect(page.locator("#agenda-day-title")).toHaveText("segunda-feira, 15 de fevereiro");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
  await expect(form.getByLabel("Prazo", { exact: true })).toHaveValue("2027-02-15");
  await form.getByRole("textbox", { name: "Título", exact: true }).fill("Plano do dia escolhido");
  await form.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Concluir Plano do dia escolhido" })).toBeVisible();
  const calendarBox = await calendar.boundingBox();
  const planningBox = await page.locator(".agenda-day").boundingBox();
  expect(planningBox!.y).toBeGreaterThan(calendarBox!.y + calendarBox!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await toggle.click();
  await expect(calendar).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Concluir Plano do dia escolhido" })).toBeVisible();
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

test("paper month selector supports years, keyboard dismissal, themes and touch-sized months", async ({
  page,
}, info) => {
  await page.goto("/planejador");
  await page.getByRole("button", { name: "Calendário", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Escolher mês", exact: true });
  await trigger.click();
  const picker = page.getByRole("dialog", { name: "Escolher mês e ano" });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("group", { name: "Meses do ano" }).getByRole("button")).toHaveCount(
    12,
  );
  await expect(page.locator('input[type="month"]')).toHaveCount(0);
  const year = picker.getByLabel("Ano", { exact: true });
  await year.fill("2026");
  await picker.getByRole("button", { name: "Próximo ano", exact: true }).click();
  await expect(year).toHaveValue("2027");
  await picker.getByRole("button", { name: "Ano anterior", exact: true }).click();
  await expect(year).toHaveValue("2026");
  const buttonBox = await picker
    .getByRole("button", { name: "janeiro", exact: true })
    .boundingBox();
  expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: info.outputPath(`month-picker-${info.project.name}.png`),
    animations: "disabled",
  });
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "dark";
  });
  await expect(picker).toHaveCSS("background-color", "rgb(41, 36, 50)");
  await expect(picker.locator('button[aria-pressed="false"]').first()).toHaveCSS(
    "background-color",
    "rgb(41, 36, 50)",
  );
  await page.screenshot({
    path: info.outputPath(`month-picker-${info.project.name}-dark.png`),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(picker).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await picker.getByRole("button", { name: "janeiro", exact: true }).click();
  await expect(trigger).toContainText("janeiro de 2026");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await picker.getByRole("button", { name: "Este mês", exact: true }).click();
  await expect(page.locator(".agenda-month-grid button[aria-current='date']")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
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
