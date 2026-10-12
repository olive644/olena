import { expect, test } from "@playwright/test";

test("paper cursors use native assets only for mouse and preserve editing/tool states", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Agenda", exact: true })).toBeVisible();
  const mouse = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
  expect(mouse).toBe(info.project.name === "desktop");
  await page.evaluate(() => {
    const fixture = document.createElement("div");
    fixture.id = "cursor-fixture";
    fixture.innerHTML =
      '<button>Cursor action</button><button disabled>Disabled action</button><input aria-label="Cursor text"><textarea aria-label="Cursor note"></textarea><div contenteditable="true" aria-label="Cursor editor"></div><canvas style="cursor: crosshair"></canvas><div style="cursor: grab">Drag</div>';
    document.body.append(fixture);
  });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const bodyCursor = await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).cursor);
    const action = page.locator("#cursor-fixture button").first();
    if (mouse) {
      expect(bodyCursor).toContain("/cursors/paper-arrow.svg");
      await expect(action).toHaveCSS("cursor", /paper-hand\.svg/);
      await expect(page.locator("#cursor-fixture button:disabled")).toHaveCSS(
        "cursor",
        "not-allowed",
      );
    } else {
      expect(bodyCursor).not.toContain("/cursors/");
      expect(await action.evaluate((element) => getComputedStyle(element).cursor)).not.toContain(
        "/cursors/",
      );
    }
    if (mouse)
      for (const selector of ["input", "textarea", "[contenteditable]"])
        await expect(page.locator(`#cursor-fixture ${selector}`)).toHaveCSS("cursor", "text");
    await expect(page.locator("#cursor-fixture canvas")).toHaveCSS("cursor", "crosshair");
    await expect(page.locator("#cursor-fixture div[style]")).toHaveCSS("cursor", "grab");
  }
  for (const name of ["arrow", "hand"]) {
    const response = await page.request.get(`/cursors/paper-${name}.svg`);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain('width="32" height="32"');
  }
  await page.evaluate(() => {
    const preview = document.createElement("div");
    preview.id = "cursor-art-preview";
    preview.style.cssText =
      "position:relative;z-index:2147483647;display:flex;width:256px;padding:24px;gap:32px;background:#fff9ef";
    preview.innerHTML =
      '<img src="/cursors/paper-arrow.svg" width="96" height="96" alt="Seta de papel"><img src="/cursors/paper-hand.svg" width="96" height="96" alt="Mão de papel">';
    document.body.append(preview);
  });
  await expect
    .poll(() =>
      page
        .locator("#cursor-art-preview img")
        .evaluateAll((elements) =>
          elements.every(
            (element) =>
              element instanceof HTMLImageElement &&
              element.complete &&
              element.naturalWidth === 32,
          ),
        ),
    )
    .toBe(true);
  for (const theme of ["light", "dark"]) {
    await page
      .locator("#cursor-art-preview")
      .evaluate(
        (element, value) => (element.style.background = value === "light" ? "#fff9ef" : "#292432"),
        theme,
      );
    await page
      .locator("#cursor-art-preview")
      .screenshot({ path: info.outputPath(`cursor-art-${theme}.png`) });
  }
  if (mouse) {
    await page.emulateMedia({ forcedColors: "active" });
    expect(
      await page.locator("body").evaluate((element) => getComputedStyle(element).cursor),
    ).not.toContain("/cursors/");
  }
});
