import { expect, test, type Page } from "@playwright/test";
import { GENERAL_ACHIEVEMENTS } from "../src/domain/general-achievement-catalog";

async function moveBadge(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  touch: boolean,
) {
  if (touch) {
    const input = await page.context().newCDPSession(page);
    await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
    for (let step = 1; step <= 12; step++)
      await input.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: from.x + ((to.x - from.x) * step) / 12, y: from.y + ((to.y - from.y) * step) / 12 },
        ],
      });
    await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await input.detach();
  } else {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
  }
}
for (const theme of ["light", "dark"] as const) {
  test(`arraste real, categorias ilustradas e compartilhamento sem placas: ${theme}`, async ({
    page,
    browserName,
  }, info) => {
    await page.addInitScript(
      ({ theme, ids }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.theme", theme);
        localStorage.setItem(
          "helena.profile.v1",
          JSON.stringify({
            name: "Ana",
            achievementHistory: Object.fromEntries(ids.map((id) => [id, ""])),
            achievementFavorites: ["general-streak-emerald", "general-pomodoro-emerald"],
          }),
        );
      },
      { theme, ids: GENERAL_ACHIEVEMENTS.map((item) => item.id) },
    );
    await page.goto("/perfil");
    await page.getByRole("button", { name: "Ver todas as conquistas" }).click();
    const gallery = page.getByRole("dialog", { name: "Todas as conquistas", exact: true });
    await expect(gallery.getByText("Escolha até três conquistas conquistadas.")).toHaveCount(0);
    const category = gallery.getByRole("tab", { name: "Gerais", exact: true });
    await expect(category).toHaveText("");
    await expect(category.locator("img")).toHaveAttribute(
      "src",
      "/navigation-icons/paper/achievement-general.svg",
    );
    await category.click();
    const badge = gallery.locator(
      '.achievement-tile:has([data-art="general-timer-emerald"]) .math-achievement-art',
    );
    await expect(badge).toHaveCSS("touch-action", "none");
    const last = gallery.locator(".achievement-tile").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toHaveAttribute("data-revealed", "true");
    await gallery.evaluate((node) => (node.scrollTop = 0));
    await expect(badge.locator("..")).toHaveCSS("opacity", "1");
    const source = (await badge.boundingBox())!;
    const slot = gallery.locator('[data-achievement-slot="2"]');
    const target = (await slot.boundingBox())!;
    await moveBadge(
      page,
      { x: source.x + source.width / 2, y: source.y + source.height / 2 },
      { x: target.x + target.width / 2, y: target.y + target.height / 2 },
      info.project.name === "mobile" && browserName === "chromium",
    );
    await expect(slot.locator('[data-art="general-timer-emerald"]')).toBeVisible();
    await expect(gallery.locator(".achievement-drag-ghost")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("helena.profile.v1")!).achievementFavorites,
      ),
    ).toEqual(["general-streak-emerald", "general-pomodoro-emerald", "general-timer-emerald"]);
    await gallery.screenshot({
      path: info.outputPath(`galeria-arraste-${theme}.png`),
      animations: "disabled",
    });
    await badge.click();
    const inspection = page.locator(".achievement-inspection");
    for (const name of ["Remover dos destaques", "Compartilhar conquista"]) {
      await expect(inspection.getByRole("button", { name, exact: true })).toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
    }
    await expect(inspection.locator("[data-achievement-preview]")).toHaveAttribute(
      "href",
      "/achievement-badges/general/thumb/general-timer-emerald.webp",
    );
    await inspection.getByRole("button", { name: "Compartilhar conquista", exact: true }).click();
    const preview = inspection.getByRole("img", { name: "Card da conquista para compartilhar" });
    await expect
      .poll(() => preview.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBe(1080);
    for (const name of ["Compartilhar", "Voltar à conquista"]) {
      await expect(inspection.getByRole("button", { name, exact: true })).toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
    }
    await expect(inspection.getByRole("link", { name: "Salvar imagem" })).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    const back = inspection.locator("header").getByRole("button", { name: "Voltar à conquista" });
    const close = inspection.getByRole("button", { name: "Fechar conquista" });
    expect(
      await close.locator("img").evaluate((node) => getComputedStyle(node).filter),
    ).not.toContain("brightness");
    expect(Math.abs((await back.boundingBox())!.y - (await close.boundingBox())!.y)).toBeLessThan(
      10,
    );
    const colored = await preview.evaluate((node) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(node as HTMLImageElement, 0, 0);
      const { data } = ctx.getImageData(220, 1162, 90, 90);
      let count = 0;
      for (let i = 0; i < data.length; i += 4)
        if (Math.min(data[i]!, data[i + 1]!, data[i + 2]!) < 180) count++;
      return count;
    });
    expect(colored).toBeGreaterThan(100);
    await inspection.screenshot({
      path: info.outputPath(`card-geral-${theme}.png`),
      animations: "disabled",
    });
    await back.click();
    await expect(inspection.locator(".achievement-static-art")).toBeVisible();
    await close.click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(last).toHaveCSS("opacity", "1");
    expect(await gallery.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  });
}
