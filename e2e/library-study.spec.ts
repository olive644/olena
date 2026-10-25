import { expect, test } from "@playwright/test";
import { createInitialWorkspace } from "../src/domain/workspace";

test("Trecho mantém fonte no caderno e flashcard e vincula o Pomodoro sem iniciá-lo", async ({
  page,
}, info) => {
  const seed = createInitialWorkspace();
  const subjectId = seed.subjects[0]!.id;
  seed.notebooks = [
    {
      id: "study-book",
      title: "Meu caderno de revisão",
      subjectId,
      createdAt: "2026-10-24",
      pageIds: [],
    },
  ];
  seed.notes = [];
  seed.materials = [
    {
      id: "source",
      title: "Fonte de revisão",
      subjectId,
      kind: "text",
      content: "Uma igualdade tem dois lados.",
      createdAt: "2026-10-24",
    },
  ];
  await page.addInitScript((seed) => {
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
    localStorage.setItem("helena.guest.v1", "1");
    if (!localStorage.getItem("helenastudy.workspace.v1"))
      localStorage.setItem("helenastudy.workspace.v1", JSON.stringify(seed));
  }, seed);
  await page.goto("/biblioteca?material=source");
  const reader = page.getByRole("dialog", { name: "Fonte de revisão", exact: true });
  await reader.getByLabel("Trecho selecionado ou digitado").fill("Uma igualdade tem dois lados.");
  await reader.getByRole("button", { name: "Estudar com um caderno" }).click();
  await page.getByRole("option", { name: "Meu caderno de revisão" }).click();
  await reader.getByRole("button", { name: "Enviar trecho ao caderno" }).click();
  await expect(
    reader.getByRole("status").filter({ hasText: "Trecho enviado ao caderno." }),
  ).toBeVisible();
  await reader.getByRole("button", { name: "Criar flashcard do trecho" }).click();
  const card = page.getByRole("dialog", { name: "Criar flashcard", exact: true });
  await card.getByLabel("Verso").fill("Os dois lados têm o mesmo valor.");
  await card.getByRole("button", { name: "Criar flashcard", exact: true }).click();
  await expect(card).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("helenastudy.workspace.v1") ?? "{}").flashcards?.[0]
            ?.materialId,
      ),
    )
    .toBe("source");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("helenastudy.workspace.v1") ?? "{}").notes?.[0]?.content,
      ),
    )
    .toContain("/biblioteca?material=source");
  await page.screenshot({ path: info.outputPath("material-caderno.png"), animations: "disabled" });
  await reader.getByRole("button", { name: "Estudar com Pomodoro" }).click();
  await expect(page.getByRole("button", { name: "Voltar ao material" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("olena.focus-session.v1") ?? "{}").materialId,
      ),
    )
    .toBe("source");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("olena.focus-session.v1") ?? "{}").running,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Voltar ao material" }).click();
  await expect(page.getByRole("dialog", { name: "Fonte de revisão", exact: true })).toBeVisible();
});
