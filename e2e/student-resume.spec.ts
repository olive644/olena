import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";
test("painel usa agenda real, caderno folheável, último foco e Oliver compacto", async ({
  page,
}) => {
  const workspace = createInitialWorkspace();
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  workspace.tasks = [
    {
      id: "task",
      title: "Revisar frações",
      subjectId: "subject-english",
      dueDate: date,
      completed: false,
      color: "#287D69",
    },
  ];
  workspace.events = [
    {
      id: "event",
      title: "Minha revisão",
      subjectId: "subject-english",
      date,
      time: "18:00",
      color: "#EF476F",
    },
  ];
  workspace.notebooks = [
    {
      id: "book",
      title: "Caderno recente",
      subjectId: "subject-english",
      createdAt: now.toISOString(),
      pageIds: ["one", "two", "three"],
    },
  ];
  workspace.notes = ["one", "two", "three"].map((id) => ({
    id,
    title: `Folha ${id}`,
    subjectId: "subject-english",
    updatedAt: now.toISOString(),
    assets: [],
    content: "Minhas ideias",
  }));
  workspace.practiceActivities = [
    {
      id: "practice",
      answers: 1,
      correct: 1,
      islandId: "mathematics:foundations",
      islandName: "Matemática",
      completedAt: new Date(now.getTime() - 23.5 * 3600000).toISOString(),
    },
  ];
  await page.addInitScript((state) => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
    localStorage.setItem("helena.agendaTimeZone.v1", "America/Sao_Paulo");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({
        studentResume: {
          notebook: { id: "book", at: Date.now() },
          focus: { mode: "pomodoro", at: Date.now() },
        },
      }),
    );
  }, workspace);
  await page.goto("/");
  await expect(page.getByText("Seu fogo azul apaga em", { exact: false })).toBeVisible();
  await expect(page.getByText("Uma aventura com Oliver", { exact: true })).toHaveCount(0);
  const agenda = page.locator('[aria-labelledby="agenda-today-title"]');
  await expect(agenda.getByText("Idiomas", { exact: false })).toBeVisible();
  await expect(agenda.getByText("Inglês", { exact: true })).toHaveCount(0);
  await expect(agenda.locator("li")).toHaveCSS("border-inline-start-color", "rgb(239, 71, 111)");
  await expect(page.locator(".check-button")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".check-button svg")).toHaveCount(0);
  await expect(page.locator(".check-button")).toHaveCSS("border-top-color", "rgb(250, 204, 21)");
  await expect(page.locator(".student-focus-art .pomodoro-tomato")).toBeVisible();
  await expect(page.locator(".student-destination--planner")).toHaveCount(0);
  const bookBox = await page
    .locator(".student-notebook-preview .notebook-spread-shell")
    .boundingBox();
  expect(bookBox!.width / bookBox!.height).toBeCloseTo(1.4, 1);
  const preview = page.locator(".student-notebook-preview");
  await expect(preview.locator(".notebook-paper-spread")).toBeVisible();
  await expect(preview.getByRole("button", { name: /Capa/ })).toHaveCount(0);
  await preview.locator(".notebook-paper-spread").press("ArrowLeft");
  await expect(preview.locator(".notebook-cover-inventory")).toHaveCount(0);
  await preview.getByRole("button", { name: /^Próxima/ }).click();
  await expect(preview.getByRole("button", { name: /folha 3/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (page.viewportSize()!.width <= 560)
    expect((await page.locator(".math-hero-slide").boundingBox())!.height).toBeLessThan(420);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: test.info().outputPath("painel-retomada.png"),
    fullPage: true,
    animations: "disabled",
  });
  await preview.getByRole("button", { name: /folha 3/i }).click();
  await expect(page).toHaveURL(/\/cadernos\?caderno=book&folha=three/);
});

test("sino e configurações usam o mesmo número de publicação", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.route("**/app-version.json", (route) => route.fulfill({ json: { number: 999 } }));
  await page.route("**/system-updates.json", (route) =>
    route.fulfill({
      json: [
        {
          id: 999,
          version: "texto-antigo",
          title: "Atualização de teste",
          date: new Date().toISOString(),
        },
      ],
    }),
  );
  await page.goto("/notificacoes");
  await expect(page.locator(".notification-center-heading")).toContainText("beta.999");
  await page.getByRole("button", { name: "Novidades", exact: true }).click();
  await expect(page.locator(".notification-center-content")).toContainText("beta.999");
  await expect(page.locator("main")).not.toContainText("texto-antigo");
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Configurações", exact: true }).click();
  await expect(page.locator(".settings-footer")).toContainText("beta.999");
});

test("check do Espaço e Agenda representam a mesma tarefa e Agenda numérica navega", async ({
  page,
}) => {
  const workspace = createInitialWorkspace();
  workspace.tasks = [
    {
      id: "same-task",
      title: "Tarefa consistente",
      subjectId: "subject-english",
      completed: false,
      dueDate: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    },
  ];
  await page.addInitScript((state) => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
  }, workspace);
  await page.goto("/");
  const check = page.locator(".check-button");
  await expect(check).toHaveAttribute("aria-pressed", "false");
  await expect(check.locator("svg")).toHaveCount(0);
  await page.locator(".student-metric-link").click();
  await expect(page).toHaveURL(/\/planejador$/);
  const agendaCheck = page
    .locator(".agenda-item--task")
    .filter({ hasText: "Tarefa consistente" })
    .locator(".agenda-check");
  await expect(agendaCheck).toHaveAttribute("aria-pressed", "false");
  await agendaCheck.click();
  await expect(agendaCheck).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", {
      name: page.viewportSize()!.width <= 760 ? "Espaço" : "Espaço do aluno",
      exact: true,
    })
    .click();
  await expect(
    page.locator(".check-list li").filter({ hasText: "Tarefa consistente" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).tasks.find(
          (task: { id: string }) => task.id === "same-task",
        ).completed,
    ),
  ).toBe(true);
});
