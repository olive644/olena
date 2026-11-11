import { describe, expect, it } from "vitest";
import { allowedOriginsFrom, DEFAULT_ALLOWED_ORIGINS } from "./allowed-origins";

describe("allowedOriginsFrom", () => {
  it("sem variável, aceita o endereço da Vercel e o domínio próprio, com e sem www", () => {
    expect(allowedOriginsFrom(undefined)).toEqual([...DEFAULT_ALLOWED_ORIGINS]);
    expect(allowedOriginsFrom(undefined)).toEqual(
      expect.arrayContaining([
        "https://olenastudy.vercel.app",
        "https://olenastudy.com.br",
        "https://www.olenastudy.com.br",
      ]),
    );
  });

  it("com a variável, ela substitui a lista inteira e ignora espaços e itens vazios", () => {
    expect(allowedOriginsFrom(" https://a.test , ,https://b.test,")).toEqual([
      "https://a.test",
      "https://b.test",
    ]);
  });

  it("não aceita variações do domínio que não estão na lista", () => {
    const list = allowedOriginsFrom(undefined);
    expect(list).not.toContain("http://olenastudy.com.br");
    expect(list).not.toContain("https://evil.olenastudy.com.br");
  });
});
