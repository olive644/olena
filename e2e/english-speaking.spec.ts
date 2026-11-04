import { GENERAL_ACHIEVEMENTS } from "../src/domain/general-achievement-catalog";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createInitialWorkspace, type PracticeActivity } from "../src/domain/workspace";
import { isWorkspaceState } from "../src/data/local-workspace";
import { englishQuestion, type EnglishCourse } from "../src/data/english-journey";
import { isSpeakingQuestion } from "../src/data/english-speaking";
import { VOICE_FILES, VOICE_MODEL, VOICE_REVISION } from "../src/data/english-asr-model";
const course = JSON.parse(
  readFileSync("public/languages/en/english-v4.json", "utf8"),
) as EnglishCourse;
course.a1 = JSON.parse(readFileSync("public/languages/en/english-a1-v1.json", "utf8"));
const directory = "C:/Users/User/Documents/Codex/2026-09-10/b/previews-english-speaking";
type BrowserVoice = Window & {
  voiceTest: {
    starts: number;
    aborts: number;
    text: string;
    denied: boolean;
    hold: boolean;
    release?: () => void;
  };
};
function completed() {
  const records: PracticeActivity[] = [];
  for (let part = 0; part < 6; part++) {
    for (let group = 0; group < 4; group++)
      records.push({
        id: `speaking-fixture:${part}:${group}`,
        islandId: "languages",
        islandName: "English",
        completedAt: new Date(1700000000000 + records.length * 1000).toISOString(),
        answers: 6,
        correct: 6,
        languageAttempt: {
          curriculum: 3,
          area: "english",
          part,
          mode: "practice",
          questions: Array.from({ length: 6 }, (_, i) => group * 6 + i),
          correctQuestions: Array.from({ length: 6 }, (_, i) => group * 6 + i),
        },
      });
    records.push({
      id: `speaking-fixture:${part}:final`,
      islandId: "languages",
      islandName: "English",
      completedAt: new Date(1700000000000 + records.length * 1000).toISOString(),
      answers: 5,
      correct: 5,
      languageAttempt: {
        curriculum: 3,
        area: "english",
        part,
        mode: "final",
        questions: [0, 1, 2, 3, 4],
        correctQuestions: [0, 1, 2, 3, 4],
      },
    });
  }
  return records;
}
async function setup(page: Page, part: number, theme: string, supported = true, denied = false) {
  const q = Array.from({ length: part === 0 ? 240 : 120 }, (_, id) =>
    englishQuestion(course, part, id),
  ).find(isSpeakingQuestion)!;
  const workspace = createInitialWorkspace();
  workspace.studyPreferences.initialIslandId = "languages";
  workspace.practiceActivities = completed();
  expect(isWorkspaceState(workspace)).toBe(true);
  await page.addInitScript(
    ({ workspace, part, theme, id, supported, denied }) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
      if (!sessionStorage.getItem("speaking-fixture")) {
        sessionStorage.setItem("speaking-fixture", "1");
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
        localStorage.setItem(
          "helena.profile.v1",
          JSON.stringify({
            name: "Visitante de teste",
            photoUrl: "/profile-avatars/oliver.webp",
            englishCheckpoints: {
              [`${part}:practice`]: {
                owner: null,
                part,
                mode: "practice",
                question: id,
                updatedAt: Date.now(),
              },
            },
          }),
        );
      }
      const harness: BrowserVoice["voiceTest"] = {
        starts: 0,
        aborts: 0,
        text: "",
        denied,
        hold: false,
      };
      Object.defineProperty(window, "voiceTest", { value: harness });
      const RealWorker = window.Worker;
      class ModelWorker {
        onmessage: ((event: { data: { id: number; type: string; text?: string } }) => void) | null =
          null;
        onerror: (() => void) | null = null;
        postMessage(message: { id: number; type: string }) {
          const result = () =>
            this.onmessage?.({
              data: {
                id: message.id,
                type: message.type === "load" ? "ready" : "result",
                ...(message.type === "load" ? {} : { text: harness.text }),
              },
            });
          if (message.type === "transcribe")
            queueMicrotask(() =>
              this.onmessage?.({
                data: {
                  id: message.id,
                  type: "partial",
                  text: harness.text.split(" ").slice(0, 2).join(" "),
                },
              }),
            );
          if (message.type === "transcribe" && harness.hold) {
            // Prévia e resultado final podem estar em espera ao mesmo tempo: soltar libera todos.
            const earlier = harness.release;
            harness.release = () => {
              earlier?.();
              result();
            };
          } else queueMicrotask(result);
        }
        terminate() {
          harness.aborts++;
        }
      }
      Object.defineProperty(window, "Worker", {
        configurable: true,
        value: class extends RealWorker {
          constructor(url: string | URL, options?: WorkerOptions) {
            if (String(url).includes("english-asr.worker"))
              return new ModelWorker() as unknown as Worker;
            super(url, options);
          }
        },
      });
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            harness.starts++;
            if (harness.denied) throw new DOMException("denied", "NotAllowedError");
            const track = { readyState: "live", stop: () => harness.aborts++ };
            return { getTracks: () => [track], getAudioTracks: () => [track] };
          },
        },
      });
      Object.defineProperty(AudioContext.prototype, "audioWorklet", {
        configurable: true,
        get: () => ({ addModule: async () => undefined }),
      });
      Object.defineProperty(AudioContext.prototype, "createMediaStreamSource", {
        configurable: true,
        value: () => ({ connect: () => undefined, disconnect: () => undefined }),
      });
      class Capture {
        port: {
          onmessage:
            ((event: { data: { samples: Float32Array; sampleRate: number } }) => void) | null;
        } = { onmessage: null };
        timer: ReturnType<typeof setInterval> | undefined;
        constructor() {
          queueMicrotask(() =>
            this.port.onmessage?.({
              data: { samples: new Float32Array(16000).fill(0.02), sampleRate: 16000 },
            }),
          );
          // O microfone real continua entregando áudio enquanto a pessoa fala.
          this.timer = setInterval(
            () =>
              this.port.onmessage?.({
                data: { samples: new Float32Array(1600).fill(0.02), sampleRate: 16000 },
              }),
            100,
          );
        }
        connect() {}
        disconnect() {
          clearInterval(this.timer);
        }
      }
      Object.defineProperty(window, "AudioWorkletNode", {
        configurable: true,
        value: supported ? Capture : undefined,
      });
    },
    { workspace, part, theme, id: q.id, supported, denied },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/aprender");
  await page.getByRole("button", { name: "Explorar Inglês", exact: true }).click();
  await page.getByRole("button", { name: "Explorar lugar", exact: true }).click();
  await page.clock.install();
  await page
    .locator(".english-island-interior")
    .getByRole("button", { name: "Praticar", exact: true })
    .click();
  await expect(page.locator(".math-countdown")).toBeVisible();
  await page.clock.runFor(3000);
  await expect(page.locator(".english-speaking")).toBeVisible();
  await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", String(q.id));
  return q;
}
async function prepare(page: Page) {
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Preparar voz no aparelho", exact: true }).click();
  await expect(page.getByRole("button", { name: "Falar agora", exact: true })).toBeVisible();
}
async function finish(page: Page, transcript: string) {
  await page.evaluate((text) => {
    (window as BrowserVoice).voiceTest.text = text;
  }, transcript);
  await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", "listening");
  // Clear the old hover after the permission error disappears and recenters the activity.
  await page.mouse.move(0, 0);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole("button", { name: "Terminar fala", exact: true }).click();
  await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", /ready|retry/);
}

for (const theme of ["light", "dark"]) {
  for (let part = 0; part < 6; part++)
    test(`speech in English part ${part + 1}, ${theme}`, async ({ page }, info) => {
      if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const q = await setup(page, part, theme);
      const before = await page.locator(".math-time").getAttribute("aria-label");
      await page.clock.runFor(5000);
      expect(await page.locator(".math-time").getAttribute("aria-label")).toBe(before);
      expect(await page.evaluate(() => (window as BrowserVoice).voiceTest.starts)).toBe(1);
      await expect(
        page.getByRole("button", { name: "Preparar voz no aparelho", exact: true }),
      ).toBeDisabled();
      await prepare(page);
      await page.getByRole("button", { name: "Falar agora", exact: true }).click();
      await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", "listening");
      await page.clock.runFor(1000);
      await expect(page.locator(".math-time")).not.toHaveAttribute("aria-label", before!);
      await mkdir(directory, { recursive: true });
      await page.evaluate((text) => {
        (window as BrowserVoice).voiceTest.text = text;
      }, q.answer.split(/\s+/).slice(0, 2).join(" "));
      await page.clock.runFor(2000);
      await expect(page.locator("[data-word-state=correct]")).toHaveCount(2);
      await expect(page.getByRole("button", { name: "Enviar resposta", exact: true })).toHaveCount(
        0,
      );
      await page.screenshot({
        path: `${directory}/${info.project.name}-${theme}-part${part + 1}-listening.png`,
      });
      await expect(page.locator(".english-speaking-wave i").first()).toHaveCSS(
        "animation-name",
        "none",
      );
      const back = await page.getByRole("button", { name: "Voltar", exact: true }).boundingBox();
      expect(back!.y).toBeGreaterThanOrEqual(0);
      await finish(page, q.answer);
      // A atividade reaproveitou o microfone liberado no início: nenhum segundo pedido.
      expect(await page.evaluate(() => (window as BrowserVoice).voiceTest.starts)).toBe(1);
      await expect(page.locator(".english-speaking-transcript")).toHaveText(q.answer);
      await expect(page.locator("[data-word-state=correct]")).toHaveCount(
        q.answer.trim().split(/\s+/).length,
      );
      await expect(page.locator("[data-word-state=correct]").first()).toHaveCSS(
        "color",
        "rgb(23, 75, 55)",
      );
      await page.screenshot({
        path: `${directory}/${info.project.name}-${theme}-part${part + 1}-transcript.png`,
      });
      await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
      await expect(page.locator(".math-answer-reaction.is-correct")).toBeVisible();
      await expect(page.locator(".math-score")).toHaveAttribute("aria-label", /20/);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      expect(
        await page
          .locator(".english-island-interior")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      expect(errors).toEqual([]);
    });
  test(`holding the microphone button records and releasing finishes: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const q = await setup(page, 0, theme);
    await prepare(page);
    const button = page.getByRole("button", { name: "Falar agora", exact: true });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", "listening");
    await expect(page.getByRole("status")).toContainText("Solte o botão");
    await page.evaluate((text) => {
      (window as BrowserVoice).voiceTest.text = text;
    }, q.answer);
    await page.clock.runFor(1500);
    // Pausa longa segurando: não encerra sozinha.
    await page.clock.runFor(3000);
    await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", "listening");
    await page.mouse.up();
    await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", /ready|retry/);
    expect(await page.evaluate(() => (window as BrowserVoice).voiceTest.starts)).toBe(1);
  });
  test(`an achievement earned during the speaking round appears above it: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 360, height: 740 });
    await setup(page, 0, theme);
    // Mesmo recibo local do teste da celebração, aplicado com a partida de Inglês em tela cheia.
    await page.evaluate(
      (id) => {
        const profile = JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}");
        profile.achievementHistory = {
          ...profile.achievementHistory,
          [id]: "2026-11-04T12:00:00Z",
        };
        localStorage.setItem("helena.profile.v1", JSON.stringify(profile));
        window.dispatchEvent(new CustomEvent("helena:synced-storage-change"));
      },
      GENERAL_ACHIEVEMENTS.find((item) => item.rarity === "rare")!.id,
    );
    const notice = page.getByLabel("Nova conquista", { exact: true });
    await expect(notice).toBeVisible();
    await page.screenshot({ path: info.outputPath(`conquista-na-partida-${theme}.png`) });
    // O clique só chega ao botão se nada da partida estiver por cima da celebração.
    await notice.getByRole("button", { name: "Fechar conquista" }).click({ timeout: 5000 });
    await expect(notice).toHaveCount(0);
    await expect(page.locator(".english-speaking")).toBeVisible();
  });
  test(`speech denial, retry, private transcript and same-question fallback: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    // Negado no pedido do início da partida: a atividade não reabre o pedido sozinha, só ao tocar.
    const q = await setup(page, 0, theme, true, true);
    expect(await page.evaluate(() => (window as BrowserVoice).voiceTest.starts)).toBe(1);
    await prepare(page);
    await page.getByRole("button", { name: "Falar agora", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("não foi autorizado");
    await page.clock.runFor(45000);
    await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
    await page.evaluate(() => {
      (window as BrowserVoice).voiceTest.denied = false;
    });
    await page.getByRole("button", { name: "Falar agora", exact: true }).click();
    await finish(page, "private microphone text do not save");
    await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", "retry");
    await expect(page.locator("[data-word-state=retry]").first()).toBeVisible();
    await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(storage).not.toContain("private microphone text");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Sair da rodada", exact: true }).click();
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await expect(page.locator(".math-countdown")).toBeVisible();
    // The clock is paused for color assertions; flush each React countdown commit.
    for (const remaining of [2, 1]) {
      await page.clock.runFor(1000);
      await expect(page.locator(".math-countdown .paper-digits")).toHaveText(String(remaining));
    }
    await page.clock.runFor(1000);
    await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", String(q.id));
    await page.getByRole("button", { name: "Agora não posso falar", exact: true }).click();
    await expect(page.locator(".english-speaking")).toHaveCount(0);
    await expect(page.locator(".english-word-bank")).toBeVisible();
    await expect(page.locator(".math-hearts")).toHaveAttribute("aria-label", /3/);
  });
  test(`a voice already prepared on this device does not ask for the download again: ${theme}`, async ({
    page,
  }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const q = await setup(page, 0, theme);
    await prepare(page);
    // O navegador guardou os pesos do modelo no cache; o worker de teste não baixa nada de verdade.
    await page.evaluate(
      async ({ model, revision, files }) => {
        const cache = await caches.open("transformers-cache");
        for (const file of files)
          await cache.put(
            `https://huggingface.co/${model}/resolve/${revision}/onnx/${file}`,
            new Response("peso"),
          );
      },
      { model: VOICE_MODEL, revision: VOICE_REVISION, files: [...VOICE_FILES] },
    );
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Sair da rodada", exact: true }).click();
    await page
      .locator(".english-island-interior")
      .getByRole("button", { name: "Praticar", exact: true })
      .click();
    await expect(page.locator(".math-countdown")).toBeVisible();
    for (const remaining of [2, 1]) {
      await page.clock.runFor(1000);
      await expect(page.locator(".math-countdown .paper-digits")).toHaveText(String(remaining));
    }
    await page.clock.runFor(1000);
    await expect(page.locator(".english-lesson")).toHaveAttribute("data-question-id", String(q.id));
    await expect(page.getByRole("button", { name: "Falar agora", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Preparar voz no aparelho", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".english-speaking")).not.toContainText("Baixe o modelo gratuito");
  });
  test(`speech aborts on account change: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    await setup(page, 0, theme);
    await prepare(page);
    await page.getByRole("button", { name: "Falar agora", exact: true }).click();
    const abortedBefore = await page.evaluate(() => (window as BrowserVoice).voiceTest.aborts);
    await page.evaluate(() => {
      localStorage.setItem("helena.account.v1", "other-test-account");
      window.dispatchEvent(new StorageEvent("storage"));
    });
    await expect(page.locator(".english-speaking")).toHaveCount(0);
    expect(await page.evaluate(() => (window as BrowserVoice).voiceTest.aborts)).toBeGreaterThan(
      abortedBefore,
    );
    await expect(page.locator(".english-entry")).toBeVisible();
  });
  test(`local speech processing pauses the deadline: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const q = await setup(page, 0, theme);
    await prepare(page);
    await page.getByRole("button", { name: "Falar agora", exact: true }).click();
    await page.clock.runFor(1000);
    const before = await page.locator(".math-time").getAttribute("aria-label");
    await page.evaluate(() => {
      const h = (window as BrowserVoice).voiceTest;
      h.hold = true;
      h.text = "test";
    });
    // A prévia ao vivo anima a frase enquanto escuta: congela o relógio, como finish(), antes do toque.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    // O cursor parado sobre o botão alterna o realce de hover quando a frase muda de altura
    // com a prévia ao vivo; só no celular de 320 px isso impede o teste de estabilidade.
    await page.getByRole("button", { name: "Terminar fala", exact: true }).click({ force: true });
    await expect(page.locator(".english-speaking")).toHaveAttribute("data-phase", "processing");
    await page.clock.runFor(5000);
    expect(await page.locator(".math-time").getAttribute("aria-label")).toBe(before);
    await page.evaluate((text) => {
      const h = (window as BrowserVoice).voiceTest;
      h.text = text;
      h.release?.();
    }, q.answer);
    await expect(page.locator(".math-answer-reaction.is-correct")).toBeVisible();
  });
  test(`unsupported voice uses words without penalty: ${theme}`, async ({ page }, info) => {
    if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 568 });
    const q = await setup(page, 0, theme, false);
    await expect(page.getByRole("status")).toContainText("não oferece gravação");
    await page.getByRole("button", { name: "Agora não posso falar", exact: true }).click();
    for (const word of q.phrase.split(" "))
      await page
        .locator('.english-word-bank button[aria-disabled="false"]')
        .getByText(word, { exact: true })
        .first()
        .click();
    await expect(page.locator(".math-answer-reaction.is-correct")).toBeVisible();
    expect(await page.evaluate(() => (window as BrowserVoice).voiceTest.starts)).toBe(0);
  });
}
