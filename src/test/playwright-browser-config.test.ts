import { expect, it } from "vitest";
import application from "../../playwright.config";
import preview from "../../playwright.helena.config";

it("mantém os dois projetos Playwright em Chromium, inclusive no preview isolado", () => {
  for (const config of [application, preview]) {
    expect(config.projects?.map((project) => project.name)).toEqual(["desktop", "mobile"]);
    for (const project of config.projects ?? []) expect(project.use?.browserName).toBe("chromium");
    const mobile = config.projects?.find((project) => project.name === "mobile");
    expect(mobile?.use).toMatchObject({
      isMobile: true,
      hasTouch: true,
      viewport: { width: 390, height: 664 },
    });
  }
});
