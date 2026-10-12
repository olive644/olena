import { expect, test } from "@playwright/test";

test("onboarding Helena chat fits, sends locally and minimizes on desktop and mobile", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/preview-helena-chat.html?open");
  const dialog = page.getByRole("dialog", { name: "Helena" });
  await expect(dialog).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page
      .locator("img")
      .evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
  ).toBe(true);
  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const suggestions = page.locator(".helena-chat-suggestions button");
  await expect(suggestions).toHaveCount(3);
  for (const button of await suggestions.all()) {
    await expect(button).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(button.locator(".helena-chat-suggestion-icon--light")).toBeVisible();
    await expect(button.locator("img").first()).toHaveCSS("filter", "none");
  }
  await page.screenshot({
    path: testInfo.outputPath(`helena-chat-${testInfo.project.name}.png`),
  });
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "dark";
  });
  await expect(page.locator(".helena-chat-suggestions button").first()).toHaveCSS(
    "background-color",
    "rgb(116, 51, 224)",
  );
  for (const button of await suggestions.all()) {
    await expect(button).toHaveCSS("background-color", "rgb(116, 51, 224)");
    await expect(button.locator(".helena-chat-suggestion-icon--dark")).toBeVisible();
    await expect(button.locator(".helena-chat-suggestion-icon--dark")).toHaveCSS("filter", "none");
  }
  await page.screenshot({
    path: testInfo.outputPath(`helena-chat-${testInfo.project.name}-dark.png`),
  });
  await page.evaluate(() => {
    document.documentElement.dataset["theme"] = "light";
  });
  await page.getByRole("button", { name: "Organizar meus estudos" }).click();
  await expect(page.getByText(/Qual matéria você quer estudar/)).toBeVisible();
  await page.getByRole("textbox").fill("Preciso de ajuda com matemática");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(page.getByText(/Pode me mostrar a conta/)).toBeVisible();
  await page.getByRole("button", { name: "Recolher conversa", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath(`helena-chat-${testInfo.project.name}-closed.png`),
  });
  await page.getByRole("button", { name: "Conversar com Helena" }).click();
  await expect(page.getByText("Preciso de ajuda com matemática")).toBeVisible();
  await page.getByRole("textbox").press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("star animates while dragged, docks without opening and keeps the chat inside the screen", async ({
  page,
}) => {
  await page.goto("/preview-helena-chat.html");
  const star = page.getByRole("button", { name: "Conversar com Helena" });
  const shell = page.locator(".helena-chat");
  const bounds = (await star.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(45, 170, { steps: 12 });
  await expect(shell).toHaveAttribute("data-motion", "dragging");
  await expect(page.locator(".helena-virtual-mascot")).toHaveAttribute("data-ready", "true");
  const graphic = page.frameLocator(".helena-virtual-mascot iframe");
  await expect(graphic.locator("#stage")).toHaveAttribute("data-behavior", "dragging");
  await page.mouse.up();
  await expect(shell).toHaveAttribute("data-edge", "left");
  await expect(shell).toHaveAttribute("data-motion", "idle");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await star.boundingBox())!.x).toBeCloseTo(16);
  await star.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const panel = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.y).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width);
  expect(panel.y + panel.height).toBeLessThanOrEqual(viewport.height);
  await page.evaluate(() => {
    const shell = document.querySelector(".helena-chat");
    if (!(shell instanceof HTMLElement)) throw new Error("Assistente ausente");
    const observer = new MutationObserver(() => {
      if (shell.dataset["motion"] === "closing") {
        shell.dataset["closingObserved"] = "true";
        observer.disconnect();
      }
    });
    observer.observe(shell, { attributes: true, attributeFilter: ["data-motion"] });
  });
  await page.getByRole("button", { name: "Recolher conversa", exact: true }).click();
  await expect(shell).toHaveAttribute("data-closing-observed", "true");
  await expect(dialog).toHaveCount(0);
  await expect(star).toBeVisible();
});
