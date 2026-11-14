import { expect, it } from "vitest";
import { decodeHandwritingDraft, encodeHandwritingDraft } from "./handwriting-draft";
import type { HandwritingDocument } from "../domain/handwriting";

const base: HandwritingDocument = { version: 1, paper: "ruled", strokes: [] };
const draft: HandwritingDocument = { ...base, pageText: "Ainda não salvo" };

it("recupera um rascunho somente quando a versão salva ainda é sua base", () => {
  const raw = encodeHandwritingDraft(draft, base);
  expect(decodeHandwritingDraft(raw, base)).toEqual(draft);
  expect(decodeHandwritingDraft(raw, { ...base, pageText: "Atualizado pelo celular" })).toBeNull();
});

it("preserva folhas novas e impede que rascunhos legados substituam a nuvem", () => {
  expect(decodeHandwritingDraft(encodeHandwritingDraft(draft))).toEqual(draft);
  expect(decodeHandwritingDraft(JSON.stringify(draft))).toEqual(draft);
  expect(decodeHandwritingDraft(JSON.stringify(draft), base)).toBeNull();
  expect(decodeHandwritingDraft("{inválido")).toBeNull();
});

it("recupera o tamanho e a tinta do texto redimensionado sem alterar o fundo do post-it", () => {
  const document: HandwritingDocument = {
    ...base,
    pageText: "Texto legado",
    pageTextSize: 42,
    pageTextFrame: { x: 120, y: 100, width: 350, height: 140, ink: "#218570" },
    stickies: [
      {
        id: "text",
        kind: "text",
        x: 100,
        y: 300,
        width: 360,
        height: 180,
        color: "yellow",
        ink: "#218570",
        textSize: 37.5,
        text: "Texto ampliado",
      },
    ],
  };
  const restored = decodeHandwritingDraft(encodeHandwritingDraft(document));
  expect(restored).toEqual(document);
});
