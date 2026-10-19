import { test, expect } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

for (const data of ["empty", "tasks", "events", "both"] as const) {
  test(`painéis inferiores só aparecem com dados: ${data}`, async ({ page }) => {
    const workspace = createInitialWorkspace();
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (data === "tasks" || data === "both")
      workspace.tasks = [
        {
          id: "task",
          title: "Minha tarefa",
          completed: false,
          subjectId: "",
          dueDate: date,
        },
      ];
    if (data === "events" || data === "both")
      workspace.events = [
        {
          id: "event",
          title: "Meu evento",
          subjectId: "",
          date,
          time: "18:00",
        },
      ];
    await page.addInitScript((state) => {
      localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
    }, workspace);
    await page.goto("/");
    await expect(page.locator('[aria-labelledby="tasks-today-title"]')).toHaveCount(
      data === "tasks" || data === "both" ? 1 : 0,
    );
    await expect(page.locator('[aria-labelledby="agenda-today-title"]')).toHaveCount(
      data === "events" || data === "both" ? 1 : 0,
    );
    await expect(page.locator(".student-favorites")).toHaveCount(0);
    if (data === "tasks") {
      await page.locator(".check-button").click();
      await expect(page.locator('[aria-labelledby="tasks-today-title"]')).toHaveCount(0);
    }
    if (data === "events") {
      await page.locator(".student-agenda-open").click();
      await expect(page).toHaveURL(/\/planejador$/);
    }
  });
}
