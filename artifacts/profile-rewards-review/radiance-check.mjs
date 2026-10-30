import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
    await page.route("https://**/*", (route) => route.abort());
    await page.goto("http://127.0.0.1:4190/artifacts/profile-rewards-review/");
    await page.getByRole("heading", { name: "Perfil e Arcano", exact: true }).waitFor();
    for (const [label, rank, count] of [
      ["Comum: Seis de Paus", 0, 4],
      ["Épica: O Mago", 2, 8],
      ["Lendária: A Estrela", 3, 12],
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await page.getByRole("button", { name: "Testar revelação desta carta", exact: true }).click();
      const reward = page.locator(".cosmic-reveal");
      for (let i = 0; i < 4; i++) await reward.locator(".cosmic-dust-tap").click();
      await reward.locator(".oliver-flip-button").click();
      const effects = reward.locator(`.arcana-radiance[data-rarity='${rank}']`);
      await effects.waitFor();
      if ((await effects.locator("i").count()) !== count)
        throw Error("Rarity effect not applied to reward");
      const display = await effects
        .locator(".arcana-radiance__glints")
        .evaluate((el) => getComputedStyle(el).display);
      if (reducedMotion === "reduce" && display !== "none")
        throw Error("Reduced motion is not respected");
      results.push({
        label,
        rank,
        particles: count,
        reducedMotion,
        hidden: display === "none",
        source: "real component with simulated reward, no audio/storage/random draw",
      });
      await reward.locator(".oliver-booster-close").click();
      await reward.waitFor({ state: "detached" });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/profile-rewards-review/radiance-check.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
