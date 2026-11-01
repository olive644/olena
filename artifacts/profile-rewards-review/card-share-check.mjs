import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const evidence = [];
try {
  for (const mobile of [false, true])
    for (const theme of ["light", "dark"]) {
      const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
      const page = await browser.newPage({ viewport, colorScheme: theme, acceptDownloads: true });
      await page.route("https://**/*", (route) => route.abort());
      await page.addInitScript((theme) => localStorage.setItem("helenastudy.theme", theme), theme);
      await page.goto("http://127.0.0.1:4190/artifacts/profile-rewards-review/");
      await page.getByRole("button", { name: "Galeria", exact: true }).click();
      await page.getByRole("button", { name: "Inspecionar carta A Estrela", exact: true }).click();
      const source = page.getByRole("dialog", { name: "A Estrela", exact: true });
      const share = source.getByRole("button", { name: "Compartilhar carta", exact: true });
      const [b, a] = await source.locator(".profile-cards__tools button").evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return { x: r.x, y: r.y + r.height / 2 };
        }),
      );
      if (a.x <= b.x || Math.abs(a.y - b.y) > 2)
        throw Error("Share is not beside the favorite star");
      const rotation = source.getByRole("button", { name: /Inspecionar carta em 360/ });
      for (let turn = 0; turn < 8; turn++) await rotation.press("ArrowRight");
      await share.click();
      const dialog = page.getByRole("dialog", { name: "Compartilhar carta", exact: true });
      await dialog.locator(".arcana-share-preview").waitFor();
      await dialog.locator(".arcana-share-preview").evaluate((img) => img.decode());
      const name = `card-share-${mobile ? "mobile" : "desktop"}-${theme}`;
      await page.screenshot({ path: `artifacts/profile-rewards-review/${name}-preview.png` });
      const event = page.waitForEvent("download");
      await dialog.getByRole("link", { name: "Salvar imagem", exact: true }).click();
      const download = await event;
      await download.saveAs(`artifacts/profile-rewards-review/${name}.png`);
      const bytes = await readFile(`artifacts/profile-rewards-review/${name}.png`);
      if (bytes.readUInt32BE(16) !== 1080 || bytes.readUInt32BE(20) !== 1350)
        throw Error("Invalid card PNG");
      await dialog.getByRole("button", { name: "Voltar à carta", exact: true }).click();
      if (!(await share.evaluate((node) => node === document.activeElement)))
        throw Error("Share focus not restored");
      evidence.push({
        name,
        theme,
        viewport,
        card: "major-17",
        width: 1080,
        height: 1350,
        bytes: bytes.length,
        adjacentToStar: true,
        focusRestored: true,
        exportedFrontFromRotatedInspection: true,
        source: "Real local PNG export with fixture collection, no delivery or real reward",
      });
      await page.close();
    }
} finally {
  await browser.close();
}
const paths = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "--", "src"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .sort();
const hash = createHash("sha256");
for (const path of paths) hash.update(path).update(await readFile(path));
const report = {
  sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  workingTree: true,
  sourceSha256: hash.digest("hex"),
  capturedAt: new Date().toISOString(),
  evidence,
};
await writeFile(
  "artifacts/profile-rewards-review/card-share-check.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(evidence));
