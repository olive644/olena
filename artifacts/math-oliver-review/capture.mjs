import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const directory = "artifacts/math-oliver-review";
const url = "http://127.0.0.1:4196/artifacts/math-oliver-review/";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const images = [];
const errors = [];
const motionChecks = [];
const soundChecks = [];
const layoutChecks = [];
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "no-preference",
      isMobile: name === "mobile",
      hasTouch: name === "mobile",
    });
    await context.route("https://**/*", (route) => route.abort());
    await context.addInitScript(() => {
      window.__reviewTones = 0;
      const Native = window.AudioContext;
      if (Native)
        window.AudioContext = class extends Native {
          createOscillator() {
            window.__reviewTones++;
            return super.createOscillator();
          }
        };
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    for (const theme of ["light", "dark"]) {
      for (const mode of ["explanation", "question"]) {
        await page.goto(`${url}?theme=${theme}&mode=${mode}`);
        await page.getByRole("heading", { name: "Vamos entender juntos?" }).waitFor();
        await page.locator("html").evaluate((node, value) => {
          if (node.dataset.theme !== value) throw new Error("Wrong theme");
        }, theme);
        await page.evaluate(() => document.fonts.ready);
        await page
          .getByAltText("Oliver sentado, sorrindo e explicando com a mão levantada")
          .evaluate((image) => image.decode());
        await page.locator('.oliver-review-art[data-ready="true"]').waitFor();
        if (theme === "light" && mode === "explanation") {
          const counts = await page
            .locator(".oliver-review-art canvas")
            .evaluate(async (canvas) => {
              const samples = [];
              for (let index = 0; index < 8; index++) {
                await new Promise((resolve) => setTimeout(resolve, 120));
                const data = canvas
                  .getContext("2d")
                  .getImageData(
                    Math.floor((canvas.width * 511) / 1254),
                    Math.floor((canvas.height * 508) / 1254),
                    Math.floor((canvas.width * 350) / 1254),
                    Math.floor((canvas.height * 230) / 1254),
                  ).data;
                let dark = 0;
                for (let i = 0; i < data.length; i += 4)
                  if (data[i + 3] > 100 && Math.max(data[i], data[i + 1], data[i + 2]) < 80) dark++;
                samples.push(dark);
              }
              return samples;
            });
          if (Math.max(...counts) - Math.min(...counts) < 5)
            throw new Error(`Rive mouth did not animate: ${name}/${counts}`);
          motionChecks.push({ viewport: name, mouthDarkPixelCounts: counts });
        }
        // Oculta somente a lista das provas, que pertence à ferramenta de revisão.
        await page.locator("#proofs").evaluate((node) => {
          node.style.display = "none";
        });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        if (overflow) throw new Error(`Overflow ${name}/${theme}/${mode}`);
        if (await page.locator(".math-hearts,.math-time,.math-reserve").count())
          throw new Error("Review has lives or time");
        const file = `${name}-${theme}-${mode}.png`;
        await page.screenshot({ path: resolve(directory, file), fullPage: true });
        images.push({
          file,
          theme,
          mode,
          viewport,
          sha256: hash(resolve(directory, file)),
          scope: "página da amostra, lista de provas oculta, Rive real ativo",
        });
      }
    }
    await page.goto(url);
    await page.getByRole("button", { name: "Agora é sua vez" }).click();
    await page.getByRole("button", { name: "Resposta 5", exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.getByText("Quase! Olhe a explicação do Oliver e tente outra alternativa.").waitFor();
    const tonesBeforeMute = await page.evaluate(() => window.__reviewTones);
    if (tonesBeforeMute === 0) throw new Error("No native sound effects");
    await page.getByRole("button", { name: "Som ligado", exact: true }).click();
    await page.getByRole("button", { name: "Resposta 14", exact: true }).click();
    const tonesMuted = await page.evaluate(() => window.__reviewTones);
    if (tonesMuted !== tonesBeforeMute) throw new Error("Mute did not silence effects");
    soundChecks.push({
      viewport: name,
      nativeOscillators: tonesBeforeMute,
      mutedOscillatorsAdded: tonesMuted - tonesBeforeMute,
    });
    await page.getByRole("button", { name: "Som desligado", exact: true }).click();
    for (const [answer, last] of [
      [15, false],
      [9, false],
      [12, true],
    ]) {
      const symbol = page.locator(".oliver-review__practice .math-question-mark");
      if (await symbol.count()) {
        const bounds = await symbol.boundingBox();
        if (!bounds || bounds.width > 33 || bounds.height > 41)
          throw new Error(`Oversized question symbol: ${JSON.stringify(bounds)}`);
        layoutChecks.push({ viewport: name, question: 2, symbol: bounds });
        await page.locator("#proofs").evaluate((node) => {
          node.style.display = "none";
        });
        await page.screenshot({
          path: resolve(directory, `${name}-light-question-2.png`),
          fullPage: true,
        });
      }
      await page.getByRole("button", { name: `Resposta ${answer}`, exact: true }).click();
      await page.getByText("Isso! Você encontrou a resposta.").waitFor();
      await page
        .getByRole("button", { name: last ? "Concluir revisão" : "Próxima questão", exact: true })
        .click();
      if (!last) await page.getByRole("button", { name: "Agora é sua vez" }).click();
    }
    await page.getByRole("heading", { name: "Você conseguiu!" }).waitFor();
    const writes = await page.evaluate(() => [
      localStorage.getItem("helena.mathGame.v5"),
      localStorage.getItem("helena.mathPlaceRewards.v1"),
    ]);
    if (writes.some((value) => value !== null))
      throw new Error("Sample changed progress or rewards");
    await context.close();
  }
  const reduced = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const requests = [];
  reduced.on("request", (request) => {
    if (/oliver-math-review\/.*\.riv|\/rive\.(js|wasm)/.test(request.url()))
      requests.push(request.url());
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(url);
  await reducedPage.getByRole("heading", { name: "Vamos entender juntos?" }).waitFor();
  if (await reducedPage.locator(".oliver-review-art canvas").count())
    throw new Error("Reduced motion loaded canvas");
  const reducedAnimation = await reducedPage
    .locator(".oliver-review__speech")
    .evaluate((node) => getComputedStyle(node).animationName);
  if (requests.length || reducedAnimation !== "none")
    throw new Error("Reduced motion not respected");
  await reduced.close();
  if (errors.length) throw new Error(errors.join("\n"));
  const manifest = {
    base: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    sourceHash: hash(`${directory}/review.tsx`),
    cssHash: hash(`${directory}/review.css`),
    artHash: hash(`${directory}/oliver-tutor-v1.png`),
    riveHash: hash("public/oliver-math-review/oliver.riv"),
    playerHash: hash("src/components/oliver-review-art.tsx"),
    playerCssHash: hash("src/components/oliver-review-art.css"),
    url,
    fixtures:
      "3 questões reais do banco em amostra isolada, sem coleta de partida ou conta; Oliver Rive real com sons do minigame, sem voz sintetizada",
    images,
    interactions:
      "erro por Enter, nova tentativa, três acertos, conclusão; nenhum progresso ou recompensa gravado",
    errors,
    motionChecks,
    soundChecks,
    layoutChecks,
    reducedMotion: { requests, animation: reducedAnimation },
  };
  writeFileSync(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
  process.stdout.write(
    JSON.stringify({ images: images.length, interactions: "passed in both viewports", errors }),
  );
} finally {
  await browser.close();
}
