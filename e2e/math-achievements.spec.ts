import { expect, test } from "@playwright/test";
import { upgradeMasteryProgress } from "../src/domain/math-mastery-progress";
import { createInitialWorkspace } from "../src/domain/workspace";
import { GENERAL_ACHIEVEMENTS } from "../src/domain/general-achievement-catalog";

test("brilho de material, máscara própria e redução de movimento", async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({
        name: "Oliver",
        achievementHistory: Object.fromEntries(
          ["bronze", "silver", "gold", "emerald"].map((tier) => [`general-pomodoro-${tier}`, ""]),
        ),
      }),
    );
  });
  await page.goto("/perfil");
  await page
    .getByRole("region", { name: "Conquistas", exact: true })
    .getByRole("button", { name: "Ver todas as conquistas" })
    .click();
  const gallery = page.getByRole("dialog", { name: "Todas as conquistas", exact: true });
  await gallery.getByRole("tab", { name: "Gerais", exact: true }).click();
  await gallery.getByRole("button", { name: /Horta do foco · Esmeralda\./ }).click();
  const inspection = page.locator(".achievement-inspection");
  const colors = new Set<string>();
  for (const [tier, label] of [
    ["bronze", "Bronze"],
    ["silver", "Prata"],
    ["gold", "Ouro"],
    ["emerald", "Esmeralda"],
  ] as const) {
    await inspection.getByRole("button", { name: `Ver etapa ${label}`, exact: true }).click();
    const art = inspection.locator(".achievement-static-art .math-achievement-art");
    await expect(art).toHaveAttribute("data-tier", tier!);
    await expect(art.locator("image")).toHaveAttribute(
      "href",
      `/achievement-badges/general/general-pomodoro-${tier}.webp`,
    );
    await expect(art.locator(".achievement-foil")).toHaveCSS(
      "mask-image",
      new RegExp(`general-pomodoro-${tier}\\.webp`),
    );
    colors.add(
      await art.evaluate((node) => getComputedStyle(node).getPropertyValue("--tier-sheen").trim()),
    );
    const glow = {
      bronze: "193, 138, 83",
      silver: "185, 214, 237",
      gold: "250, 204, 21",
      emerald: "50, 188, 146",
    }[tier!];
    expect(await art.evaluate((node) => getComputedStyle(node).filter)).toContain(glow);
    await inspection.screenshot({
      path: info.outputPath(`horta-${tier}.png`),
      animations: "disabled",
    });
  }
  expect(colors.size).toBe(4);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const foil = inspection.locator(".achievement-static-art .achievement-foil");
  await expect(foil).toHaveCSS("animation-name", "none");
  expect(await foil.evaluate((node) => getComputedStyle(node, "::after").animationName)).toBe(
    "none",
  );
});

test("todas as 56 artes gerais são próprias e carregam na galeria", async ({ page }, info) => {
  const ids = GENERAL_ACHIEVEMENTS.map((item) => item.id);
  await page.addInitScript((ids) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({
        name: "Oliver",
        achievementHistory: Object.fromEntries(ids.map((id) => [id, ""])),
      }),
    );
  }, ids);
  await page.goto("/perfil");
  const sizes = await page.evaluate(
    async (ids) =>
      Promise.all(
        ids.map(async (id) => {
          const image = new Image();
          image.src = `/achievement-badges/general/${id}.webp`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 512;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0);
          return [image.naturalWidth, image.naturalHeight, ctx.getImageData(0, 0, 1, 1).data[3]];
        }),
      ),
    ids,
  );
  expect(sizes).toHaveLength(56);
  expect(
    sizes.every(([width, height, alpha]) => width === 512 && height === 512 && alpha === 0),
  ).toBe(true);
  await page
    .getByRole("region", { name: "Conquistas", exact: true })
    .getByRole("button", { name: "Ver todas as conquistas" })
    .click();
  const gallery = page.getByRole("dialog", { name: "Todas as conquistas", exact: true });
  const filledSlots = gallery.locator(".achievement-feature-slot.is-filled");
  await expect(filledSlots).toHaveCount(3);
  const tabBox = await gallery.getByRole("tab", { name: "Gerais", exact: true }).boundingBox();
  for (const slot of await filledSlots.all()) {
    const box = await slot.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(tabBox!.y);
  }
  await gallery.getByRole("tab", { name: "Gerais", exact: true }).click();
  await expect(gallery.locator(".achievement-tile")).toHaveCount(20);
  await expect(gallery.locator(".is-locked")).toHaveCount(0);
  await gallery.screenshot({
    path: info.outputPath("galeria-geral-artes-originais.png"),
    animations: "disabled",
  });
});

test("conquistas gerais, destaques persistentes e PNG temático", async ({ page }, info) => {
  const seed = createInitialWorkspace();
  seed.focusSessions = Array.from({ length: 10 }, (_, index) => ({
    id: `focus-${index}`,
    subjectId: "math",
    durationMinutes: 25,
    mode: "pomodoro" as const,
    completedAt: `2026-10-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
  }));
  await page.addInitScript((workspace) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(workspace));
    if (!localStorage.getItem("helena.profile.v1"))
      localStorage.setItem(
        "helena.profile.v1",
        JSON.stringify({ name: "Oliver", username: "oliver", achievementFavorites: [] }),
      );
  }, seed);
  await page.goto("/perfil");
  const profile = page.getByRole("region", { name: "Conquistas", exact: true });
  await profile.getByRole("button", { name: "Ver todas as conquistas" }).click();
  const gallery = page.getByRole("dialog", { name: "Todas as conquistas", exact: true });
  await gallery.getByRole("tab", { name: "Gerais", exact: true }).click();
  await expect(gallery.locator(".achievement-tile")).toHaveCount(20);
  await gallery.screenshot({
    path: info.outputPath("conquistas-gerais.png"),
    animations: "disabled",
  });
  await gallery.getByRole("button", { name: /Horta do foco · Prata\./ }).click();
  const inspection = page.getByRole("dialog", { name: "Horta do foco · Prata", exact: true });
  await expect(inspection.locator("time .paper-digits").first()).toBeVisible();
  await expect(inspection.locator(".achievement-rarity")).toHaveText("Incomum");
  await inspection.getByRole("button", { name: "Destacar no perfil", exact: true }).click();
  await expect(inspection.getByRole("button", { name: "Remover dos destaques" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await inspection.screenshot({
    path: info.outputPath("conquista-geral-inspecao.png"),
    animations: "disabled",
  });
  await inspection.getByRole("button", { name: "Compartilhar conquista" }).click();
  const card = inspection.getByRole("img", { name: "Card da conquista para compartilhar" });
  await expect(card).toBeVisible();
  for (const name of ["Compartilhar", "Voltar à conquista"])
    await expect(inspection.getByRole("button", { name, exact: true })).toHaveText("");
  await expect(inspection.getByRole("link", { name: "Salvar imagem" })).toHaveText("");
  await inspection.screenshot({ path: info.outputPath("conquista-geral-compartilhar.png") });
  const download = page.waitForEvent("download");
  await inspection.getByRole("link", { name: "Salvar imagem" }).click();
  await (await download).saveAs(info.outputPath("card-foco.png"));
  await page.reload();
  await expect(profile.locator(".achievement-tile")).toHaveCount(1);
  await expect(profile.getByRole("button", { name: /Horta do foco · Prata\./ })).toBeVisible();
});

for (const theme of ["light", "dark"]) {
  test(`conquistas de papel têm inspeção estática e aviso real: ${theme}`, async ({
    page,
  }, info) => {
    await page.addInitScript((theme) => {
      localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
      localStorage.setItem("helena.guest.v1", "1");
      localStorage.setItem("helenastudy.theme", theme);
    }, theme);
    await page.goto("/perfil");
    const collection = page.getByRole("region", { name: "Conquistas", exact: true });
    await expect(collection).toBeVisible();
    await expect(collection.locator(".achievement-empty")).toHaveCount(3);
    await collection.getByRole("button", { name: "Ver todas as conquistas" }).click();
    const gallery = page.getByRole("dialog", { name: "Todas as conquistas", exact: true });
    await expect(gallery.locator(".achievement-tile")).toHaveCount(17);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await gallery.getByRole("button", { name: /Cartógrafo do infinito 1\./ }).click();
    await page.getByRole("button", { name: "Ver etapa 6", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Cartógrafo do infinito 6", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Girar conquista/ })).toHaveCount(0);
    await expect(dialog.locator(".achievement-static-art")).toBeVisible();
    await expect(dialog.locator(".math-achievement-art").first()).toHaveClass(/is-locked/);
    await dialog.screenshot({
      path: info.outputPath(`conquista-3d-${theme}.png`),
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.evaluate(
      (progress) => {
        localStorage.setItem("helena.mathGame.v5", JSON.stringify({ foundations: progress }));
        window.dispatchEvent(new Event("helena:synced-storage-change"));
      },
      { ...upgradeMasteryProgress(), correct: 1 },
    );
    const notice = page.getByRole("complementary", { name: "Nova conquista" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("Parabéns! Conquista desbloqueada");
    await notice.screenshot({ path: info.outputPath(`conquista-aviso-${theme}.png`) });
    await notice.getByRole("button", { name: "Inspecionar" }).click();
    await expect(
      page.getByRole("dialog", { name: "Constelação de acertos 1", exact: true }),
    ).toBeVisible();
  });
}

test("galeria compacta, data real, Oliver shiny e card compartilhável", async ({ page }, info) => {
  const workspace = createInitialWorkspace();
  workspace.practiceActivities = [0, 1, 2, 3, 4, 5].map((level) => ({
    id: `math:foundations:round${level}:1:1`,
    islandId: "mathematics:foundations",
    islandName: "Matemática",
    answers: 500,
    correct: 500,
    moduleLevel: level,
    completedAt: `2026-10-${10 + level}T12:00:00Z`,
  }));
  await page.addInitScript((seed) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(seed));
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ name: "Oliver", username: "oliver" }),
    );
  }, workspace);
  await page.goto("/perfil");
  const preview = page.getByRole("region", { name: "Conquistas", exact: true });
  await expect(preview.locator(".achievement-tile")).toHaveCount(3);
  await expect(preview).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await preview.screenshot({ path: info.outputPath("conquistas-perfil.png") });
  await preview.getByRole("button", { name: "Ver todas as conquistas" }).click();
  const gallery = page.getByRole("dialog", { name: "Todas as conquistas", exact: true });
  if (info.project.name === "mobile")
    await expect(gallery.locator(".math-achievement-grid")).toHaveCSS(
      "grid-template-columns",
      /\S+ \S+ \S+$/,
    );
  await gallery.screenshot({ path: info.outputPath("conquistas-galeria.png") });
  await gallery.getByRole("button", { name: /Constelação de acertos 2500\./ }).click();
  const inspection = page.getByRole("dialog", { name: "Constelação de acertos 2500", exact: true });
  await expect(inspection.locator("time")).toHaveAttribute("datetime", "2026-10-14T12:00:00Z");
  await expect(inspection.locator(".achievement-foil").first()).toBeVisible();
  await expect(
    inspection.locator('image[href="/achievement-badges/math/correct-2500.webp"]').first(),
  ).toBeVisible();
  await expect(inspection.locator(".math-achievement-art > svg").first()).toHaveAttribute(
    "viewBox",
    "0 0 160 160",
  );
  await expect(inspection.locator(".achievement-paper-number use").first()).toHaveAttribute(
    "href",
    "/paper-digits.svg#digit-2",
  );
  await inspection.screenshot({
    path: info.outputPath("conquista-oliver-shiny.png"),
    animations: "disabled",
  });
  await inspection.getByRole("button", { name: "Compartilhar conquista" }).click();
  const card = inspection.getByRole("img", { name: "Card da conquista para compartilhar" });
  await expect(inspection.getByRole("button", { name: "Compartilhar", exact: true })).toHaveCSS(
    "background-color",
    "rgb(116, 51, 224)",
  );
  await expect(card).toBeVisible();
  await expect
    .poll(() => card.evaluate((node) => (node as HTMLImageElement).naturalWidth))
    .toBe(1080);
  const pixels = await card.evaluate((node) => {
    const image = node as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(270, 190, 540, 540);
    let cobalt = 0,
      turquoise = 0,
      number = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!,
        g = data[i + 1]!,
        b = data[i + 2]!;
      if (b > 130 && r < 80 && g < 150) cobalt++;
      if (g > 150 && b > 150 && r < 140) turquoise++;
      const y = Math.floor(i / 4 / 540);
      if (y > 390 && y < 460 && r < 100 && g < 100 && b < 110) number++;
    }
    return { cobalt, turquoise, number };
  });
  expect(pixels.cobalt).toBeGreaterThan(1000);
  expect(pixels.turquoise).toBeGreaterThan(1000);
  expect(pixels.number).toBeGreaterThan(100);
  await inspection.screenshot({ path: info.outputPath("conquista-compartilhar.png") });
  const download = page.waitForEvent("download");
  await inspection.getByRole("link", { name: "Salvar imagem" }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toBe("olena-conquista-correct-2500.png");
  await saved.saveAs(info.outputPath("card-olena-conquista.png"));
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false }),
  );
  await inspection.getByRole("button", { name: "Compartilhar", exact: true }).click();
  await expect(inspection.getByRole("alert")).toContainText("Salve o card para enviar");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        document.documentElement.dataset["sharedAchievement"] = data.files?.[0]?.name ?? "";
      },
    });
  });
  await inspection.getByRole("button", { name: "Compartilhar", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-shared-achievement",
    "olena-conquista-correct-2500.png",
  );
  await expect(inspection.getByRole("alert")).toHaveCount(0);
});
