import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.route("https://**/*", (route) => route.abort());
    await page.goto("http://127.0.0.1:4190/artifacts/profile-rewards-review/");
    await page.getByRole("heading", { name: "Perfil e Arcano", exact: true }).waitFor();
    await page.getByRole("button", { name: "Galeria", exact: true }).click();
    await page.getByRole("button", { name: "Ver todas as cartas", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Arcano", exact: true });
    const read = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("helena.profile.v1")).cardFavorites);
    const initial = await read();
    const source = dialog.locator('[data-arcana-slot="0"] .profile-cards__tile');
    const dest = dialog.locator('[data-arcana-slot="1"]');
    await move(source, dest, page);
    const reordered = await read();
    if (reordered[1] !== initial[0]) throw Error("Reorder failed");
    const removeSource = dialog.locator('[data-arcana-slot="1"] .profile-cards__tile');
    const box = await removeSource.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2 + 15, { steps: 3 });
    const remove = dialog.locator("[data-arcana-remove]");
    await remove.waitFor();
    const target = await remove.boundingBox();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
    await page.mouse.up();
    if ((await read()).includes(initial[0])) throw Error("Remove failed");
    const beforeCancel = await read();
    const tile = dialog.locator('[data-arcana-slot="0"] .profile-cards__tile');
    const b = await tile.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(1, 1, { steps: 10 });
    await page.mouse.up();
    if (JSON.stringify(await read()) !== JSON.stringify(beforeCancel))
      throw Error("Outside drop should cancel");
    results.push({ viewport, reorder: true, explicitDragRemoval: true, outsideDropCanceled: true });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "artifacts/profile-rewards-review/interactions.json",
  JSON.stringify(
    {
      note: "Browser pointer tests, including narrow viewport. Physical touch not tested.",
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(results));
async function move(source, target, page) {
  const from = await source.boundingBox(),
    to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}
