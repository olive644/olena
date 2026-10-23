import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

test("barra comporta cinco redes e dados longos sem cobrir a engrenagem", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({
        username: "nome_de_usuario_com_30_letras__",
        pronouns: "Pronomes personalizados bem compridos",
        bio: "Uma bio comprida para verificar espaço e leitura. ".repeat(5),
        socialLinks: ["instagram", "facebook", "linkedin", "github", "tiktok"].map(
          (name) => `https://${name}.com/oli`,
        ),
      }),
    );
  });
  await page.goto("/perfil");
  await expect(page.locator("main")).toHaveCSS("opacity", "1");
  for (const width of [320, 600, 820, 1050, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const chrome = page.locator(".profile-chrome");
    await expect
      .poll(async () => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return chrome.getAttribute("data-compact");
      })
      .toBe("true");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const portrait = document
            .querySelector(".profile-cover__portrait")!
            .getBoundingClientRect();
          const bio = document.querySelector(".profile-cover__bio")!.getBoundingClientRect();
          return bio.y >= portrait.bottom || bio.x >= portrait.right;
        }),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate((viewportWidth) => {
          const bounds = document.querySelector(".profile-chrome")!.getBoundingClientRect();
          const settings = document
            .querySelector(".profile-settings-toggle")!
            .getBoundingClientRect();
          return Array.from(document.querySelectorAll(".profile-cover__networks a")).every(
            (link) => {
              const rect = link.getBoundingClientRect();
              return (
                rect.x >= bounds.x &&
                rect.right <= bounds.right &&
                rect.bottom <= bounds.bottom &&
                (viewportWidth <= 600 || rect.y >= settings.bottom || rect.right <= settings.x)
              );
            },
          );
        }, width),
      )
      .toBe(true);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
});

for (const theme of ["light", "dark"]) {
  test(`capa do Perfil se recolhe e preserva identidade e controles: ${theme}`, async ({
    page,
  }, info) => {
    const workspace = createInitialWorkspace();
    workspace.focusSessions = Array.from({ length: 5 }, (_, index) => ({
      id: `session-${index}`,
      subjectId: workspace.subjects[0]!.id,
      durationMinutes: 25,
      completedAt: `2026-10-${15 - index}T12:00:00Z`,
    }));
    workspace.practiceActivities = [
      {
        id: "practice",
        islandId: "math",
        islandName: "Matemática",
        answers: 10,
        correct: 8,
        completedAt: "2026-10-16T12:00:00Z",
      },
    ];
    workspace.quizAttempts = [
      {
        id: "quiz",
        subjectId: workspace.subjects[0]!.id,
        correct: 3,
        total: 4,
        completedAt: "2026-10-16T11:00:00Z",
      },
    ];
    await page.addInitScript(
      ({ seed, appearance }) => {
        localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
        localStorage.setItem("helena.guest.v1", "1");
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(seed));
        localStorage.setItem(
          "helena.profile.v1",
          JSON.stringify({
            name: "Andreyna de Oliveira",
            photoUrl: "/profile-avatars/andreyna.webp",
            username: "andreyna",
            pronouns: "Ela/dela",
            bio: "Uma descoberta de cada vez.",
            socialLinks: ["https://github.com/olena", "https://instagram.com/olena"],
          }),
        );
        localStorage.setItem("helenastudy.theme", appearance);
      },
      { seed: workspace, appearance: theme },
    );
    await page.goto("/perfil");
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const chrome = page.locator(".profile-chrome");
    const avatar = page.getByRole("img", { name: "Sua foto de perfil" });
    await expect(avatar).toHaveAttribute("src", "/profile-avatars/andreyna.webp");
    await expect(page.locator(".profile-cover__name")).toHaveText("Guest");
    await expect(page.locator(".profile-cover__art img")).toHaveAttribute("data-cover", "helena");
    const artBox = await page.locator(".profile-cover__art").boundingBox();
    const expandedPhoto = await avatar.boundingBox();
    expect(expandedPhoto!.y).toBeLessThan(artBox!.y + artBox!.height);
    expect(expandedPhoto!.y + expandedPhoto!.height).toBeGreaterThan(artBox!.y + artBox!.height);
    await expect(page.getByLabel("Conexões do perfil")).toContainText("0 Seguidores0 Seguindo");
    const activityItems = page.locator(".profile-activity li");
    await expect(activityItems).toHaveCount(0);
    await expect(page.getByText("Sua trajetória", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "GitHub", exact: true })).toHaveText("");
    await expect(page.getByRole("region", { name: "Conquistas", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meu progresso", exact: true })).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`profile-expanded-${theme}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.evaluate(() => window.scrollTo(0, 540));
    await expect(chrome).toHaveAttribute("data-compact", "true");
    const mobileWidth = (page.viewportSize()?.width ?? 1280) <= 600;
    if (!mobileWidth) {
      await expect(page.locator(".profile-toolbar .page-header")).toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      await expect.poll(async () => (await chrome.boundingBox())?.y).toBeCloseTo(0, 0);
    } else {
      await expect(page.locator(".profile-compact-identity")).toHaveCSS("opacity", "1");
      await expect(page.locator(".profile-compact-identity")).toHaveText("GuestEla/dela");
      await expect(page.locator(".profile-compact-identity nav")).toHaveCount(0);
      await expect(page.locator(".profile-compact-identity__avatar")).toHaveAttribute(
        "src",
        "/profile-avatars/andreyna.webp",
      );
      await expect
        .poll(async () => (await page.locator(".profile-toolbar").boundingBox())?.y)
        .toBeCloseTo(0, 0);
    }
    const photoBox = await avatar.boundingBox();
    expect(photoBox!.width).toBeCloseTo(mobileWidth ? 112 : 80, 0);
    if (!mobileWidth) expect((await chrome.boundingBox())!.height).toBe(88);
    if (!mobileWidth) {
      const coverBox = await page.locator(".profile-cover").boundingBox();
      expect(photoBox!.y).toBeGreaterThanOrEqual(coverBox!.y);
      expect(photoBox!.y + photoBox!.height).toBeLessThanOrEqual(coverBox!.y + coverBox!.height);
      await expect(page.locator(".profile-cover__portrait")).toHaveCSS("overflow", "visible");
    }
    const nameBox = await page.locator(".profile-cover__name").boundingBox();
    const gearBox = await page
      .getByRole("button", { name: "Configurações", exact: true })
      .boundingBox();
    if (!mobileWidth) expect(nameBox!.x + nameBox!.width).toBeLessThan(gearBox!.x);
    const handleBox = await page.locator(".profile-cover__handle").boundingBox();
    expect(handleBox!.y).toBeGreaterThan(nameBox!.y);
    await expect(page.locator(".profile-cover__handle")).toHaveText("Ela/dela");
    await expect(page.locator(".profile-cover__bio")).toBeVisible();
    const socialBox = await page.getByRole("link", { name: "GitHub", exact: true }).boundingBox();
    const chromeBox = await chrome.boundingBox();
    expect(socialBox!.y).toBeGreaterThanOrEqual(chromeBox!.y);
    expect(socialBox!.y + socialBox!.height).toBeLessThanOrEqual(chromeBox!.y + chromeBox!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`profile-compact-${theme}.png`),
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Configurações", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Seções do Perfil" })).toBeVisible();
    await page.getByRole("button", { name: "Voltar ao perfil" }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(chrome).toHaveAttribute("data-compact", "false");
    await expect
      .poll(async () => (await avatar.boundingBox())?.width)
      .toBeCloseTo(mobileWidth ? 112 : 144, 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo(0, 540));
    await expect(chrome).toHaveCSS("--profile-collapse", "1");
    await expect(page.locator(".profile-cover__spark").first()).toHaveCSS("animation-name", "none");
  });
}

test("perfil vazio também se recolhe em tela alta e respeita movimento reduzido do app", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  const workspace = createInitialWorkspace();
  workspace.focusSessions = [];
  await page.addInitScript((seed) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(seed));
    localStorage.setItem("olena:accessibility:v1", JSON.stringify({ reduceMotion: true }));
  }, workspace);
  await page.goto("/perfil");
  await expect(page.locator("main")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("region", { name: "Conquistas", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meu progresso", exact: true })).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator(".profile-chrome")).toHaveAttribute("data-compact", "true");
  await expect(page.locator(".profile-chrome")).toHaveCSS("--profile-collapse", "1");
  await expect(page.locator(".profile-cover__spark").first()).toHaveCSS("animation-name", "none");
  for (const width of [320, 820]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator(".profile-chrome")).toHaveAttribute("data-compact", "true");
    if (width > 600)
      await expect
        .poll(async () => {
          const menu = await page.getByRole("button", { name: "Mais ferramentas" }).boundingBox();
          const avatar = await page.getByRole("img", { name: "Sua foto de perfil" }).boundingBox();
          return avatar!.x - menu!.x - menu!.width;
        })
        .toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
