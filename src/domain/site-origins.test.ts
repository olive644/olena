import { describe, expect, it } from "vitest";
import {
  CANONICAL_SITE_ORIGIN,
  DEFAULT_SITE_ORIGINS,
  isOlenaSiteOrigin,
  parseAllowedOrigins,
} from "./site-origins";

describe("origens do OlenaStudy", () => {
  it("aceita por padrão o domínio oficial, o sem www e o endereço da Vercel", () => {
    expect(parseAllowedOrigins(undefined)).toEqual([
      "https://www.olenastudy.com.br",
      "https://olenastudy.com.br",
      "https://olenastudy.vercel.app",
    ]);
    expect(DEFAULT_SITE_ORIGINS).toContain(CANONICAL_SITE_ORIGIN);
  });

  it("usa a lista configurada, sem espaços nem itens vazios, quando ela existe", () => {
    expect(parseAllowedOrigins(" https://a.test , ,https://b.test ")).toEqual([
      "https://a.test",
      "https://b.test",
    ]);
  });

  it("volta ao padrão quando a variável está vazia, em vez de recusar todas as origens", () => {
    expect(parseAllowedOrigins("")).toEqual([...DEFAULT_SITE_ORIGINS]);
    expect(parseAllowedOrigins(" , ")).toEqual([...DEFAULT_SITE_ORIGINS]);
  });

  it("reconhece só origens exatas do Olena", () => {
    expect(isOlenaSiteOrigin("https://www.olenastudy.com.br")).toBe(true);
    expect(isOlenaSiteOrigin("https://olenastudy.com.br.evil.example")).toBe(false);
    expect(isOlenaSiteOrigin("http://www.olenastudy.com.br")).toBe(false);
    expect(isOlenaSiteOrigin("https://evil.olenastudy.com.br")).toBe(false);
  });
});
