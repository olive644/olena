import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const [device, width, height] of [
    ["desktop", 1280, 720],
    ["mobile", 320, 568],
  ]) {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(
        `http://127.0.0.1:4174/artifacts/english-achievements-review/feed.html?theme=${theme}`,
      );
      await page
        .getByText("Avançou em Inglês: 20 respostas praticadas.", { exact: true })
        .waitFor();
      await page
        .getByText("Concluiu Arquivo das Entrelinhas na ilha de Inglês.", { exact: true })
        .waitFor();
      await page.getByText("Desbloqueou uma nova conquista.", { exact: true }).waitFor();
      await page.locator(".social-reward svg").waitFor();
      await page.waitForLoadState("networkidle");
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        throw Error("Horizontal overflow");
      await page
        .getByRole("button", { name: /Perfil de teste/ })
        .first()
        .focus();
      await page.screenshot({
        path: fileURLToPath(new URL(`${device}-english-feed-${theme}.png`, import.meta.url)),
        fullPage: true,
        animations: "disabled",
      });
      await page.close();
      console.log(`${device} ${theme}: English practice, confirmation and achievement rendered`);
    }
  }
} finally {
  await browser.close();
}
