import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";
import { exportAgenda } from "../src/domain/agenda-ics";

test.use({ timezoneId: "America/Sao_Paulo" });
const event = {
  id: "calendar-one",
  title: "Prova de álgebra",
  subjectId: "subject-english",
  date: "2026-10-12",
  time: "14:00",
  endDate: "2026-10-12",
  endTime: "14:30",
  durationMinutes: 30,
  kind: "appointment" as const,
  recurrenceFrequency: "daily" as const,
  recurrence: "none" as const,
  description: "Sala 2",
  timeZone: "America/Sao_Paulo",
};
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-12T12:00:00Z") });
  const workspace = createInitialWorkspace();
  workspace.events = [event];
  await page.addInitScript((state) => {
    if (!sessionStorage.getItem("calendar-seeded")) {
      localStorage.clear();
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
      sessionStorage.setItem("calendar-seeded", "1");
    }
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  }, workspace);
  await page.goto("/planejador");
});

test("agenda toolbar uses accessible cream paper icons without duplicate arrows", async ({
  page,
}, info) => {
  const toolbar = page.getByRole("region", { name: "Controles da agenda" });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    for (const name of [
      "Dia",
      "Semana",
      "Mês",
      "Lista",
      "Exportar .ics",
      "Imprimir",
      "Ativar lembretes",
    ]) {
      const button = toolbar.getByRole("button", { name, exact: true });
      await expect(button).not.toHaveText("");
      await expect(button.locator("svg")).toHaveCount(1);
      await expect(button).toHaveCSS("background-color", "rgb(255, 249, 239)");
      await button.focus();
      await expect(button).toHaveCSS("outline-style", "none");
    }
    await expect(toolbar.getByLabel("Importar .ics", { exact: true })).toHaveCount(1);
    await expect(toolbar.getByRole("button", { name: "Período anterior" })).toHaveCount(0);
    await expect(toolbar.getByRole("button", { name: "Sincronizar agora" })).toHaveCount(0);
    const downloaded = page.waitForEvent("download");
    await toolbar.getByRole("button", { name: "Exportar .ics", exact: true }).click();
    await downloaded;
    await expect(
      page.getByText("Eventos filtrados exportados. Anexos e histórico não foram incluídos.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await toolbar.screenshot({
      path: info.outputPath(`toolbar-${theme}.png`),
      animations: "disabled",
    });
  }
});
test("paper calendar offers all views, filters, all-day events and persists details in both themes", async ({
  page,
}, info) => {
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await page.getByRole("button", { name: "Semana", exact: true }).click();
    const week = page.locator(".agenda-time-view");
    await expect(week).toHaveAttribute("aria-label", "Grade semanal");
    await expect(week.locator(".agenda-time-column")).toHaveCount(7);
    await page.getByRole("searchbox", { name: "Buscar na agenda" }).fill("não existe");
    await expect(week.locator(".agenda-time-block")).toHaveCount(0);
    await page.getByRole("searchbox", { name: "Buscar na agenda" }).fill("álgebra");
    await expect(week.locator(".agenda-time-block")).toHaveCount(7);
    await page.getByRole("searchbox", { name: "Buscar na agenda" }).fill("");
    await week.screenshot({ path: info.outputPath(`week-${theme}.png`), animations: "disabled" });
    await page.getByRole("button", { name: "Dia", exact: true }).click();
    await expect(week.locator(".agenda-time-column")).toHaveCount(1);
    await week.locator('[data-slot-time="10:00"]').click();
    const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
    await expect(form.getByLabel("Horário", { exact: true })).toHaveValue("10:00");
    await form.getByRole("textbox", { name: "Título", exact: true }).fill(`Excursão ${theme}`);
    await form.getByRole("checkbox", { name: "Dia inteiro" }).check();
    await form.getByRole("textbox", { name: "Data de término", exact: true }).fill("13/10/2026");
    await form.getByRole("textbox", { name: "Descrição", exact: true }).fill("Levar caderno");
    await form.getByRole("button", { name: "Preencher Local", exact: true }).click();
    const place = page.getByRole("dialog", { name: "Local", exact: true });
    await place.getByRole("textbox", { name: "Onde será?", exact: true }).fill("Museu");
    await place.getByRole("button", { name: "Concluir", exact: true }).click();
    await form.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(form).not.toBeVisible();
    await expect(
      page
        .locator(".agenda-all-day-strip")
        .getByRole("button", { name: `Excursão ${theme}`, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Lista", exact: true }).click();
    await expect(page.locator(".agenda-schedule-list")).toBeVisible();
    await page.getByRole("button", { name: "Mês", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator(".agenda-overview").screenshot({
      path: info.outputPath(`calendar-${theme}.png`),
      animations: "disabled",
      style: ".page-header,.mobile-nav,.helena-chat-launcher {visibility:hidden!important}",
    });
  }
  await page.reload();
  await page.locator('button[data-date="2026-10-13"]').click();
  await expect(
    page.locator(".agenda-day").getByText("Excursão dark", { exact: true }),
  ).toBeVisible();
});

test("attachments reject oversized input and persist an accepted local image", async ({ page }) => {
  await page.locator('button[data-date="2026-10-12"]').click();
  await page
    .locator(".agenda-day")
    .getByRole("button", { name: "Criar compromisso", exact: true })
    .click();
  const editor = page.locator(".agenda-dialog");
  await editor.getByRole("textbox", { name: "Título", exact: true }).fill("Com anexo");
  const input = editor.locator('input[type="file"]');
  await input.setInputFiles({
    name: "grande.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(300001),
  });
  await expect(editor.getByRole("alert")).toContainText("até 300 KB");
  await input.setInputFiles({
    name: "imagem.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(editor.getByText("imagem.png", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(editor).not.toBeVisible();
  await page.reload();
  const attachments = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).events.find(
        (item: { title: string }) => item.title === "Com anexo",
      ).attachments,
  );
  expect(attachments).toHaveLength(1);
  expect(attachments[0].data).toMatch(/^data:image\/png;base64,/);
});

test("paper details use rotating hands, expandable metadata, a reminder slider and image previews in every view", async ({
  page,
}, info) => {
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await page.getByRole("button", { name: "Dia", exact: true }).click();
    await page.locator(`[data-slot-time="${theme === "light" ? "08:00" : "10:00"}"]`).click();
    const editor = page.getByRole("dialog", { name: "Adicionar à agenda", exact: true });
    await editor.getByRole("textbox", { name: "Título", exact: true }).fill(`Detalhes ${theme}`);
    await expect(editor.getByRole("button", { name: "Fuso horário", exact: true })).toHaveCount(0);
    await editor.getByRole("button", { name: "Duração em minutos", exact: true }).click();
    const dial = page.getByRole("dialog", { name: "Escolher duração", exact: true });
    await dial.getByRole("slider", { name: "Ponteiro das horas", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(dial.getByRole("spinbutton", { name: "Horas", exact: true })).toHaveValue("1");
    await expect(dial).toHaveCSS("transform", "none");
    const clock = await dial.locator("svg.agenda-duration-dial").boundingBox();
    if (!clock) throw new Error("Relógio não visível");
    await page.mouse.move(
      clock.x + (clock.width * 157.5) / 240,
      clock.y + (clock.height * 185) / 240,
    );
    await page.mouse.down();
    await page.mouse.move(clock.x + (clock.width * 35) / 240, clock.y + clock.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
    await expect(dial.getByRole("spinbutton", { name: "Minutos", exact: true })).toHaveValue("45");
    await dial.screenshot({
      path: info.outputPath(`duration-${theme}.png`),
      animations: "disabled",
    });
    await dial.getByRole("button", { name: "Concluir", exact: true }).click();
    await expect(
      editor.getByRole("button", { name: "Duração em minutos", exact: true }),
    ).toHaveText("1 h 45 min");
    for (const [label, inputLabel, value] of [
      ["Local", "Onde será?", "Sala de estudos"],
      ["Links", "Um link por linha", "https://example.com"],
      ["Participantes", "E-mails separados por vírgula", "estudo@example.com"],
    ]) {
      await editor.getByRole("button", { name: `Preencher ${label}`, exact: true }).click();
      const field = page.getByRole("dialog", { name: label, exact: true });
      await field.getByRole("textbox", { name: inputLabel, exact: true }).fill(value!);
      if (label === "Local")
        await field.getByRole("textbox", { name: inputLabel, exact: true }).press("Enter");
      else await field.getByRole("button", { name: "Concluir", exact: true }).click();
      await expect(editor).toBeVisible();
      await expect(
        editor.locator(".agenda-metadata-preview").filter({ hasText: value }),
      ).toBeVisible();
    }
    const reminder = editor.getByRole("slider", { name: "Lembrar antes", exact: true });
    await reminder.focus();
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowLeft");
    await expect(reminder).toHaveAttribute("aria-valuetext", "60 min");
    await expect(editor.getByRole("button", { name: "Na hora", exact: true })).toHaveCount(0);
    const transfer = await page.evaluateHandle(() => {
      const raw = atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL9sAAAAASUVORK5CYII=",
      );
      const data = new DataTransfer();
      data.items.add(
        new File([Uint8Array.from(raw, (char) => char.charCodeAt(0))], "foto.png", {
          type: "image/png",
        }),
      );
      return data;
    });
    await editor
      .locator(".agenda-attachment-drop")
      .dispatchEvent("drop", { dataTransfer: transfer });
    await expect(editor.getByRole("img", { name: "foto.png", exact: true })).toBeVisible();
    await editor.screenshot({
      path: info.outputPath(`details-${theme}.png`),
      animations: "disabled",
    });
    await editor.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(editor).not.toBeVisible();
    for (const view of ["Semana", "Dia", "Mês", "Lista"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      const image = page
        .locator(
          view === "Mês"
            ? ".agenda-month-grid"
            : view === "Lista"
              ? ".agenda-schedule-list"
              : ".agenda-time-view",
        )
        .getByRole("img", { name: "foto.png", exact: true })
        .first();
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
        .toBeGreaterThan(0);
    }
    const saved = await page.evaluate(
      (title) =>
        JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).events.find(
          (item: { title: string }) => item.title === title,
        ),
      `Detalhes ${theme}`,
    );
    expect(saved.timeZone).toBe("America/Sao_Paulo");
    expect(saved.calendarDurationMinutes).toBe(105);
    expect(saved.reminders).toEqual([0, 60]);
  }
  await page.reload();
  await page.getByRole("button", { name: "Dia", exact: true }).click();
  await expect(
    page.locator(".agenda-time-view").getByText("Detalhes dark", { exact: true }),
  ).toBeVisible();
});

test.describe("Brazilian account zone outside Brazil", () => {
  test.use({ timezoneId: "Europe/Lisbon" });
  test("keeps the account wall time in the grid and editor without asking for a zone", async ({
    page,
  }) => {
    await page.evaluate(() => localStorage.setItem("helena.agendaTimeZone.v1", "America/Manaus"));
    await page.reload();
    await page.getByRole("button", { name: "Dia", exact: true }).click();
    const grid = page.locator(".agenda-time-view");
    await expect(grid.locator(".agenda-time-hint")).toContainText("America/Manaus");
    await expect(
      grid.locator(".agenda-time-block").getByText("13:00", { exact: false }),
    ).toBeVisible();
    await grid.locator('[data-slot-time="07:00"]').click();
    const form = page.getByRole("dialog", { name: "Adicionar à agenda", exact: true });
    await form.getByRole("textbox", { name: "Título", exact: true }).fill("Horário brasileiro");
    await expect(form.getByRole("button", { name: "Fuso horário", exact: true })).toHaveCount(0);
    await form.getByRole("button", { name: "Adicionar", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Dia", exact: true }).click();
    await expect(
      page
        .locator(".agenda-time-block")
        .filter({ hasText: "Horário brasileiro" })
        .getByText("07:00", { exact: false }),
    ).toBeVisible();
  });
});
test("changes only the chosen occurrence and moving by keyboard confirms the new time", async ({
  page,
}) => {
  await page.locator('button[data-date="2026-10-13"]').click();
  await page
    .locator(".agenda-day")
    .getByRole("button", { name: "Editar Prova de álgebra", exact: true })
    .click();
  const form = page.getByRole("dialog", { name: "Editar", exact: true });
  const editor = page.locator(".agenda-dialog");
  await expect(form).toBeVisible();
  await editor.getByRole("button", { name: "Aplicar alteração ou exclusão", exact: true }).click();
  await page.getByRole("option", { name: "Só este evento", exact: true }).click();
  await editor.getByRole("textbox", { name: "Título", exact: true }).fill("Só terça");
  await editor.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(form).not.toBeVisible();
  await page.reload();
  await page.locator('button[data-date="2026-10-13"]').click();
  await expect(page.locator(".agenda-day").getByText("Só terça", { exact: true })).toBeVisible();
  await expect(
    page.locator(".agenda-day").getByText("Prova de álgebra", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Dia", exact: true }).click();
  await page.locator(".agenda-block-title").first().focus();
  const mover = page
    .locator(".agenda-time-view")
    .getByRole("button", { name: "Mover Só terça", exact: true });
  await mover.focus();
  await page.keyboard.press("Enter");
  const slot = page.locator('[data-slot-time="16:00"]');
  await slot.focus();
  await page.keyboard.press("Enter");
  await expect(editor.getByLabel("Horário", { exact: true })).toHaveValue("16:00");
  await editor.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await page.reload();
  await page.locator('button[data-date="2026-10-13"]').click();
  await page
    .locator(".agenda-day")
    .getByRole("button", { name: "Editar Só terça", exact: true })
    .click();
  await expect(editor.getByLabel("Horário", { exact: true })).toHaveValue("16:00");
});
test("ICS exchange imports without duplicates and exports only event data", async ({ page }) => {
  const ics = exportAgenda([{ ...event, id: "external", title: "Evento externo" }]);
  const input = page.locator('.agenda-import-label input[type="file"]');
  await input.setInputFiles({
    name: "agenda.ics",
    mimeType: "text/calendar",
    buffer: Buffer.from(ics),
  });
  await expect(page.locator(".agenda-notice")).toContainText("1 eventos importados");
  await input.setInputFiles({
    name: "agenda.ics",
    mimeType: "text/calendar",
    buffer: Buffer.from(ics),
  });
  await expect(page.locator(".agenda-notice")).toContainText("0 eventos importados");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar .ics", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("olenastudy-agenda.ics");
});

test("dragging and resizing open confirmation without changing saved data early", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Dia", exact: true }).click();
  const title = page.locator(".agenda-block-title").first();
  await title.scrollIntoViewIfNeeded();
  const start = await title.boundingBox();
  if (!start) throw new Error("Missing event block");
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2 + 48, { steps: 6 });
  await page.mouse.up();
  const editor = page.locator(".agenda-dialog");
  await expect(editor).toBeVisible();
  const movedTime = await editor.getByLabel("Horário", { exact: true }).inputValue();
  expect(movedTime).not.toBe("14:00");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).events[0].time,
    ),
  ).toBe("14:00");
  await editor.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await title.focus();
  const handle = page.locator(".agenda-block-resize").first();
  await handle.scrollIntoViewIfNeeded();
  await handle.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const bounds = await handle.boundingBox();
  if (!bounds) throw new Error("Missing resize handle");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 48, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("Duração em minutos", { exact: true })).toHaveText("1 h 30 min");
  await editor.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await page.reload();
  const events = await page.evaluate(
    () => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).events,
  );
  expect(
    events.some(
      (item: { time: string; calendarDurationMinutes: number }) =>
        item.time === movedTime && item.calendarDurationMinutes === 90,
    ),
  ).toBe(true);
});
