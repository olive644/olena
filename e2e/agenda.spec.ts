import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("agenda-test-initialized")) {
      const privacyRead = localStorage.getItem("helena.privacyNotice.v1");
      localStorage.clear();
      if (privacyRead) localStorage.setItem("helena.privacyNotice.v1", privacyRead);
      sessionStorage.setItem("agenda-test-initialized", "1");
    }
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
});

test("compact agenda keeps seven days and three actions in one row and desktop columns", async ({
  page,
}, info) => {
  const widths = info.project.name === "desktop" ? [1280, 1920] : [320, 390];
  await page.goto("/planejador");
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (value) => document.documentElement.setAttribute("data-theme", value),
        theme,
      );
      await page.locator('button[data-date="2026-10-11"]').click();
      const day = page.locator(".agenda-day--open");
      await expect(day).toBeVisible();
      const actions = day.locator(".agenda-day-actions button");
      await expect(actions).toHaveCount(3);
      expect(
        await actions.evaluateAll((elements) => {
          const boxes = elements.map((element) => element.getBoundingClientRect());
          return Math.max(...boxes.map((box) => box.y)) - Math.min(...boxes.map((box) => box.y));
        }),
      ).toBeLessThan(1);
      const history = page.getByRole("region", { name: "Histórico de estudo" });
      for (const mode of ["Cronômetro", "Pomodoro"]) {
        await history.getByRole("button", { name: mode, exact: true }).click();
        const days = history.locator(".agenda-pomodoro-day");
        await expect(days).toHaveCount(7);
        expect(
          await days.evaluateAll((elements) => {
            const tops = elements.map((element) => element.getBoundingClientRect().y);
            return Math.max(...tops) - Math.min(...tops);
          }),
        ).toBeLessThan(1);
      }
      await expect(page.getByText(/Dias registrados dentro do filtro ficam vivos/)).toHaveCount(0);
      await expect(page.getByText(/Nenhum compromisso ou tarefa neste dia/)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Google Agenda", exact: true })).toHaveCount(
        0,
      );
      await expect(
        page.getByRole("heading", { name: "Listas de estudo", exact: true }),
      ).toHaveCount(0);
      const layout = await page.evaluate(() => {
        const calendar = document.querySelector(".agenda-month")!.getBoundingClientRect();
        const study = document.querySelector(".agenda-history")!.getBoundingClientRect();
        return {
          sameTop: Math.abs(calendar.y - study.y),
          side: study.x >= calendar.right,
          below: study.y >= calendar.bottom,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(layout.overflow).toBe(false);
      if (width >= 1200) {
        expect(layout.side).toBe(true);
        await page.mouse.move(0, 0);
        await expect
          .poll(() =>
            page.evaluate(() => {
              const calendar = document.querySelector(".agenda-month")!.getBoundingClientRect();
              const study = document.querySelector(".agenda-history")!.getBoundingClientRect();
              return Math.abs(calendar.y - study.y);
            }),
          )
          .toBeLessThan(1);
      } else expect(layout.below).toBe(true);
      await page.locator(".agenda-overview").screenshot({
        path: info.outputPath(`compact-${width}-${theme}.png`),
        animations: "disabled",
        style:
          ".page-header, .mobile-nav, .helena-chat-launcher, .skip-link { visibility: hidden !important; }",
      });
    }
  }
});

test("day panel matches its column, keeps a plain date and only text selectable", async ({
  page,
}, info) => {
  if (info.project.name === "desktop") await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/planejador");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await page.locator('button[data-date="2026-10-12"]').click();
    const day = page.locator(".agenda-day--open");
    await expect(day).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const calendar = document
            .querySelector(innerWidth >= 1200 ? ".agenda-history" : ".agenda-month")!
            .getBoundingClientRect();
          const panel = document.querySelector(".agenda-day--open")!.getBoundingClientRect();
          return Math.max(Math.abs(calendar.width - panel.width), Math.abs(calendar.x - panel.x));
        }),
      )
      .toBeLessThan(1);
    await expect(day.locator("h2 .paper-digits")).toHaveCount(0);
    await expect(day.locator("h2")).toContainText("12 de outubro");
    await page.keyboard.press("Tab");
    await day.locator("h2").focus();
    await expect(day.locator("h2")).toHaveCSS("text-decoration-line", "none");
    await expect(day.locator("h2")).toHaveCSS("filter", "none");
    await expect(page.getByRole("heading", { name: "Uma semana possível" })).toHaveCount(0);
    const action = day.getByRole("button", { name: "Criar tarefa", exact: true });
    await expect(action).toHaveCSS("user-select", "none");
    await action.focus();
    await expect(action).toHaveCSS("text-decoration-line", "underline");
    await expect(action.locator("svg")).toHaveCSS("user-select", "none");
    const copy = day.locator("h2");
    expect(await copy.evaluate((element) => getComputedStyle(element).userSelect)).not.toBe("none");
    await copy.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    expect(
      (await page.evaluate(() => window.getSelection()?.toString()))?.toLocaleLowerCase("pt-BR"),
    ).toContain("12 de outubro");
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await day.screenshot({ path: info.outputPath(`day-${theme}.png`), animations: "disabled" });
    await action.click();
    const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
    await expect(form.getByRole("textbox", { name: "Título", exact: true })).toHaveCSS(
      "user-select",
      "text",
    );
    await form.getByRole("button", { name: "Fechar formulário" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("paper form offers all islands, custom date/time, icon repeat and yellow completion in both themes", async ({
  page,
}, info) => {
  await page.goto("/planejador");
  await expect(page.getByRole("button", { name: "Adicionar", exact: true })).toHaveCount(0);
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await page.locator('button[data-date="2026-10-12"]').click();
    const back = page.getByRole("button", { name: "Voltar ao calendário" });
    await expect(back).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await page.getByRole("button", { name: "Criar compromisso", exact: true }).click();
    const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
    const close = form.getByRole("button", { name: "Fechar formulário" });
    await expect(close).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(close).toHaveCSS("box-shadow", "none");
    await form.getByRole("button", { name: "Matéria", exact: true }).focus();
    await page.keyboard.press("ArrowDown");
    const subjects = page.getByRole("listbox", { name: "Opções de Matéria" });
    await expect(subjects.getByRole("option")).toHaveCount(6);
    for (const name of ["Idiomas", "Português", "Química", "Biologia", "Matemática", "Programação"])
      await expect(subjects.getByRole("option", { name, exact: true })).toBeVisible();
    const chemistry = subjects.getByRole("option", { name: "Química", exact: true });
    await chemistry.hover();
    await expect(chemistry).toHaveCSS("color", "rgb(41, 36, 50)");
    await expect(chemistry).toHaveCSS("background-color", "rgb(250, 204, 21)");
    await subjects.getByRole("option", { name: "Idiomas", exact: true }).focus();
    await expect(subjects.getByRole("option", { name: "Idiomas", exact: true })).toHaveCSS(
      "color",
      "rgb(41, 36, 50)",
    );
    await page.keyboard.press("End");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await expect(form.getByRole("button", { name: "Matéria", exact: true })).toContainText(
      "Matemática",
    );
    await form.getByRole("textbox", { name: "Título", exact: true }).fill(`Compromisso ${theme}`);
    await form.getByRole("button", { name: "Escolher data", exact: true }).click();
    const calendar = page.getByRole("dialog", { name: "Calendário de data" });
    await expect(calendar).toBeVisible();
    await calendar.screenshot({
      path: info.outputPath(`date-${theme}.png`),
      animations: "disabled",
    });
    await calendar.getByRole("button", { name: "13 de outubro de 2026", exact: true }).click();
    await expect(form.getByLabel("Data", { exact: true })).toHaveValue("13/10/2026");
    await form.getByRole("button", { name: "Escolher horário", exact: true }).click();
    const time = page.getByRole("dialog", { name: "Escolher horário", exact: true });
    await time.getByRole("button", { name: "09 horas", exact: true }).click();
    await time.getByRole("button", { name: "15 minutos", exact: true }).click();
    await time.screenshot({ path: info.outputPath(`time-${theme}.png`), animations: "disabled" });
    await time.getByRole("button", { name: "Confirmar horário" }).click();
    await expect(form.getByLabel("Horário", { exact: true })).toHaveValue("09:15");
    await form.getByRole("button", { name: "Repetir semanalmente", exact: true }).click();
    await expect(form.getByRole("button", { name: "Repetir semanalmente" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(form.locator('select, input[type="date"], input[type="time"]')).toHaveCount(0);
    await form.screenshot({ path: info.outputPath(`form-${theme}.png`), animations: "disabled" });
    await form.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(page.locator('button[data-date="2026-10-13"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const complete = page.getByRole("button", { name: `Concluir Compromisso ${theme}` });
    const edit = page.getByRole("button", { name: `Editar Compromisso ${theme}` });
    await expect(edit).toHaveText("");
    await expect(edit.locator('img[data-paper-icon="edit"]')).toBeVisible();
    for (const control of [edit, complete]) {
      await expect(control).toHaveCSS("width", "44px");
      await expect(control).toHaveCSS("height", "44px");
    }
    await expect
      .poll(() =>
        page
          .locator(".agenda-item")
          .filter({ has: edit })
          .evaluate((item) =>
            Math.abs(
              item.querySelector(".agenda-edit")!.getBoundingClientRect().y -
                item.querySelector(".agenda-check")!.getBoundingClientRect().y,
            ),
          ),
      )
      .toBeLessThan(1);
    await page
      .locator(".agenda-item")
      .filter({ has: edit })
      .screenshot({
        path: info.outputPath(`edit-${theme}.png`),
        animations: "disabled",
      });
    await edit.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Editar", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fechar formulário" }).click();
    await complete.click();
    await expect(page.getByRole("button", { name: `Reabrir Compromisso ${theme}` })).toHaveCSS(
      "background-color",
      "rgb(250, 204, 21)",
    );
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".agenda-month-grid .is-selected")).toHaveCSS(
    "animation-name",
    "agenda-day-pick",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('button[data-date="2026-10-14"]').click();
  await expect(page.locator(".agenda-month-grid .is-selected")).toHaveCSS("animation-name", "none");
});

test("editor close button uses the single colored close icon without a plate", async ({ page }) => {
  await page.goto("/cadernos");
  await page.getByRole("button", { name: "Crie", exact: true }).click();
  await page.getByRole("button", { name: "Criar caderno", exact: true }).click();
  await page.getByRole("button", { name: "Criar primeira folha", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Escrever à mão", exact: true });
  await editor.getByRole("button", { name: "Configurações do editor" }).click();
  const close = page.getByRole("button", { name: "Fechar configurações" });
  // O X é o mesmo do perfil (agenda-close.svg), sem placa; o SVG monocromático antigo não é mais usado.
  await expect(close.locator("img.agenda-close-icon")).toHaveCount(1);
  await expect(close.locator('svg[data-paper-editor-icon="close"]')).toHaveCount(0);
  expect(
    await close.evaluate((element) => element.matches("button:has(> .agenda-close-icon)")),
  ).toBe(true);
  await expect(close).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await close.click();
  await expect(page.getByRole("dialog", { name: "Configurações do editor" })).not.toBeVisible();
});

test("day planning saves hours and marks Brazilian holidays in both themes", async ({
  page,
}, info) => {
  await page.goto("/planejador");
  await page.locator('button[data-date="2026-10-12"]').click();
  await expect(
    page.getByText("Feriado nacional: Nossa Senhora Aparecida", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Criar compromisso", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
  await expect(form.getByLabel("Data", { exact: true })).toHaveValue("12/10/2026");
  await form.getByRole("textbox", { name: "Título", exact: true }).fill("Revisão com colega");
  await form.getByLabel("Horário", { exact: true }).fill("14:30");
  await form.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByRole("button", { name: "Voltar ao calendário", exact: true }).click();
  await expect(page.locator('button[data-date="2026-10-12"]')).toHaveAccessibleName(
    /1 itens.*feriado nacional: Nossa Senhora Aparecida/,
  );
  await page.reload();
  await page.locator('button[data-date="2026-10-12"]').click();
  await expect(page.getByRole("button", { name: "Editar Revisão com colega" })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await page
      .locator(".agenda-day--open")
      .screenshot({ path: info.outputPath(`day-${theme}.png`), animations: "disabled" });
  }
  await page.getByRole("button", { name: "Editar Revisão com colega" }).click();
  await expect(page.getByLabel("Horário", { exact: true })).toHaveValue("14:30");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("update bell shows red unread counts, keyboard controls and synced reading in both themes", async ({
  page,
}, info) => {
  let feed = [
    { id: 408, version: "beta.408", title: "Agenda publicada", date: new Date().toISOString() },
  ];
  await page.route("**/system-updates.json", (route) => route.fulfill({ json: feed }));
  await page.goto("/");
  const bell = page.locator(".system-updates-trigger");
  await expect(bell).toHaveAccessibleName("Atualizações do sistema, 1 não lidas");
  await expect(page.locator(".page-header__theme")).toHaveCount(0);
  const bellBox = await bell.boundingBox();
  expect(bellBox!.x + bellBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const panel = page.locator(".notification-center");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await bell.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Novidades", exact: true }).click();
    await expect(panel.getByText("Agenda publicada", { exact: true })).toBeVisible();
    await panel.screenshot({
      path: info.outputPath(`updates-${theme}.png`),
      animations: "disabled",
    });
    await panel.getByRole("button", { name: "Voltar ao Espaço", exact: true }).click();
    await expect(panel).not.toBeVisible();
  }
  await bell.click();
  await panel.getByRole("button", { name: "Novidades", exact: true }).click();
  await panel.getByRole("button", { name: "Marcar como lidas" }).click();
  await panel.getByRole("button", { name: "Voltar ao Espaço", exact: true }).click();
  await expect(page.locator(".system-update-badge")).toHaveCount(0);
  feed = [
    ...feed,
    { id: 409, version: "beta.409", title: "Novidade publicada", date: new Date().toISOString() },
  ];
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(bell).toHaveAccessibleName("Atualizações do sistema, 1 não lidas");
  await page.evaluate(() => {
    localStorage.setItem("helena.systemUpdates.read.v1", "[408,409]");
    window.dispatchEvent(new Event("helena:synced-storage-applied"));
  });
  await expect(page.locator(".system-update-badge")).toHaveCount(0);
  await page.reload();
  await expect(bell).toHaveAccessibleName("Atualizações do sistema, 0 não lidas");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("agenda displays compact filtered islands and Pomodoro weeks in both themes", async ({
  page,
}, info) => {
  const state = createInitialWorkspace();
  state.practiceActivities = [
    {
      id: "math-day6",
      islandId: "mathematics:foundations",
      islandName: "Matemática · Ensino fundamental",
      completedAt: "2026-10-06T12:00:00",
      answers: 15,
      correct: 12,
    },
    {
      id: "school-day6",
      islandId: "mathematics:school",
      islandName: "Matemática · Ensino médio",
      completedAt: "2026-10-06T13:00:00",
      answers: 5,
      correct: 3,
    },
    {
      id: "college-day8",
      islandId: "mathematics:college",
      islandName: "Matemática · Ensino superior",
      completedAt: "2026-10-08T12:00:00",
      answers: 8,
      correct: 4,
    },
  ];
  await page.addInitScript(
    (workspace) => localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace)),
    state,
  );
  await page.goto("/planejador");
  await page.evaluate(() => {
    localStorage.setItem(
      "helena.mathLearning.v1",
      JSON.stringify({ foundations: { level: 1, mastery: 1, correct: 12, best: 80 } }),
    );
    localStorage.setItem("noteoli.pomodoro-streak.v1", JSON.stringify(["2026-10-06"]));
    window.dispatchEvent(new Event("helena:synced-storage-applied"));
  });
  const history = page.getByRole("region", { name: "Histórico de estudo" });
  await page.locator('button[data-date="2026-10-06"]').click();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await history.getByRole("button", { name: "Praticar", exact: true }).click();
    await expect(history.getByText("12 acertos no período")).toBeVisible();
    await expect(history.getByText("Melhor rodada: 80 pontos")).toHaveCount(0);
    await expect(history.locator(".agenda-charts")).toHaveCount(1);
    expect((await history.locator(".agenda-island-carousel").boundingBox())!.height).toBeLessThan(
      180,
    );
    await expect(history.getByRole("button", { name: /^Abrir/ })).toHaveCount(0);
    await history
      .locator(".agenda-island-carousel")
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    await history.getByRole("button", { name: "Próxima ilha" }).click();
    await expect(history.getByRole("img", { name: "Prévia: Oficina das Equações" })).toBeVisible();
    await expect(history.locator(".agenda-chart-heading > strong")).toHaveText("5 respostas");
    const carousel = history.getByRole("group", { name: "Prévia das ilhas" });
    await carousel.focus();
    await page.keyboard.press("End");
    await expect(history.getByRole("button", { name: "Próxima ilha" })).toBeDisabled();
    await page.keyboard.press("Home");
    const drag = history.locator(".agenda-island-drag");
    await drag.evaluate((element) => element.scrollIntoView({ block: "center" }));
    const box = await drag.boundingBox();
    expect(box!.width).toBeGreaterThan(100);
    if (
      info.project.name === "mobile" &&
      page.context().browser()?.browserType().name() === "chromium"
    ) {
      const touch = await page.context().newCDPSession(page);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: box!.x + box!.width * 0.75, y: box!.y + box!.height / 2 }],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: box!.x + box!.width * 0.25, y: box!.y + box!.height / 2 }],
      });
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await touch.detach();
    } else {
      await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height / 2);
      await page.mouse.down();
      await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height / 2, { steps: 6 });
      await page.mouse.up();
    }
    await expect(history.getByRole("img", { name: "Prévia: Oficina das Equações" })).toBeVisible();
    await history.getByRole("button", { name: "Ilha anterior" }).click();
    await history.screenshot({
      path: info.outputPath(`progress-${theme}.png`),
      animations: "disabled",
      style: ".page-header, .mobile-nav, .helena-chat-launcher { visibility: hidden !important; }",
    });
    await history.getByRole("button", { name: "Foco", exact: true }).click();
    await history.getByRole("button", { name: "Pomodoro", exact: true }).click();
    await expect(history.locator(".agenda-pomodoro-day.is-active")).toHaveCount(1);
    await history.screenshot({
      path: info.outputPath(`pomodoro-${theme}.png`),
      animations: "disabled",
      style: ".page-header, .mobile-nav, .helena-chat-launcher { visibility: hidden !important; }",
    });
    await page.locator('button[data-date="2026-10-07"]').click();
    await history.getByRole("button", { name: "Praticar", exact: true }).click();
    await expect(history.locator(".agenda-island-progress")).toHaveCount(0);
    await expect(history.locator(".agenda-charts")).toHaveCount(0);
    await history.getByRole("button", { name: "Foco", exact: true }).click();
    await history.getByRole("button", { name: "Pomodoro", exact: true }).click();
    await expect(history.locator(".agenda-pomodoro-week")).toHaveCount(1);
    await expect(history.locator(".agenda-pomodoro-day.is-active")).toHaveCount(0);
    await history.getByRole("button", { name: "Cronômetro", exact: true }).click();
    await expect(history.locator(".agenda-week-flower")).toHaveCount(7);
    await expect(history.locator(".agenda-week-flower.is-active")).toHaveCount(0);
    await page.locator('button[data-date="2026-10-06"]').click();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("shelf charts count actual types and focus never infers an unchosen subject", async ({
  page,
}, info) => {
  const state = createInitialWorkspace();
  state.notebooks = [undefined, undefined, "collection", "note"].map((kind, index) => ({
    id: `shelf-${index}`,
    title: ["Meu caderno", "Ciências", "Minha pasta", "Minha Note"][index]!,
    subjectId: "",
    pageIds: [],
    createdAt: "2026-10-11T12:00:00",
    ...(kind ? { kind: kind as "collection" | "note" } : {}),
  }));
  state.focusSessions = [
    {
      id: "timer",
      mode: "timer",
      subjectId: state.subjects[0]!.id,
      durationMinutes: 3,
      completedAt: "2026-10-11T12:00:00",
    },
  ];
  state.tasks = [
    { id: "undated", title: "Sem prazo", subjectId: "", dueDate: "", completed: false },
  ];
  await page.addInitScript(
    (workspace) => localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace)),
    state,
  );
  await page.goto("/planejador");
  const history = page.getByRole("region", { name: "Histórico de estudo" });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    await page.locator('button[data-date="2026-10-11"]').click();
    await history.getByRole("button", { name: "Foco", exact: true }).click();
    await expect(history.getByText("Por dia", { exact: true })).toBeVisible();
    await expect(history.getByText("Por matéria", { exact: true })).toHaveCount(0);
    await history.getByRole("button", { name: "Pomodoro", exact: true }).hover();
    await expect(history.getByRole("button", { name: "Pomodoro", exact: true })).toHaveCSS(
      "color",
      "rgb(41, 36, 50)",
    );
    await history.getByRole("button", { name: "Caderno", exact: true }).click();
    await expect(history.locator(".agenda-chart-heading > strong")).toHaveText("4 itens");
    for (const name of ["Meu caderno", "Ciências", "Minha pasta", "Minha Note"])
      await expect(history.getByText(name, { exact: true })).toBeVisible();
    const slices = history.locator(".agenda-pie-slice");
    await expect(slices).toHaveCount(3);
    expect(
      new Set(
        await slices.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("fill")),
        ),
      ).size,
    ).toBe(3);
    const inspect = history.getByRole("button", { name: "Inspecionar Cadernos", exact: true });
    await inspect.hover();
    await inspect.focus();
    await expect(inspect).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(255, 249, 239)" : "rgb(41, 36, 50)",
    );
    await expect(history.locator(".agenda-chart-inspection")).toContainText("2 itens");
    await history.screenshot({
      path: info.outputPath(`shelf-${theme}.png`),
      animations: "disabled",
    });
    await expect(page.getByRole("heading", { name: "Retomar com calma" })).toHaveCount(0);
    await expect(page.getByText("Matérias e metas", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Uma semana possível" })).toHaveCount(0);
    await page.locator('button[data-date="2026-10-12"]').click();
    await expect(history.locator(".agenda-charts")).toHaveCount(0);
    await expect(history.getByText(/Nenhum caderno, pasta ou Note criado/)).toBeVisible();
  }
});
test("agenda creates, edits, completes, reschedules and persists tasks on desktop and mobile", async ({
  page,
}, info) => {
  await page.goto("/planejador");
  await expect(page.getByRole("button", { name: "Escolher mês", exact: true })).toBeVisible();
  await page.locator(".agenda-month-grid .is-selected").click();
  await page.getByRole("button", { name: "Criar tarefa", exact: true }).click();
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
  await expect(page.getByRole("region", { name: "Calendário mensal" })).toBeVisible();
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

test("calendar stays visible and its icon opens the month selector", async ({ page }, info) => {
  await page.goto("/planejador");
  const toggle = page.getByRole("button", { name: "Escolher mês", exact: true });
  const calendar = page.getByRole("region", { name: "Calendário mensal" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(calendar).toBeVisible();
  await expect(page.getByText("Estudos, tarefas e compromissos em um só lugar.")).toHaveCount(0);
  for (const name of ["Hoje"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  }
  for (const name of ["Dia", "Semana", "Mês", "Lista"])
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await toggle.focus();
  await expect(toggle).toHaveCSS("outline-style", "none");
  await expect(toggle).toHaveCSS("text-decoration-line", "underline");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const picker = page.getByRole("dialog", { name: "Escolher mês e ano" });
  await picker.getByLabel("Ano", { exact: true }).fill("2027");
  await picker.getByRole("button", { name: "fevereiro", exact: true }).click();
  await expect(picker).not.toBeVisible();
  await calendar.getByRole("button", { name: "segunda-feira, 15 de fevereiro, 0 itens" }).click();
  await expect(page.locator("#agenda-day-title")).toHaveText("segunda-feira, 15 de fevereiro");
  await page.locator(".agenda-month-grid .is-selected").click();
  await page.getByRole("button", { name: "Criar tarefa", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
  await expect(form.getByLabel("Prazo", { exact: true })).toHaveValue("15/02/2027");
  await form.getByRole("textbox", { name: "Título", exact: true }).fill("Plano do dia escolhido");
  await form.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Concluir Plano do dia escolhido" })).toBeVisible();
  const planningBox = await page.locator(".agenda-day").boundingBox();
  const preceding = await page
    .locator(info.project.name === "desktop" ? ".agenda-history" : ".agenda-month")
    .boundingBox();
  expect(planningBox!.y).toBeGreaterThan(preceding!.y + preceding!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(calendar).toBeVisible();
  await expect(page.getByRole("button", { name: "Concluir Plano do dia escolhido" })).toBeVisible();
});
test("a selected day automatically filters focus and practice, including an empty day", async ({
  page,
}) => {
  const state = createInitialWorkspace();
  state.focusSessions = ["timer", "pomodoro"].map((mode, index) => ({
    id: mode,
    mode: mode as "timer" | "pomodoro",
    subjectId: state.subjects[0]!.id,
    durationMinutes: index ? 25 : 12,
    completedAt: "2026-10-01T12:00:00",
  }));
  state.practiceActivities = [
    {
      id: "math-day-1",
      islandId: "mathematics:school",
      islandName: "Matemática · Ensino médio",
      completedAt: "2026-10-01T12:30:00",
      answers: 3,
      correct: 2,
    },
  ];
  await page.addInitScript(
    (workspace) => localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace)),
    state,
  );
  await page.goto("/planejador");
  await page.getByRole("button", { name: "Escolher mês", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Escolher mês e ano" });
  await picker.getByLabel("Ano", { exact: true }).fill("2026");
  await picker.getByRole("button", { name: "outubro", exact: true }).click();
  const history = page.getByRole("region", { name: "Histórico de estudo" });
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveText("12 min");
  await expect(history.locator("header .paper-digits")).toHaveCount(0);
  await expect(history.locator(".agenda-bar-column small .paper-digits")).toHaveCount(0);
  await history.getByRole("button", { name: "Pomodoro", exact: true }).click();
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveText("25 min");
  await history.getByRole("button", { name: "Praticar", exact: true }).click();
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveText("3 respostas");
  await expect(history.locator('[data-icon="gamepad"]')).toHaveCount(1);
  await page.locator('button[data-date="2026-10-02"]').click();
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveCount(0);
  await expect(history.locator(".agenda-charts")).toHaveCount(0);
  await history.getByRole("button", { name: "Foco", exact: true }).click();
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveCount(0);
  await history.getByRole("button", { name: "Cronômetro", exact: true }).click();
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveCount(0);
  await page.locator('button[data-date="2026-10-01"]').click();
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveText("12 min");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(history.locator(".agenda-charts")).toHaveCSS("animation-name", "none");
});
test("weekly study opens focus without completing, records real minutes and returns to agenda", async ({
  page,
}) => {
  await page.goto("/planejador");
  await page.locator(".agenda-month-grid .is-selected").click();
  await page.getByRole("button", { name: "Reservar estudo", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Adicionar à agenda" });
  await form.getByRole("textbox", { name: "Título", exact: true }).fill("Estudar frações");
  await form.getByRole("button", { name: "Duração em minutos", exact: true }).click();
  const duration = page.getByRole("dialog", { name: "Escolher duração", exact: true });
  await duration.getByRole("spinbutton", { name: "Minutos", exact: true }).fill("1");
  await duration.getByRole("button", { name: "Concluir", exact: true }).click();
  await form.getByRole("button", { name: "Repetir semanalmente", exact: true }).click();
  await form.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByRole("button", { name: "Começar estudo Estudar frações" }).click();
  await expect(page).toHaveURL(/\/foco/);
  await expect(page.getByRole("region", { name: "Estudo da agenda" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("olena.focus-session.v1") ?? "null")?.plannedMinutes,
    ),
  ).toBe(1);
  await expect(page.getByRole("button", { name: "Encerrar e registrar" })).toBeDisabled();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).events[0].completedDates,
    ),
  ).toBeUndefined();
  // Resume a genuinely elapsed minute, rather than waiting a minute in every browser run.
  // Aplicar no novo documento, depois que o documento anterior terminar de salvar a sessão.
  await page.addInitScript(() => {
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
  await expect(page.locator(".agenda-visible-month")).toHaveText("janeiro de 2026");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await picker.getByRole("button", { name: "Este mês", exact: true }).click();
  await expect(page.locator(".agenda-month-grid button[aria-current='date']")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
for (const [instant, today] of [
  ["2026-10-13T00:30:00Z", "2026-10-12"],
  ["2026-10-13T03:30:00Z", "2026-10-13"],
] as const) {
  test(`overdue tasks move to the account date ${today} at ${instant}`, async ({ page }) => {
    await page.clock.install({ time: new Date(instant) });
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
    await page.addInitScript((workspace) => {
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
      localStorage.setItem("helena.agendaTimeZone.v1", "America/Sao_Paulo");
    }, state);
    await page.goto("/planejador");
    await page.getByRole("button", { name: "Mover Entrega pendente para hoje" }).click();
    await expect(page.getByRole("button", { name: "Concluir Entrega pendente" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Olena", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Planejar com Olena" })).toHaveCount(0);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).tasks[0].dueDate,
      ),
    ).toBe(today);
  });
}

test("agenda selects ranges by drag and clicks and shows only real focus history", async ({
  page,
}, info) => {
  const state = createInitialWorkspace();
  state.subjects.push({ id: "chart-math", name: "Matemática", color: "#38a4ad" });
  state.focusSessions = [
    {
      id: "one",
      mode: "timer",
      subjectId: state.subjects[0]!.id,
      durationMinutes: 15,
      completedAt: "2026-10-05T09:00:00",
    },
    {
      id: "two",
      mode: "timer",
      subjectId: state.subjects[0]!.id,
      durationMinutes: 25,
      completedAt: "2026-10-06T12:00:00",
    },
    {
      id: "three",
      mode: "timer",
      subjectId: state.subjects[0]!.id,
      durationMinutes: 5,
      completedAt: "2026-10-06T18:00:00",
    },
    {
      id: "four",
      mode: "timer",
      subjectId: "chart-math",
      durationMinutes: 20,
      completedAt: "2026-10-08T14:00:00",
    },
  ];
  await page.addInitScript(
    (workspace) => localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace)),
    state,
  );
  await page.goto("/planejador");
  await page.getByRole("button", { name: "Escolher mês", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Escolher mês e ano" });
  await expect(picker.locator(".agenda-close-icon")).toHaveAttribute(
    "src",
    "/navigation-icons/paper/agenda-close.svg",
  );
  await picker.getByLabel("Ano", { exact: true }).fill("2026");
  await picker.getByRole("button", { name: "outubro", exact: true }).click();
  const history = page.getByRole("region", { name: "Histórico de estudo" });
  await expect(page.getByRole("button", { name: "Escolher mês", exact: true })).toHaveCSS(
    "background-color",
    "rgb(255, 253, 248)",
  );
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveCount(0);
  const first = page.locator('button[data-date="2026-10-05"]');
  const last = page.locator('button[data-date="2026-10-08"]');
  await first.scrollIntoViewIfNeeded();
  const a = await first.boundingBox();
  const b = await last.boundingBox();
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  // Moving before the deliberate hold must leave the range untouched.
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, { steps: 2 });
  await page.mouse.up();
  await expect(page.locator(".agenda-month-grid .is-in-range")).toHaveCount(0);
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(380); // Intentional user hold, not a loading wait.
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator(".agenda-month-grid .is-in-range")).toHaveCount(4);
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveText("65 min");
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(380);
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2, { steps: 6 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".agenda-month-grid .is-in-range")).toHaveCount(4);
  await expect(
    history.getByRole("group", { name: "Categorias do estudo" }).getByRole("button"),
  ).toHaveCount(3);
  await expect(history.getByRole("button", { name: /^Minutos por período:/ })).toBeVisible();
  await expect(page.locator(".agenda-month-grid .has-study")).toHaveCount(3);
  await page.getByRole("button", { name: "Limpar intervalo", exact: true }).click();
  await page.getByRole("button", { name: "Selecionar intervalo", exact: true }).click();
  if (info.project.name === "mobile") await last.tap();
  else {
    await last.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByRole("button", { name: "Escolher fim", exact: true })).toBeVisible();
  const second = page.locator('button[data-date="2026-10-06"]');
  if (info.project.name === "mobile") await second.tap();
  else {
    await second.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".agenda-month-grid .is-in-range")).toHaveCount(3);
  await expect(history.locator(".agenda-chart-heading > strong")).toHaveText("50 min");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const rangeDays = page.locator(".agenda-month-grid .is-in-range");
    await expect(page.getByRole("button", { name: "Escolher mês", exact: true })).toHaveCSS(
      "background-color",
      "rgb(255, 253, 248)",
    );
    await expect(rangeDays).toHaveCount(3);
    for (const day of await rangeDays.all()) {
      await expect(day).toHaveCSS("background-color", "rgb(250, 204, 21)");
      await expect(day.locator(".paper-digits").first()).toHaveCSS("--digit-face", "#292432");
    }
    await expect(page.locator(".agenda-month-grid button > span > .paper-digits")).toHaveCount(35);
    const bars = history.getByRole("button", { name: /^Minutos por período:/ });
    await bars.focus();
    await page.keyboard.press("Home");
    await expect(history.locator(".agenda-chart-inspection")).toContainText("30 min");
    await page.keyboard.press("ArrowRight");
    await expect(history.locator(".agenda-chart-inspection")).toContainText("20 min");
    const fills = await history
      .locator(".agenda-pie-slice")
      .evaluateAll((slices) => slices.map((slice) => slice.getAttribute("fill")));
    expect(new Set(fills).size).toBe(2);
    await expect(history.locator(".agenda-donut-total")).toHaveText("50min");
    expect(await history.locator(".agenda-pie-slice").first().getAttribute("d")).toContain(
      "A34 34",
    );
    // Medir a geometria final, não o scaleY(0) transitório da entrada do gráfico.
    await history.locator(".agenda-bar-track > span").evaluateAll(async (bars) => {
      await Promise.all(
        bars.flatMap((bar) => bar.getAnimations().map((animation) => animation.finished)),
      );
    });
    const heights = await history
      .locator(".agenda-bar-track > span")
      .evaluateAll((bars) => bars.map((bar) => bar.getBoundingClientRect().height));
    expect(heights).toHaveLength(2);
    expect(heights[1]! / heights[0]!).toBeCloseTo(20 / 30, 1);
    await history.locator(".agenda-pie-slice").first().focus();
    await expect(history.locator(".agenda-chart-inspection")).toContainText("60% do total");
    await history
      .locator(".agenda-pie")
      .evaluate((ring) => ring.scrollIntoView({ block: "center", behavior: "instant" }));
    const ringBox = await history.locator(".agenda-pie").boundingBox();
    // The second segment's midpoint is 198 degrees, on the ring, not its empty center.
    const angle = (198 * Math.PI) / 180;
    const x = ringBox!.x + ((60 + 42 * Math.cos(angle)) / 120) * ringBox!.width;
    const y = ringBox!.y + ((60 + 42 * Math.sin(angle)) / 128) * ringBox!.height;
    if (info.project.name === "mobile") await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await expect(history.locator(".agenda-chart-inspection")).toContainText("40% do total");
    await history.screenshot({
      style: ".page-header, .mobile-nav, .helena-chat-launcher { visibility: hidden !important; }",
      path: info.outputPath(`dashboard-${theme}-${info.project.name}.png`),
    });
    for (const category of ["Caderno", "Praticar", "Foco", "Pomodoro", "Cronômetro"]) {
      const button = history.getByRole("button", { name: category, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(history.locator(".agenda-chart")).toHaveCount(
        category === "Foco" || category === "Cronômetro" ? 2 : 0,
      );
      await expect(page).toHaveURL(/\/planejador$/);
    }
  }
  if (
    info.project.name === "mobile" &&
    page.context().browser()?.browserType().name() === "chromium"
  ) {
    await page
      .locator(".agenda-month-grid")
      .evaluate((grid) => grid.scrollIntoView({ block: "center", behavior: "instant" }));
    const from = await last.boundingBox();
    const to = await first.boundingBox();
    const touch = await page.context().newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: from!.x + from!.width / 2, y: from!.y + from!.height / 2, id: 1 }],
    });
    await page.waitForTimeout(380); // Deliberate long press before selecting dates.
    for (let step = 1; step <= 6; step++) {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: from!.x + from!.width / 2 + ((to!.x - from!.x) * step) / 6,
            y: from!.y + from!.height / 2 + ((to!.y - from!.y) * step) / 6,
            id: 1,
          },
        ],
      });
    }
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touch.detach();
    await expect(page.locator(".agenda-month-grid .is-in-range")).toHaveCount(4);
    await expect(history.locator(".agenda-chart-heading > strong")).toHaveText("65 min");
  }
  await page.screenshot({
    path: info.outputPath(`agenda-history-${info.project.name}.png`),
    animations: "disabled",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("helenastudy.workspace.v1")!).focusSessions.length,
    ),
  ).toBe(4);
});
