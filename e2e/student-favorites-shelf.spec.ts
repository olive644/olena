import { expect, test } from "@playwright/test";
import { createInitialWorkspace, type StudyNotebook } from "../src/domain/workspace";

test("Note favorita abre somente leitura no Espaço e edição apenas nos Cadernos", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "desktop", "Prateleira exclusiva mobile.");
  const workspace = createInitialWorkspace();
  workspace.notebooks = [
    {
      id: "note",
      title: "Ideias favoritas",
      kind: "note",
      homeFavorite: true,
      subjectId: "",
      createdAt: "2026-10-18",
      pageIds: ["text"],
    },
  ];
  workspace.notes = [
    {
      id: "text",
      title: "Ideias favoritas",
      subjectId: "",
      updatedAt: "2026-10-18",
      assets: [],
      content: "Meu conteúdo preservado",
    },
  ];
  await page.addInitScript((state) => {
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    localStorage.setItem("helena.guest.v1", "1");
    localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
  }, workspace);
  await page.goto("/");
  await page.getByRole("button", { name: "Ver Ideias favoritas", exact: true }).click();
  const preview = page.locator(".student-favorite-preview");
  await expect(preview).toContainText("Meu conteúdo preservado");
  await expect(preview.locator("textarea, input, [contenteditable=true]")).toHaveCount(0);
  await preview.getByRole("button", { name: "Abrir", exact: true }).click();
  await expect(page).toHaveURL(/\/cadernos\?caderno=note/);
  await expect(page.locator(".text-note-workspace textarea")).toHaveValue(
    "Meu conteúdo preservado",
  );
});

for (const width of [320, 390, 430]) {
  test(`prateleira móvel de favoritos funciona em ${width}px, sem edição nem sobreposição`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    test.skip(
      testInfo.project.name === "desktop",
      "Fluxo exclusivo mobile, desktop preservado no teste de retomada.",
    );
    await page.setViewportSize({ width, height: 780 });
    const workspace = createInitialWorkspace();
    const book = (id: string, title: string, kind?: StudyNotebook["kind"]): StudyNotebook => ({
      id,
      title,
      subjectId: "",
      createdAt: "2026-10-18",
      pageIds: [],
      ...(kind ? { kind } : {}),
    });
    workspace.notebooks = [
      { ...book("a", "Caderno A"), pageIds: ["one", "two", "three"] },
      { ...book("b", "Caderno B"), parentId: "folder" },
      { ...book("note", "Meu Note", "note"), pageIds: ["text"] },
      book("folder", "Pasta A", "collection"),
      book("folder2", "Pasta B", "collection"),
      book("extra", "Caderno extra"),
    ];
    workspace.notes = ["one", "two", "three", "text"].map((id) => ({
      id,
      title: id,
      subjectId: "",
      updatedAt: "2026-10-18",
      assets: [],
      content: "Anotação de teste",
    }));
    await page.addInitScript((state) => {
      localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
      localStorage.setItem("helena.guest.v1", "1");
      if (!localStorage.getItem("helenastudy.workspace.v1"))
        localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(state));
    }, workspace);
    await page.goto("/");
    const shelf = page.getByRole("region", { name: "Sua prateleira", exact: true });
    await expect(shelf).toBeVisible();
    await expect(page.locator(".student-destination--notes")).toHaveCount(0);
    await expect(page.locator(".student-destination")).toHaveCount(2);
    const hero = (await page.locator(".math-hero-carousel").boundingBox())!;
    const shelfBox = (await shelf.boundingBox())!;
    const pair = (await page.locator(".student-space-shortcuts").boundingBox())!;
    expect(shelfBox.y).toBeGreaterThan(hero.y + hero.height - 1);
    expect(pair.y).toBeGreaterThan(shelfBox.y + shelfBox.height - 1);
    await shelf.getByRole("button", { name: "Escolher favoritos" }).click();
    const picker = page.getByRole("dialog", { name: "Escolher favoritos" });
    await expect(picker).toBeVisible();
    const choose = (title: string) =>
      picker.getByRole("button", { name: `Favorito: ${title}`, exact: true });
    await choose("Pasta A").click();
    await expect(choose("Pasta B")).toBeDisabled();
    await choose("Caderno A").click();
    await choose("Meu Note").click();
    await expect(choose("Caderno extra")).toBeDisabled();
    await expect(picker.getByRole("status")).toHaveText("3 de 3 favoritos");
    await choose("Meu Note").click();
    await choose("Caderno B").click();
    await picker.getByRole("button", { name: "Concluir", exact: true }).click();
    await expect(picker).toHaveCount(0);
    await expect(shelf.getByRole("button", { name: "Escolher favoritos" })).toBeFocused();
    await expect(shelf.locator(".student-favorites-books > button")).toHaveCount(3);
    await page.reload();
    await expect(shelf.locator(".student-favorites-books > button")).toHaveCount(3);
    await shelf.getByRole("button", { name: "Ver Caderno A", exact: true }).click();
    const preview = shelf.locator(".student-favorite-preview");
    await expect(preview.locator(".notebook-paper-spread")).toBeVisible();
    const spread = (await preview.locator(".notebook-spread-shell").boundingBox())!;
    expect(spread.width).toBeGreaterThan(width * 0.5);
    expect(spread.width / spread.height).toBeCloseTo(1.4, 1);
    await preview.getByRole("button", { name: /Capa/ }).click();
    await expect(preview.locator(".book-cover")).toBeVisible();
    await expect(preview.locator(".notebook-cover-inventory")).toHaveCount(0);
    await preview.getByRole("button", { name: /^Próxima/ }).click();
    await preview.getByRole("button", { name: /^Próxima/ }).click();
    await expect(preview.locator(".notebook-sheet-create")).toHaveCount(0);
    await expect(preview.getByRole("button", { name: /folha 3/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath("prateleira-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });
    await preview.getByRole("button", { name: /folha 3/i }).click();
    await expect(page).toHaveURL(/\/cadernos\?caderno=a&folha=three/);
    await page.goto("/");
    await shelf.getByRole("button", { name: "Ver Pasta A", exact: true }).click();
    await expect(page).toHaveURL(/\/cadernos\?pasta=folder/);
    await expect(page.locator(".paper-folder.is-open")).toBeVisible();
    await page.goto("/");
    await shelf.getByRole("button", { name: "Escolher favoritos" }).click();
    await picker.press("Escape");
    await expect(shelf.getByRole("button", { name: "Escolher favoritos" })).toBeFocused();
  });
}
