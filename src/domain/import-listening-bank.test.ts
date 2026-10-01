import { expect, it } from "vitest";
import { importListeningBank } from "./import-listening-bank";
it("importa CSV com cabeçalho, aspas, BOM e traduções sem duplicar", () => {
  expect(importListeningBank('\uFEFFword,translation\r\n"school",escola\r\nônibus\r\nbus')).toEqual(
    { ids: ["ready-school", "ready-bus"], missing: [] },
  );
});
it("importa TSV e informa palavras que não têm áudio", () => {
  expect(importListeningBank("book\tlivro\nunknown;desconhecido")).toEqual({
    ids: ["ready-book"],
    missing: ["unknown"],
  });
});
it("limita tamanho e linhas sem inferir conteúdo de documentos", () => {
  expect(() => importListeningBank("x".repeat(64_001))).toThrow("64 KB");
  expect(() => importListeningBank("book\n".repeat(502))).toThrow("500 linhas");
});
