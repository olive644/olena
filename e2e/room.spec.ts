import { test, expect } from "@playwright/test";
import { createLocalRoomHandler } from "../src/backend/local-room-handler";
import { createMemoryRoomStore } from "../src/backend/room-transaction";
import { createRoomRecordingHandler } from "../src/backend/room-recording-handler";
import type { PublicLocalRoomState } from "../src/domain/local-room";

function silentWav(): Buffer {
  const samples = 2000;
  const audio = Buffer.alloc(44 + samples * 2);
  audio.write("RIFF", 0);
  audio.writeUInt32LE(audio.length - 8, 4);
  audio.write("WAVEfmt ", 8);
  audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20);
  audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(8000, 24);
  audio.writeUInt32LE(16000, 28);
  audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34);
  audio.write("data", 36);
  audio.writeUInt32LE(samples * 2, 40);
  return audio;
}

for (const activity of ["listening", "bingo"] as const) {
  test(`preparação de ${activity} permite rolar até palavras e criar sem cortes`, async ({
    page,
    browserName,
  }, testInfo) => {
    const scrollPage = async (distance: number) => {
      // Mobile WebKit does not expose wheel input. Keep document-height and
      // viewport assertions there, and real wheel coverage in Chromium.
      if (browserName === "webkit" && testInfo.project.name === "mobile") {
        await page.evaluate((delta) => window.scrollBy(0, delta), distance);
      } else {
        await page.mouse.move(page.viewportSize()!.width - 4, 150);
        await page.mouse.wheel(0, distance);
      }
    };
    await page.addInitScript(() => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    });
    await page.goto("/sala");
    await expect(page.locator(".page-header .user-profile")).toBeVisible();
    await expect(page.locator(".page-header .appearance-picker__trigger")).toBeVisible();
    const preparation = page.locator(".local-room-preparation");
    await expect(preparation.getByRole("radiogroup", { name: "Atividades da sala" })).toBeVisible();
    await expect(preparation.locator(".local-room-session__header")).toHaveCount(0);
    await expect(preparation.locator('.local-room-activity[aria-checked="true"]')).toHaveCount(0);
    await expect(preparation.locator(".local-room-settings__panel")).toHaveCount(0);
    await expect(preparation.locator(".local-room-activity__art")).toHaveCount(4);
    await expect
      .poll(() =>
        preparation
          .locator(".local-room-activity__art")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath("minigames-unselected.png") });
    expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).not.toBe("hidden");
    if (activity === "bingo") {
      await preparation.getByRole("radio", { name: /^Bingo/ }).click();
    } else {
      await preparation.getByRole("radio", { name: /Escuta coletiva/ }).click();
      await expect(
        preparation.locator('.local-room-activity[aria-checked="true"] .local-room-activity__art'),
      ).toHaveCSS("opacity", "1");
      await expect(
        preparation.getByRole("button", { name: /Modalidades coletivas/ }),
      ).toHaveAttribute("aria-expanded", "false");
      await preparation
        .locator(".local-room-modalities")
        .screenshot({ path: testInfo.outputPath("minigames-selected.png") });
      const words = preparation.locator(".local-room-ready-words__results button");
      await expect(preparation.getByRole("searchbox")).toHaveCount(0);
      await preparation.getByRole("button", { name: "Inglês", exact: true }).click();
      await expect(words).toHaveCount(100);
      const first = words.first();
      await expect(first.locator('[data-paper-icon="plus"]')).toHaveCount(1);
      await expect(preparation.getByRole("button", { name: "Selecionar exibidas" })).toHaveCount(0);
      await first.hover();
      await expect
        .poll(() => first.evaluate((button) => getComputedStyle(button, "::before").opacity))
        .toBe("1");
      expect(
        await first.evaluate((button) => getComputedStyle(button, "::before").backgroundImage),
      ).toContain("room-art/english-study.webp");
      const backgroundSizes = await first.evaluate((button) =>
        getComputedStyle(button, "::before").backgroundSize.split(", "),
      );
      expect(backgroundSizes[0]).toMatch(/^auto [\d.]+%$/);
      expect(Number.parseFloat(backgroundSizes[0]!.slice(5))).toBe(130);
      expect(backgroundSizes).toHaveLength(1);
      await expect(first.locator(".paper-english-word__outline").first()).toHaveCSS(
        "display",
        "inline",
      );
      await expect(first.locator(".paper-english-word pattern")).toHaveCount(0);
      await first.focus();
      await page.mouse.move(0, 0);
      await first.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect
        .poll(() => first.evaluate((button) => getComputedStyle(button, "::before").opacity))
        .toBe("1");
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => {
          document.documentElement.dataset["theme"] = value;
        }, theme);
        await first.screenshot({ path: testInfo.outputPath(`word-background-${theme}.png`) });
      }
      await page.evaluate(() => {
        document.documentElement.dataset["theme"] = "light";
      });
      const bounds = await first.boundingBox();
      expect(bounds).not.toBeNull();
      const viewport = page.viewportSize()!;
      await scrollPage(bounds!.y - 150);
      await expect
        .poll(async () => (await first.boundingBox())?.y ?? -1)
        .toBeLessThan(viewport.height - 150);
      await first.click();
      await expect(first).toHaveAttribute("aria-checked", "true");
      await expect(first.locator('[data-paper-editor-icon="add"]')).toHaveCount(0);
      await expect(preparation.getByRole("button", { name: "Remover school" })).toBeVisible();
      const timer = preparation.getByRole("slider", { name: "Tempo por pergunta" });
      await expect(preparation.locator(".local-room-step-slider")).toHaveCSS(
        "grid-column",
        "1 / -1",
      );
      await timer.focus();
      await timer.press("Home");
      await timer.press("ArrowRight");
      await expect(timer).toHaveValue("1");
      await expect(timer).toHaveAttribute("aria-valuetext", "10s");
      expect(
        await timer.evaluate((input) =>
          getComputedStyle(input).getPropertyValue("--room-slider-progress").trim(),
        ),
      ).toBe("33.33333333333333%");
      await preparation
        .locator(".local-room-ready-words")
        .screenshot({ path: testInfo.outputPath("english-words.png") });
      await expect(words).toHaveCount(100);
      await expect(preparation.getByRole("button", { name: "Aplicar seleção" })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath("words-selectable.png") });
    }
    const viewport = page.viewportSize()!;
    await scrollPage(8000);
    const create = preparation.getByRole("button", { name: "Criar sala", exact: true });
    await expect
      .poll(async () => {
        const bounds = await create.boundingBox();
        return Boolean(
          bounds &&
          bounds.y >= 0 &&
          bounds.y + bounds.height <
            viewport.height - (testInfo.project.name === "mobile" ? 120 : 0),
        );
      })
      .toBe(true);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(create).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath(`create-${activity}-reachable.png`) });
  });
}

for (const source of ["bank", "files", "files-retry"] as const) {
  test(`prepara ${source} antes de criar a sala`, async ({ page }, testInfo) => {
    const store = createMemoryRoomStore();
    const handler = createLocalRoomHandler({
      store,
      publish: async () => {},
      streamUrl: () => "/test-stream",
    });
    const recordings = createRoomRecordingHandler({ store });
    let failUpload = source === "files-retry";
    const actions: string[] = [];
    await page.route("**/api/local-room?*", async (route) => {
      actions.push(new URL(route.request().url()).searchParams.get("action") ?? "");
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
    await page.route("**/api/room-recording?*", async (route) => {
      if (failUpload) {
        failUpload = false;
        await route.fulfill({ status: 503, json: { error: "Falha temporária no envio" } });
        return;
      }
      const response = await recordings(
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
    await expect(page.getByRole("radiogroup", { name: "Atividades da sala" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar sala", exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: /Escuta coletiva/ }).click();
    if (source === "bank") {
      await page.getByRole("button", { name: "Inglês", exact: true }).click();
      const search = page.getByRole("searchbox", {
        name: "Buscar palavras em inglês ou português",
      });
      await search.fill("onibus");
      await page
        .locator(".local-room-ready-words__results")
        .getByRole("checkbox", { name: /bus/ })
        .click();
      await expect(page.getByRole("button", { name: "Criar sala", exact: true })).toBeEnabled();
      await expect(page.getByRole("button", { name: "Aplicar seleção" })).toHaveCount(0);
      await page.getByRole("button", { name: "Limpar", exact: true }).click();
      await expect(page.getByRole("button", { name: "Criar sala", exact: true })).toBeDisabled();
      await search.fill("");
      await page
        .locator(".local-room-ready-words__results")
        .getByRole("checkbox", { name: /bus/ })
        .click();
    } else {
      await page.getByRole("button", { name: "Enviar arquivos", exact: true }).click();
      await page.getByLabel("Palavra em inglês da fala 1").fill("hello");
      await page.getByLabel("Tradução da fala 1", { exact: true }).fill("olá");
      await page
        .getByLabel("Enviar áudio de hello")
        .setInputFiles({ name: "hello.wav", mimeType: "audio/wav", buffer: silentWav() });
      await page.getByRole("button", { name: "Guardar áudio" }).click();
      await expect(page.getByText("Áudio preparado", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Aplicar palavras", exact: true }).click();
    }
    expect(actions).toEqual([]);
    await expect(page.getByLabel("Código da sala", { exact: true })).toHaveCount(0);
    await page.locator(".local-room-preparation").evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({ path: testInfo.outputPath(`preparing-${source}.png`) });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await page.screenshot({
      path: testInfo.outputPath(`preparing-${source}-dark.png`),
      animations: "disabled",
    });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await page.getByRole("button", { name: "Criar sala", exact: true }).click();
    await expect(page.getByLabel("Código da sala", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar com código", exact: true })).toHaveCount(
      0,
    );
    await expect(page.locator(".local-room-share")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await expect(page.locator(".local-room-share")).toHaveCSS("border-top-width", "0px");
    const invite = await page.locator(".local-room-share").boundingBox();
    expect(invite).not.toBeNull();
    if (testInfo.project.name === "desktop") {
      expect(invite!.x + invite!.width / 2).toBeLessThan(page.viewportSize()!.width / 2);
      const people = await page.locator(".local-room-lobby__invite").boundingBox();
      expect(people!.x).toBeGreaterThanOrEqual(invite!.x + invite!.width);
    } else {
      expect(Math.abs(invite!.x + invite!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(
        10,
      );
    }
    await expect(page.getByRole("button", { name: "Iniciar atividade" })).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath("created-lobby.png") });
    await expect(page.getByText("Criando sala…")).toHaveCount(0);
    await expect(page.getByText("Preparando atividade…")).toHaveCount(0);
    if (source === "files-retry") {
      await expect(page.getByText("Falha temporária no envio")).toBeVisible();
      await page.getByRole("button", { name: "Tentar enviar áudios novamente" }).click();
      await expect(
        page.getByRole("button", { name: "Tentar enviar áudios novamente" }),
      ).toHaveCount(0);
      await expect(page.getByText("Preparando atividade…")).toHaveCount(0);
      await expect.poll(() => actions.filter((action) => action === "create").length).toBe(1);
    }
    await expect(page.locator(".local-room-settings")).toHaveCount(0);
    if (source !== "bank") expect(actions).toContain("settings");
    expect(actions[0]).toBe("create");
    expect(
      await page
        .locator(".local-room-fullscreen")
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    if (source === "bank") {
      const code = await page.getByLabel("Código da sala", { exact: true }).innerText();
      const joined = await page.evaluate(async (roomCode) => {
        const response = await fetch("/api/local-room?action=join", {
          method: "POST",
          body: JSON.stringify({ code: roomCode, displayName: "Ana" }),
        });
        return response.ok;
      }, code);
      expect(joined).toBe(true);
      await page.reload();
      await expect(page.locator(".local-room-participant-list li")).toHaveCount(1);
      const audioResponse = page.waitForResponse((response) =>
        /\/audio\/kokoro\/ready-[a-z]+\.mp3$/.test(response.url()),
      );
      await page.getByRole("button", { name: "Iniciar atividade", exact: true }).click();
      expect((await audioResponse).status()).toBe(200);
      await expect(page.getByText("Pergunta 1 de 1", { exact: true })).toBeVisible();
    }
  });
}

// Real room handler and optimistic transactions, with a deterministic transport
// adapter instead of production Firebase. Each participant has isolated storage.
for (const activity of ["listening", "bingo"] as const) {
  test(`dois dispositivos completam ${activity} e retomam a identidade`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    const states = new Map<string, PublicLocalRoomState>();
    const store = createMemoryRoomStore();
    const handler = createLocalRoomHandler({
      store,
      publish: async (code, state) => {
        if ((state.revision ?? 0) >= (states.get(code)?.revision ?? 0)) states.set(code, state);
      },
      streamUrl: (code) => `${testInfo.project.use.baseURL}/test-room/${code}`,
    });
    const recordingHandler = createRoomRecordingHandler({ store });
    let playbackRequests = 0;
    const hostViewport =
      testInfo.project.name === "mobile"
        ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
        : { viewport: { width: 1280, height: 900 }, isMobile: false };
    const contexts = await Promise.all([
      browser.newContext(hostViewport),
      browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
      browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
    ]);
    try {
      for (const context of contexts) {
        await context.route("**/api/local-room?*", async (route) => {
          const request = route.request();
          const body = request.postDataJSON() as { settings?: { activity?: string } };
          if (request.url().includes("action=settings") && body.settings?.activity) {
            await new Promise((resolve) => setTimeout(resolve, 700));
          }
          const response = await handler(
            new Request(request.url(), {
              method: request.method(),
              headers: request.headers(),
              body: request.postData() ?? "{}",
            }),
          );
          await route.fulfill({
            status: response.status,
            contentType: "application/json",
            body: await response.text(),
          });
        });
        await context.route("**/api/room-recording?*", async (route) => {
          const request = route.request();
          if (request.url().includes("action=play")) playbackRequests += 1;
          const response = await recordingHandler(
            new Request(request.url(), {
              method: request.method(),
              headers: request.headers(),
              body: request.postData() ?? "{}",
            }),
          );
          await route.fulfill({
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: Buffer.from(await response.arrayBuffer()),
          });
        });
        await context.route("**/test-room/*", (route) =>
          route.fulfill({
            json: { path: "/", data: states.get(route.request().url().split("/").at(-1)!) },
          }),
        );
        await context.addInitScript(() => {
          class TestStream extends EventTarget {
            onopen: (() => void) | null = null;
            onerror: (() => void) | null = null;
            timer: ReturnType<typeof setInterval>;
            constructor(url: string) {
              super();
              this.timer = setInterval(() => {
                void fetch(url)
                  .then((r) => r.text())
                  .then((data) => {
                    this.onopen?.();
                    this.dispatchEvent(new MessageEvent("put", { data }));
                  })
                  .catch(() => this.onerror?.());
              }, 150);
            }
            close() {
              clearInterval(this.timer);
            }
          }
          Object.defineProperty(window, "EventSource", { value: TestStream });
        });
      }
      const host = await contexts[0]!.newPage();
      await host.addInitScript(() => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      });
      await host.goto("/");
      await host
        .getByRole("button", {
          name: "Praticar",
          exact: true,
        })
        .click();
      await expect(host.getByRole("heading", { name: "Pratique para lembrar." })).toBeVisible();
      await host.screenshot({ path: testInfo.outputPath("practice.png") });
      await host.goto("/sala");
      await expect(host.getByRole("radiogroup", { name: "Atividades da sala" })).toBeVisible();
      await expect(host.locator(".local-room-share")).toHaveCount(0);
      await host.getByRole("radio", { name: /Escuta coletiva/ }).click();
      await host.getByRole("button", { name: "Inglês", exact: true }).click();
      await host
        .getByRole("searchbox", { name: "Buscar palavras em inglês ou português" })
        .fill("bus");
      await host
        .locator(".local-room-ready-words__results")
        .getByRole("checkbox", { name: /bus/ })
        .click();
      await expect(host.getByRole("combobox", { name: "Material da sala" })).toHaveCount(0);
      await expect(
        host.getByRole("checkbox", { name: "Aceitar um pequeno erro de digitação" }),
      ).toHaveCount(0);
      const shuffleQuestions = host.getByRole("checkbox", { name: "Embaralhar questões" });
      await expect(shuffleQuestions).toHaveCSS("appearance", "none");
      await expect(shuffleQuestions).toHaveCSS("background-color", "rgb(250, 204, 21)");
      if (testInfo.project.name === "mobile") {
        const settingsColumns = await host
          .locator(".local-room-settings__panel")
          .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
        expect(settingsColumns).toBe(1);
        await host.locator(".local-room-settings").screenshot({
          path: testInfo.outputPath("room-mobile-settings.png"),
        });
      }
      const selectedActivity = host.locator('.local-room-activity[aria-checked="true"]');
      await host.getByRole("button", { name: /Modalidades coletivas/ }).click();
      await selectedActivity.hover();
      await expect(selectedActivity).toHaveCSS("background-color", "rgb(116, 51, 224)");
      await expect(selectedActivity).toHaveCSS("color", "rgb(255, 249, 239)");
      if (activity === "bingo") {
        const bingo = host.getByRole("radio", { name: /^Bingo/ });
        await bingo.click();
        await expect(bingo).toHaveAttribute("aria-checked", "true");
        await expect(host.getByText("Preparando atividade…")).toHaveCount(0);
      }
      if (activity === "listening") {
        await host.getByRole("button", { name: "Enviar arquivos", exact: true }).click();
        await expect(host.getByRole("button", { name: "Gravar", exact: true })).toHaveCount(0);
        await host.locator('.local-room-recording input[type="file"]').setInputFiles({
          name: "fala.wav",
          mimeType: "audio/wav",
          buffer: silentWav(),
        });
        await host.getByRole("button", { name: "Guardar áudio" }).click();
        await expect(host.getByText("Áudio preparado", { exact: true })).toBeVisible();
        await host
          .locator(".local-room-manual")
          .screenshot({ path: testInfo.outputPath("manual-recording.png") });
        const pairs = [
          ["school", "escola"],
          ["friend", "amigo"],
          ["book", "livro"],
          ["window", "janela"],
          ["teacher", "professor"],
        ];
        for (const [index, pair] of pairs.entries()) {
          if (index > 0) await host.getByRole("button", { name: "Adicionar fala" }).click();
          await host.getByLabel(`Palavra em inglês da fala ${index + 1}`).fill(pair[0]!);
          await host.getByLabel(`Tradução da fala ${index + 1}`, { exact: true }).fill(pair[1]!);
          if (index > 0) {
            const card = host.locator(".local-room-recording").nth(index);
            await card.locator('input[type="file"]').setInputFiles({
              name: "fala.wav",
              mimeType: "audio/wav",
              buffer: silentWav(),
            });
            await card.getByRole("button", { name: "Guardar áudio" }).click();
            await expect(card.getByText("Áudio preparado", { exact: true })).toBeVisible();
          }
        }
        await host.getByRole("button", { name: "Aplicar palavras", exact: true }).click();
        await expect(host.getByText("5 falas adicionadas à rodada", { exact: true })).toBeVisible();
      }
      await host.getByRole("button", { name: "Criar sala", exact: true }).click();
      await expect(host.locator(".local-room-share")).toBeVisible();
      await expect(host.locator(".local-room-settings")).toHaveCount(0);
      await expect(host.getByText("Criando sala…")).toHaveCount(0);
      await expect(host.getByText("Preparando atividade…")).toHaveCount(0);
      await host.locator(".local-room-share img").evaluate(async (image) => {
        await (image as HTMLImageElement).decode();
      });
      const qrBounds = await host.locator(".local-room-share svg[aria-label]").boundingBox();
      expect(qrBounds?.width).toBeGreaterThanOrEqual(120);
      expect(Math.abs((qrBounds?.width ?? 0) - (qrBounds?.height ?? 0))).toBeLessThan(1);
      await expect(host.locator(".local-room-share [data-qr-finder]")).toHaveCount(3);
      await expect(host.locator(".local-room-share [data-qr-logo]")).toHaveAttribute(
        "href",
        "/favicon-star.svg",
      );
      await expect(host.locator(".helena-room-qr--holding svg")).toHaveAttribute(
        "data-qr-error-correction",
        "H",
      );
      await expect(host.locator(".helena-room-qr--holding svg rect")).toHaveCount(9);
      await host.locator(".local-room-share__code").scrollIntoViewIfNeeded();
      await host.screenshot({ path: testInfo.outputPath("room-paper.png") });
      await host.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await host.screenshot({
        path: testInfo.outputPath("room-paper-dark.png"),
        animations: "disabled",
      });
      await host.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      const code = await host.getByLabel("Código da sala", { exact: true }).innerText();
      const players = await Promise.all(contexts.slice(1).map((c) => c.newPage()));
      await Promise.all(
        players.map(async (page, index) => {
          await page.addInitScript((i) => {
            localStorage.setItem(
              "helena.profile.v1",
              JSON.stringify({ name: `Aluno ${i}`, photoUrl: "/profile-avatars/oliver.webp" }),
            );
          }, index);
          await page.goto(`/?sala=${code}`);
          await expect(page.getByText(`Aluno ${index}`, { exact: true })).toBeVisible();
          await expect(page.getByLabel("Nome de exibição")).toHaveCount(0);
          await page.getByRole("button", { name: "Entrar", exact: true }).click();
          await expect(page.getByText("Aguardando o início")).toBeVisible();
        }),
      );
      await expect(host.locator(".local-room-participant-list li")).toHaveCount(2);
      await expect(host.locator(".local-room-participant-list img").first()).toHaveAttribute(
        "src",
        "/profile-avatars/oliver.webp",
      );
      await expect(
        host.locator(".local-room-participant-list").getByText("Pronto", { exact: true }),
      ).toHaveCount(2);
      const startButton = host.getByRole("button", { name: "Iniciar atividade" });
      await expect(startButton).toHaveCSS("background-color", "rgb(116, 51, 224)");
      await expect(startButton).toHaveCSS("background-image", /linear-gradient/);
      await expect(host.locator(".local-room-session__header .theme-toggle")).toHaveCount(0);
      expect(
        await host
          .locator(".local-room-fullscreen")
          .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true);
      const projector =
        activity === "listening"
          ? await Promise.all([
              contexts[0]!.waitForEvent("page"),
              host.getByRole("button", { name: "Modo Projetor" }).click(),
            ]).then(([page]) => page)
          : undefined;
      if (projector) {
        await expect(projector).toHaveURL(new RegExp(`/sala/${code}/projetor$`));
        await expect(projector.getByRole("main").getByText(code, { exact: true })).toBeVisible();
        await expect(projector.getByText(code, { exact: true })).toHaveCount(1);
        await expect(projector.locator(".helena-room-qr--holding")).toBeVisible();
        await expect(projector.getByRole("button", { name: "Sair da sala" })).toHaveCount(0);
        await projector.screenshot({ path: testInfo.outputPath("projector-lobby.png") });
      }
      await host.screenshot({ path: testInfo.outputPath("lobby-desktop.png") });
      await host.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await host.screenshot({
        path: testInfo.outputPath("lobby-dark.png"),
        animations: "disabled",
      });
      await host.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
      await expect(host.locator("#root")).toHaveAttribute("inert", "");
      await host.getByRole("button", { name: "Iniciar atividade" }).click();
      if (projector)
        await expect(projector.getByRole("heading", { name: "Ouça com atenção" })).toBeVisible();
      await players[0]!.reload();
      for (let question = 0; question < 5; question++) {
        await expect(
          host.getByText(`Pergunta ${question + 1} de 5`, { exact: true }),
        ).toBeVisible();
        await expect(host.locator(".local-room-round__host-question span")).toHaveText(
          "Áudio reproduzido",
        );
        const word = states.get(code)!.currentQuestion!.front;
        if (activity === "listening" && question === 0) {
          await host.getByRole("button", { name: "Revelar palavra" }).click();
          await expect(host.locator(".local-room-round__host-question span")).toHaveText(
            "Áudio reproduzido",
          );
          await host.getByRole("button", { name: "Confirmar revelação" }).click();
          await expect(host.locator(".local-room-round__host-question span")).toHaveText(word);
          await host.getByRole("button", { name: "Ocultar palavra" }).click();
        }
        await Promise.all(
          (activity === "bingo" && question === 4 ? players.slice(0, 1) : players).map(
            async (page) => {
              await expect(
                page.getByText(`Pergunta ${question + 1} de 5`, { exact: true }),
              ).toBeVisible();
              if (question === 0 && page === players[0])
                await page.screenshot({ path: testInfo.outputPath("round-mobile.png") });
              if (activity === "listening") {
                const wrong = question === 0 && page === players[1];
                await page
                  .getByLabel("Digite a tradução")
                  .fill(wrong ? "resposta incorreta" : word);
                await page.getByRole("button", { name: "Responder", exact: true }).click();
                if (question === 0) {
                  const feedback = page.locator(".local-room-answer-feedback");
                  await expect(feedback).toHaveClass(wrong ? /is-wrong/ : /is-correct/);
                  await expect(feedback.locator(".paper-english-word__outline").first()).toHaveCSS(
                    "display",
                    "none",
                  );
                  await expect(feedback.locator(".local-room-answer-feedback__pair")).toHaveCSS(
                    "background-image",
                    /linear-gradient/,
                  );
                  await expect(feedback.getByRole("img", { name: /Helena/ })).toBeVisible();
                  await expect(feedback.locator(".room-answer-helena__frames")).toHaveCSS(
                    "background-image",
                    wrong ? /helena-wrong-frames/ : /helena-correct-frames/,
                  );
                  await expect(
                    feedback.locator(".local-room-answer-feedback__pair > span"),
                  ).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
                  await expect(feedback.locator(".local-room-xp-feedback")).toContainText(
                    wrong ? "-5 pontos" : "pontos",
                  );
                  await page.evaluate(
                    async (result) => {
                      const sprite = new Image();
                      sprite.src = `/room-art/helena-${result}-frames.webp`;
                      await sprite.decode();
                    },
                    wrong ? "wrong" : "correct",
                  );
                  await expect
                    .poll(() =>
                      feedback
                        .locator(".room-answer-helena__frames")
                        .evaluate((element) =>
                          element
                            .getAnimations()
                            .some((animation) => Number(animation.currentTime) >= 650),
                        ),
                    )
                    .toBe(true);
                  await page.screenshot({
                    path: testInfo.outputPath(wrong ? "answer-wrong.png" : "answer-correct.png"),
                  });
                  if (!wrong) await expect(feedback.locator(".room-speed-label")).toHaveCount(0);
                  await page.emulateMedia({ reducedMotion: "reduce" });
                  await expect(feedback.locator(".room-answer-helena__frames")).toHaveCSS(
                    "animation-name",
                    "none",
                  );
                  await expect(feedback.locator(".room-answer-helena__frames")).toHaveCSS(
                    "background-position",
                    "100% 100%",
                  );
                  await page.emulateMedia({ reducedMotion: "no-preference" });
                }
              } else {
                const current = states.get(code)!;
                const label = current.bingoWords!.find(
                  (card) => card.id === current.currentQuestion!.id,
                )!.text;
                await page
                  .locator(".local-room-bingo-grid")
                  .getByRole("button", { name: label, exact: true })
                  .click();
              }
            },
          ),
        );
      }
      await expect(host.getByRole("heading", { name: "Classificação", exact: true })).toBeVisible();
      await expect(host.getByRole("button", { name: "Repetir" })).toBeVisible();
      await expect(host.getByRole("button", { name: "Trocar atividade" })).toBeVisible();
      await expect(host.getByRole("button", { name: "Encerrar sala" })).toBeVisible();
      expect(states.get(code)!.participants).toHaveLength(2);
      for (const participant of states.get(code)!.participants) {
        expect(participant.score).toBeGreaterThanOrEqual(activity === "listening" ? 100 : 0);
        expect(participant.score).toBeLessThanOrEqual(500);
        expect(participant.reward?.xp).toBeGreaterThan(0);
      }
      if (activity === "listening") expect(playbackRequests).toBeGreaterThan(0);
      await host.getByRole("button", { name: "Trocar atividade", exact: true }).click();
      for (let index = 2; index < 7; index++) {
        await handler(
          new Request(`${testInfo.project.use.baseURL}/api/local-room?action=join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              displayName: `Aluno ${index}`,
              avatarUrl: "/profile-avatars/helena.webp",
            }),
          }),
        );
      }
      const participants = host.locator(".local-room-participant-list li");
      await expect(participants).toHaveCount(7);
      const positions = await participants.evaluateAll((items) =>
        items.map((item) => {
          const bounds = item.getBoundingClientRect();
          return { x: bounds.x, y: bounds.y };
        }),
      );
      expect(positions[5]!.x).toBeCloseTo(positions[0]!.x);
      expect(positions[5]!.y).toBeGreaterThan(positions[0]!.y);
      expect(positions[6]!.x).toBeGreaterThan(positions[0]!.x);
      expect(positions[6]!.y).toBeCloseTo(positions[0]!.y);
      await participants.first().scrollIntoViewIfNeeded();
      await host.screenshot({ path: testInfo.outputPath("participants.png") });
      await expect(host.locator(".local-room-settings")).toHaveCount(0);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}
