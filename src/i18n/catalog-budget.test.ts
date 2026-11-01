import { expect, it } from "vitest";
import baseline from "../test/fixtures/ui-catalog-budget-baseline.json";
import portuguese from "../../public/locales/pt-BR.json";
import english from "../../public/locales/en-US.json";
import { changeLanguage, installUiCatalog, uiText } from "./runtime";
import { GENERAL_ACHIEVEMENTS } from "../domain/general-achievement-catalog";

it("mantém os mesmos textos e parâmetros ao reutilizar os IDs existentes do catálogo", async () => {
  installUiCatalog("en-US", english);
  try {
    for (const locale of ["pt-BR", "en-US"] as const) {
      await changeLanguage(locale);
      for (const { id, text } of baseline) {
        expect(portuguese[id]).toBe(text);
        expect(uiText(id, [7, "teste", 12])).toBe(uiText(text, [7, "teste", 12]));
      }
      for (const item of GENERAL_ACHIEVEMENTS) {
        expect(uiText(item.name)).not.toMatch(/^\[\d+\]$/);
        expect(uiText(item.description, [item.target])).not.toMatch(/\{\d+\}/);
        expect(english[item.name]).toBeTruthy();
        expect(english[item.description]).toBeTruthy();
      }
    }
  } finally {
    await changeLanguage("pt-BR");
  }
});

it("não deixa interrogações no lugar de letras acentuadas nos textos em português", () => {
  const broken = portuguese
    .map((text, id) => ({ id, text }))
    .filter(({ text }) => /\p{L}\?\p{L}|�/u.test(text));
  expect(broken).toEqual([]);
});
