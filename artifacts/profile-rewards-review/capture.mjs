import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const origin = "http://127.0.0.1:4190";
const folder = "artifacts/profile-rewards-review";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const evidence = [];
try {
  for (const mobile of [false, true])
    for (const theme of ["light", "dark"]) {
      const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
      const context = await browser.newContext({ viewport, colorScheme: theme });
      const page = await context.newPage();
      await page.route("https://**/*", (route) => route.abort());
      await page.goto(`${origin}/${folder}/`);
      await page.getByRole("heading", { name: "Perfil e Arcano", exact: true }).waitFor();
      await page.evaluate((theme) => {
        localStorage.setItem("helenastudy.theme", theme);
      }, theme);
      await page.goto(`${origin}/perfil`);
      await page.getByRole("button", { name: "Ver todas as cartas", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Arcano", exact: true });
      await dialog.waitFor();
      await documentReady(page);
      const header = dialog.locator(":scope > header");
      const before = await header.boundingBox();
      await dialog.evaluate((node) => {
        node.scrollTop = 500;
      });
      await page.waitForTimeout(200);
      const after = await header.boundingBox();
      if (!before || !after || Math.abs(before.y - after.y) > 26)
        throw Error(`Header not sticky ${JSON.stringify({ before, after })}`);
      if (await dialog.evaluate((node) => node.scrollWidth > node.clientWidth + 1))
        throw Error("Horizontal overflow");
      await dialog.evaluate((node) => {
        node.scrollTop = 0;
      });
      await documentReady(page);
      const name = `${mobile ? "mobile" : "desktop"}-${theme}`;
      await page.screenshot({ path: `${folder}/${name}.png` });
      evidence.push({
        name,
        theme,
        viewport,
        url: page.url(),
        stickyHeader: true,
        horizontalOverflow: false,
      });
      for (const [title, rank] of [
        ["Seis de Paus", "common"],
        ["O Mago", "epic"],
        ["A Estrela", "legendary"],
      ]) {
        const buttons = dialog.getByRole("button", {
          name: `Inspecionar carta ${title}`,
          exact: true,
        });
        await buttons.first().click();
        await page.locator(".arcana-interpretation p[lang='pt-BR']").first().waitFor();
        await documentReady(page);
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${folder}/${name}-${rank}.png` });
        evidence.push({
          name: `${name}-${rank}`,
          theme,
          viewport,
          url: page.url(),
          surface: "real app inspection",
          card: title,
        });
        if (mobile && rank === "legendary") {
          await page.locator(".arcana-interpretation").scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${folder}/${name}-panel.png` });
          evidence.push({
            name: `${name}-panel`,
            theme,
            viewport,
            url: page.url(),
            surface: "real app interpretation panel, scrolled",
          });
        }
        await page.getByRole("button", { name: "Voltar à coleção", exact: true }).click();
        await dialog.evaluate((node) => {
          node.scrollTop = 0;
        });
      }
      await context.close();
    }
} finally {
  await browser.close();
}
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const diff = execFileSync("git", ["diff", "--", "src"], { encoding: "utf8" });
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "--", "src"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .sort();
const sourceHash = createHash("sha256");
for (const file of files) sourceHash.update(file).update(await readFile(file));
await writeFile(
  `${folder}/manifest.json`,
  JSON.stringify(
    {
      sha,
      workingTree: true,
      sourceSha256: sourceHash.digest("hex"),
      diffSha256: createHash("sha256").update(diff).digest("hex"),
      capturedAt: new Date().toISOString(),
      source:
        "Real app, Edge headless. Local fixture. External network blocked. No authentication, real delivery, production sync or creative approval verified.",
      evidence,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ sha, captures: evidence.length, evidence }));
async function documentReady(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll("dialog[open] img")]
        .filter((img) => img.getBoundingClientRect().top < innerHeight)
        .map((img) => img.decode().catch(() => {})),
    );
  });
}
