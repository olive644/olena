import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import type { PublicLocalRoomState } from "../src/domain/local-room";

type BallContinuity = {
  maxSpeed: number;
  maxSizeJump: number;
  duplicate: boolean;
  samples: number;
};

test("bingo solar entra pela modalidade, cria sala e confere a cartela", async ({
  page,
}, testInfo) => {
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(),
    publish: async () => {},
    streamUrl: () => "/test-stream",
  });
  await page.route("**/api/local-room?*", async (route) => {
    const response = await handler(
      new Request(route.request().url(), {
        method: "POST",
        body: route.request().postData() ?? "{}",
      }),
    );
    await route.fulfill({
      status: response.status,
      body: await response.text(),
      contentType: "application/json",
    });
  });
  await page.addInitScript(() => {
    const costs: number[] = [];
    (window as unknown as { bingoFrameCosts: number[] }).bingoFrameCosts = costs;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) =>
      raf((time) => {
        const start = performance.now();
        callback(time);
        if (document.querySelector('.bingo-saturn-panel[aria-busy="true"]'))
          costs.push(performance.now() - start);
      });
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    Object.defineProperty(window, "EventSource", {
      value: class extends EventTarget {
        onopen = null;
        onerror = null;
        close() {}
      },
    });
  });
  await page.goto("/sala");
  await expect(page.locator(".local-room-join-actions")).toBeVisible();
  await expect(
    page.locator('.local-room-activities img[src="/room-art/poliana-bingo.webp"]'),
  ).toHaveCount(1);
  await page.getByRole("radio", { name: /^Bingo/ }).click();
  await expect(page.locator(".local-room-join-actions")).toHaveCSS("opacity", "0");
  await expect(page.getByRole("button", { name: "Entrar com código", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Modalidades coletivas/ }).click();
  await expect(page.getByRole("button", { name: "Entrar com código", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: /^Bingo/ }).click();
  const modes = page.getByRole("group", { name: "Modo de partida" });
  await expect(modes.getByRole("button")).toHaveCount(5);
  await expect
    .poll(() =>
      modes
        .locator("img")
        .evaluateAll((images) => images.every((img) => (img as HTMLImageElement).naturalWidth > 0)),
    )
    .toBe(true);
  for (const name of ["Linha", "Coluna", "Diagonal", "Quatro cantos", "Cartela cheia"]) {
    const button = modes.getByRole("button", { name: new RegExp("^" + name) });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    const copy = await button.locator(".bingo-mode-copy").boundingBox();
    const art = await button.locator(".bingo-mode-art").boundingBox();
    if (testInfo.project.name === "desktop")
      expect(copy!.x + copy!.width).toBeLessThanOrEqual(art!.x);
    else {
      const bounds = await button.boundingBox();
      expect(copy!.x + copy!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
      expect(bounds!.height).toBeLessThanOrEqual(100);
    }
  }
  await modes.getByRole("button", { name: /^Linha/ }).click();
  await expect(page.getByRole("slider", { name: "Tempo por pergunta" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Dificuldade" })).toHaveCount(0);
  await expect(page.locator(".main-content")).toHaveCSS(
    "background-image",
    /paper-sky-pattern-light/,
  );
  await expect(modes.getByRole("button", { name: /^Linha/ })).toHaveCSS(
    "background-color",
    "rgb(124, 58, 237)",
  );
  await expect(modes.getByRole("button", { name: /^Coluna/ })).toHaveCSS(
    "color",
    "rgb(15, 15, 20)",
  );
  await page.screenshot({
    path: testInfo.outputPath("bingo-modes-light.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Criar sala", exact: true }).click();
  await expect(page.locator(".poliana-room-qr img")).toHaveAttribute(
    "src",
    "/poliana-room-invite.webp",
  );
  await page
    .locator(".poliana-room-qr")
    .screenshot({ path: testInfo.outputPath("convite-poliana.png") });
  await page.getByRole("button", { name: /Também quero participar/ }).click();
  await page.getByRole("button", { name: "Iniciar atividade", exact: true }).click();
  const card = page.getByRole("region", { name: "Minha cartela" });
  const globe = page.getByLabel("Globo Saturno com as bolinhas restantes");
  await expect(globe).toBeVisible();
  await expect(globe).toHaveAttribute("data-remaining", "75");
  await expect(
    page.getByRole("list", { name: "Números sorteados" }).getByRole("listitem"),
  ).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("bingo-zero-bolas.png"), fullPage: true });
  await expect(page.locator(".bingo-rule")).toHaveCount(0);
  await expect(page.getByText("Complete sua constelação")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encerrar sala", exact: true })).toHaveCount(0);
  await expect(card.locator(".bingo-card-grid button")).toHaveCount(25);
  await expect(card.locator(".bingo-planet")).toHaveCount(5);
  await expect(card.locator(".bingo-cell-planet")).toHaveCount(24);
  for (const planet of ["earth", "mars", "jupiter", "saturn", "neptune"]) {
    await expect(card.locator(`.bingo-cell-planet[data-planet="${planet}"]`)).toHaveCount(
      planet === "jupiter" ? 4 : 5,
    );
  }
  await expect(card.locator(".bingo-card-blackhole")).toHaveCount(1);
  await expect(page.getByText("O Sol já conta como marcado.")).toHaveCount(0);
  await expect(page.getByText(/^Última bolinha:/)).toHaveCount(0);
  const machineBox = await page.locator(".bingo-machine-column").boundingBox();
  const cardBox = await card.boundingBox();
  const globeBox = await globe.boundingBox();
  const historyBox = await page.locator(".bingo-history").boundingBox();
  expect(historyBox!.y).toBeGreaterThan(globeBox!.y + globeBox!.height);
  if (testInfo.project.name === "desktop") {
    expect(cardBox!.x).toBeGreaterThan(machineBox!.x + machineBox!.width);
    expect(Math.abs(cardBox!.y - machineBox!.y)).toBeLessThan(10);
  } else {
    expect(cardBox!.y).toBeGreaterThan(historyBox!.y);
  }
  const claimBox = await page.getByRole("button", { name: "Bingo!", exact: true }).boundingBox();
  expect(claimBox!.y).toBeGreaterThan(cardBox!.y + cardBox!.height);
  await expect(page.locator(".bingo-claim img")).toHaveAttribute(
    "src",
    "/room-icons/bingo-claim.svg",
  );
  await expect(
    page.getByRole("button", { name: /Som ligado|Som desligado|Desativar sons/ }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sol, centro livre" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /Ouvir/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bingo!", exact: true })).toBeDisabled();
  // Começa a observar antes do sorteio, não depois das capturas. Em WebKit a captura
  // pode consumir quase toda a exibição do número e deixar só o fim do voo para medir.
  await page.evaluate(() => {
    const observation = new Promise<BallContinuity>((resolve) => {
      let started = false;
      let previous: { x: number; y: number; width: number; time: number } | undefined;
      const result = { maxSpeed: 0, maxSizeJump: 0, duplicate: false, samples: 0 };
      const deadline = performance.now() + 20_000;
      function frame(time: number) {
        const flying = document.querySelector<HTMLElement>(".bingo-flying");
        const canvas = document.querySelector<HTMLCanvasElement>(".bingo-saturn canvas");
        const isFlying = !!flying && getComputedStyle(flying).visibility === "visible";
        started ||= isFlying && flying.classList.contains("bingo-flying-focus");
        if (started && isFlying && canvas) {
          const id = flying.querySelector("text:last-child")?.textContent;
          const history = document.querySelector<HTMLElement>(
            `.bingo-history [data-bingo-number="${id}"]`,
          );
          result.duplicate ||= !!history && getComputedStyle(history).visibility === "visible";
          const rect = flying.getBoundingClientRect(),
            stage = canvas.getBoundingClientRect();
          const next = {
            x: rect.x + rect.width / 2 - stage.x,
            y: rect.y + rect.height / 2 - stage.y,
            width: rect.width,
            time,
          };
          if (previous) {
            result.maxSpeed = Math.max(
              result.maxSpeed,
              Math.hypot(next.x - previous.x, next.y - previous.y) /
                Math.max(1, time - previous.time),
            );
            result.maxSizeJump = Math.max(
              result.maxSizeJump,
              Math.abs(next.width - previous.width),
            );
          }
          previous = next;
          result.samples++;
        }
        if ((started && !isFlying) || time >= deadline) resolve(result);
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    (window as unknown as { bingoContinuity: Promise<BallContinuity> }).bingoContinuity =
      observation;
  });
  await page.getByRole("button", { name: "Sortear próxima bolinha" }).click();
  await globe.scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Girando…", exact: true })).toBeDisabled();
  const during = await globe.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await expect
    .poll(() => globe.evaluate((el) => (el as HTMLCanvasElement).toDataURL()))
    .not.toBe(during);
  await expect(page.getByRole("status").filter({ hasText: "A bolinha está saindo" })).toBeVisible();
  await page
    .locator(".bingo-saturn-panel")
    .screenshot({ path: testInfo.outputPath("approved-saturn-exit.png") });
  await expect(page.getByRole("status").filter({ hasText: /^Saiu / })).toBeVisible({
    timeout: 6000,
  });
  const flight = await page.locator(".bingo-flying").boundingBox();
  const stage = await globe.boundingBox();
  expect(flight).not.toBeNull();
  expect(stage).not.toBeNull();
  expect(flight!.x).toBeGreaterThanOrEqual(stage!.x - 1);
  expect(flight!.x + flight!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
  expect(flight!.y).toBeGreaterThanOrEqual(stage!.y - 1);
  expect(flight!.y + flight!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 1);
  await page
    .locator(".bingo-saturn-panel")
    .screenshot({ path: testInfo.outputPath("approved-saturn-reveal.png") });
  // A bola numerada continua no palco por toda a exibição. Não há uma cópia visível
  // no histórico, nem uma animação CSS concorrendo com a posição do pouso.
  const movingId = await page.locator(".bingo-flying text").last().textContent();
  await expect(page.locator(".bingo-result")).toHaveCount(0);
  await expect(page.locator(".bingo-flying strong")).toHaveCount(0);
  await expect(page.locator(`.bingo-history [data-bingo-number="${movingId}"]`)).toBeHidden();
  const continuity = await page.evaluate(
    () => (window as unknown as { bingoContinuity: Promise<BallContinuity> }).bingoContinuity,
  );
  expect(continuity.samples).toBeGreaterThan(10);
  expect(continuity.duplicate).toBe(false);
  expect(continuity.maxSpeed).toBeLessThan(1.5);
  expect(continuity.maxSizeJump).toBeLessThan(12);
  await testInfo.attach("continuidade-da-bolinha", {
    body: JSON.stringify(continuity),
    contentType: "application/json",
  });
  const frameCosts = await page.evaluate(() => {
    const costs = (window as unknown as { bingoFrameCosts: number[] }).bingoFrameCosts
      .filter((n) => n > 0.1)
      .sort((a, b) => a - b);
    return {
      samples: costs.length,
      median: costs[Math.floor(costs.length / 2)],
      p95: costs[Math.floor(costs.length * 0.95)],
    };
  });
  await testInfo.attach("custo-dos-quadros", {
    body: JSON.stringify(frameCosts),
    contentType: "application/json",
  });
  await writeFile(testInfo.outputPath("custo-dos-quadros.json"), JSON.stringify(frameCosts));
  await page
    .locator(`.bingo-history [data-bingo-number="${movingId}"]`)
    .waitFor({ state: "attached", timeout: 5000 });
  await expect(page.locator(`.bingo-history [data-bingo-number="${movingId}"]`)).toBeVisible({
    timeout: 5000,
  });
  await expect(page.locator(`.bingo-history [data-bingo-number="${movingId}"]`)).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(
    page.getByRole("list", { name: "Números sorteados" }).getByRole("listitem"),
  ).toHaveCount(1, { timeout: 12000 });
  await expect(page.getByRole("button", { name: "Sortear próxima bolinha" })).toBeEnabled();
  await expect(globe).toHaveAttribute("data-remaining", "74");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page
    .getByRole("region", { name: "Bingo de números" })
    .evaluate((el) => el.scrollIntoView());
  await page.screenshot({
    path: testInfo.outputPath("bingo-solar-light.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await expect(card.locator(".bingo-planet-digits").first()).toHaveCSS("--digit-face", "#fff9ef");
  await page.screenshot({ path: testInfo.outputPath("bingo-solar-dark.png"), fullPage: true });
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await card.screenshot({
    path: testInfo.outputPath("bingo-card-dark.png"),
    animations: "disabled",
  });
  await page.locator(".bingo-claim").screenshot({
    path: testInfo.outputPath("bingo-action-dark.png"),
    animations: "disabled",
  });
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page
      .getByRole("region", { name: "Bingo de números" })
      .evaluate((el) => el.scrollIntoView());
    await page.screenshot({ path: testInfo.outputPath("bingo-final-desktop.png") });
  }
});

test("uma sala numérica confirma uma vitória verdadeira nos quatro cantos", async ({
  page,
}, testInfo) => {
  // Duas rodadas aleatórias podem exigir 150 sorteios pela interface em WebKit.
  test.setTimeout(240_000);
  let latest: PublicLocalRoomState | undefined;
  const claims: boolean[] = [];
  const handler = createLocalRoomHandler({
    store: createMemoryRoomStore(),
    publish: async (_code, state) => {
      latest = state;
    },
    streamUrl: () => "/test-stream",
  });
  const current = () => {
    if (!latest) throw new Error("Sala não publicada pelo backend");
    return latest;
  };
  await page.route("**/api/local-room?*", async (route) => {
    const request = route.request();
    const response = await handler(
      new Request(request.url(), {
        method: request.method(),
        body: request.postData() ?? "{}",
      }),
    );
    const body = await response.text();
    if (request.url().includes("action=answer") && request.postDataJSON().answer === "bingo") {
      claims.push((JSON.parse(body) as { correct: boolean }).correct);
    }
    await route.fulfill({ status: response.status, body, contentType: "application/json" });
  });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    Object.defineProperty(window, "EventSource", {
      value: class extends EventTarget {
        onopen = null;
        onerror = null;
        close() {}
      },
    });
  });
  // Só movimento reduzido para percorrer o sorteio aleatório inteiro com rapidez.
  // Não se altera deck, cartela, sorteio, resposta ou condição de vitória do backend.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sala");
  await page.getByRole("radio", { name: /^Bingo/ }).click();
  await page.getByRole("button", { name: /^Quatro cantos/ }).click();
  await page.getByRole("button", { name: "Criar sala", exact: true }).click();
  await page.getByRole("button", { name: /Também quero participar/ }).click();
  await page.getByRole("button", { name: "Iniciar atividade", exact: true }).click();
  const player = current().participants[0]!;
  const card = player.bingoCard!;
  const goals = [0, 4, 20, 24].map((i) => card[i]!);
  await expect(page.getByRole("button", { name: "Bingo!", exact: true })).toBeDisabled();
  expect(claims).toEqual([]);
  for (let draw = 0; draw <= 75; draw++) {
    for (const id of goals) {
      if (
        current().drawnIds?.includes(id) &&
        !current().participants[0]!.bingoMarks?.includes(id)
      ) {
        const label = ["B", "I", "N", "G", "O"][Math.floor((Number(id) - 1) / 15)] + " " + id;
        const cell = page.getByRole("button", { name: label, exact: true });
        await expect(cell).toBeEnabled();
        await cell.click();
        await expect.poll(() => current().participants[0]!.bingoMarks?.includes(id)).toBe(true);
      }
    }
    if (goals.every((id) => current().participants[0]!.bingoMarks?.includes(id))) break;
    const before = current().drawnIds!.length;
    expect(before).toBeLessThan(75);
    const drawButton = page.getByRole("button", { name: "Sortear próxima bolinha", exact: true });
    await expect(drawButton).toBeEnabled();
    await drawButton.click();
    await expect.poll(() => current().drawnIds!.length).toBe(before + 1);
    await expect(page.getByLabel("Globo Saturno com as bolinhas restantes")).toHaveAttribute(
      "data-remaining",
      String(75 - before - 1),
    );
  }
  const finalPlaying = current();
  expect(new Set(finalPlaying.drawnIds).size).toBe(finalPlaying.drawnIds!.length);
  expect(goals.every((id) => finalPlaying.drawnIds?.includes(id))).toBe(true);
  expect(goals.every((id) => finalPlaying.participants[0]!.bingoMarks?.includes(id))).toBe(true);
  await page
    .getByRole("region", { name: "Minha cartela" })
    .screenshot({ path: testInfo.outputPath("cartela-quatro-cantos-completa.png") });
  await page.getByRole("button", { name: "Bingo!", exact: true }).click();
  expect(claims).toEqual([true]);
  expect(current().phase).toBe("playing");
  expect(current().participants[0]!.score).toBe(4);
  const announcement = page.getByRole("dialog", { name: `${player.displayName} FEZ BINGO!` });
  await expect(announcement).toBeVisible();
  await expect(
    announcement.getByRole("region", { name: "Cartela para conferência" }),
  ).toBeVisible();
  await expect(page.locator(".local-room-podium")).toHaveCount(0);
  await announcement.screenshot({ path: testInfo.outputPath("aviso-bingo-poliana.png") });
  await announcement.getByRole("button", { name: "Foi engano!", exact: true }).click();
  await expect(announcement).toHaveCount(0);
  expect(current().bingoWinnerIds).toEqual([]);
  await page.getByRole("button", { name: "Bingo!", exact: true }).click();
  await expect(announcement).toBeVisible();
  await announcement.getByRole("button", { name: "Recomeçar", exact: true }).click();
  await expect(announcement).toHaveCount(0);
  expect(current().drawnIds).toEqual([]);
  expect(current().participants[0]!.bingoMarks).toEqual([]);
  await expect(page.getByLabel("Globo Saturno com as bolinhas restantes")).toHaveAttribute(
    "data-remaining",
    "75",
  );
  // Confere de novo uma rodada reiniciada, usando o mesmo backend e os botões reais.
  const restartGoals = [0, 4, 20, 24].map((i) => current().participants[0]!.bingoCard![i]!);
  for (let draw = 0; draw <= 75; draw++) {
    for (const id of restartGoals)
      if (
        current().drawnIds?.includes(id) &&
        !current().participants[0]!.bingoMarks?.includes(id)
      ) {
        await page
          .getByRole("button", {
            name: ["B", "I", "N", "G", "O"][Math.floor((Number(id) - 1) / 15)] + " " + id,
            exact: true,
          })
          .click();
        await expect.poll(() => current().participants[0]!.bingoMarks?.includes(id)).toBe(true);
      }
    if (restartGoals.every((id) => current().participants[0]!.bingoMarks?.includes(id))) break;
    const before = current().drawnIds!.length;
    expect(before).toBeLessThan(75);
    await page.getByRole("button", { name: "Sortear próxima bolinha", exact: true }).click();
    await expect.poll(() => current().drawnIds!.length).toBe(before + 1);
    await expect(page.getByLabel("Globo Saturno com as bolinhas restantes")).toHaveAttribute(
      "data-remaining",
      String(75 - before - 1),
    );
  }
  await page.getByRole("button", { name: "Bingo!", exact: true }).click();
  await expect(announcement).toBeVisible();
  await announcement.getByRole("button", { name: "Continuar partida", exact: true }).click();
  await expect(announcement).toHaveCount(0);
  expect(current().phase).toBe("playing");
  expect(current().bingoWinnerIds).toEqual([player.id]);
  expect(current().participants[0]!.score).toBe(104);
  await expect(page.getByRole("button", { name: "Bingo!", exact: true })).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath("vitoria-bingo-confirmada.png"),
    fullPage: true,
  });
  await testInfo.attach("prova-da-vitoria", {
    body: JSON.stringify({
      mode: "corners",
      card,
      drawn: finalPlaying.drawnIds,
      marks: finalPlaying.participants[0]!.bingoMarks,
      claims,
      phase: current().phase,
      score: 104,
      transport: "handler real, store em memória",
    }),
    contentType: "application/json",
  });
});
