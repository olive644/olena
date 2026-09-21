import { expect, test } from "vitest";
import { reviewPortugueseText } from "./text-review";

test("revisa acentos comuns e início de frases sem alterar palavras ambíguas", () => {
  expect(reviewPortugueseText("voce nao sabe. tambem tenho conteudo! portugues? sim")).toBe(
    "Você não sabe. Também tenho conteúdo! Português? Sim",
  );
  expect(reviewPortugueseText("esta e por ai")).toBe("Esta e por ai");
  expect(reviewPortugueseText("ele duvida do constructor")).toBe("Ele duvida do constructor");
});
test("preserva links, código, emails e caixa alta", () => {
  expect(reviewPortugueseText("VOCES https://site.test/voce `nao` nome@voce.com")).toBe(
    "VOCÊS https://site.test/voce `nao` nome@voce.com",
  );
});
