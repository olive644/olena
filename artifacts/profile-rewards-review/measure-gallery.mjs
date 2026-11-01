import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const catalog = JSON.parse(await readFile(path.join(root, "public/arcana/catalog.json"), "utf8"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const measurements = [];
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const devtools = await context.newCDPSession(page);
      await devtools.send("Network.enable");
      await devtools.send("Network.setCacheDisabled", { cacheDisabled: true });
      await devtools.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.route("https://**/*", (route) => route.abort());
      await page.addInitScript((cards) => {
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.privacyNotice.v1", "2026-10-29");
        localStorage.setItem(
          "helena.profile.v1",
          JSON.stringify({ name: "Perfil de teste", cardFavorites: [] }),
        );
        localStorage.setItem(
          "helena.mathPlaceRewards.v1",
          JSON.stringify({
            foundations: {
              points: 1000,
              receipts: [],
              chests: cards.map((card, index) => ({
                id: `fixture-${index}`,
                opened: true,
                unlockAt: 0,
                ...(card.id === "major-17"
                  ? { kind: "arcane", arcana: "major-17" }
                  : { cards: [card.id] }),
                revealed: 1,
                revealedAt: [1793318400000],
              })),
            },
          }),
        );
      }, catalog);
      const requests = new Set();
      const sizes = [];
      let measuring = false;
      page.on("response", (response) => {
        if (measuring && /\/arcana\/.*\.webp/.test(response.url())) {
          requests.add(response.url());
          sizes.push(
            response
              .body()
              .then((buffer) => buffer.length)
              .catch(() => 0),
          );
        }
      });
      await page.goto("http://127.0.0.1:4190/perfil");
      const open = page.getByRole("button", { name: "Ver todas as cartas", exact: true });
      await open.waitFor();
      measuring = true;
      const start = performance.now();
      await open.click();
      await page.getByRole("dialog", { name: "Arcano", exact: true }).waitFor();
      const first = page.locator(".profile-cards__gallery-item img");
      const visibleCount = viewport.width < 600 ? 3 : 5;
      await first.nth(visibleCount - 1).waitFor();
      await first.evaluateAll(
        (images, count) => Promise.all(images.slice(0, count).map((image) => image.decode())),
        visibleCount,
      );
      const firstRowMs = Math.round(performance.now() - start);
      await page.waitForTimeout(1000);
      const state = await page.evaluate(() => ({
        decoded: [...document.querySelectorAll(".profile-cards__gallery-item img")].filter(
          (image) => image.complete && image.naturalWidth > 0,
        ).length,
        domNodes:
          document.querySelector('[role="dialog"], dialog[open]')?.querySelectorAll("*").length ??
          0,
      }));
      const bytes = (await Promise.all(sizes)).reduce((total, size) => total + size, 0);
      measurements.push({
        viewport,
        run,
        firstRowMs,
        requestedImages: requests.size,
        imageBytes: bytes,
        ...state,
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
const label = process.argv[2] ?? "baseline";
const result = {
  label,
  measuredAt: new Date().toISOString(),
  environment:
    "Edge headless, CPU 4x, cache disabled, local dev server; fixture with 78 earned cards, external network blocked",
  measurements,
};
await writeFile(
  path.join(root, `artifacts/profile-rewards-review/gallery-${label}.json`),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
