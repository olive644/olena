import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("index.html", "utf8");

describe("favicon para o Google", () => {
  // O Google só usa favicon quadrado com lado múltiplo de 48 px e também procura /favicon.ico.
  it("declara ícones de 48 e 192 px e o favicon.ico na página inicial", () => {
    expect(html).toContain('href="/olena-favicon-48.png"');
    expect(html).toMatch(/sizes="48x48"/);
    expect(html).toContain('href="/olena-favicon-192.png"');
    expect(html).toMatch(/sizes="192x192"/);
    expect(html).toContain('href="/favicon.ico"');
  });

  it("publica os arquivos declarados", () => {
    for (const file of ["olena-favicon-48.png", "olena-favicon-192.png", "favicon.ico"]) {
      expect(existsSync(`public/${file}`)).toBe(true);
    }
  });
});
