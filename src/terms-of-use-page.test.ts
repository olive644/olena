import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TERMS_OF_USE_PATH, TERMS_OF_USE_VERSION } from "./domain/terms-of-use";

const html = readFileSync("public/termos-de-uso.html", "utf8");
const policy = readFileSync("public/politica-de-privacidade.html", "utf8");
const text = html
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");

describe("página dos Termos de Uso", () => {
  it("fica no caminho esperado e traz a mesma versão do código", () => {
    expect(TERMS_OF_USE_PATH).toBe("/termos-de-uso.html");
    expect(html).toContain(`data-terms-version="${TERMS_OF_USE_VERSION}"`);
    expect(html).toContain(`href="https://olenastudy.vercel.app${TERMS_OF_USE_PATH}"`);
  });

  it("não usa travessões, como as regras do repositório pedem", () => {
    expect(html).not.toMatch(/[–—]/);
  });

  it("não executa script nem carrega nada de fora, como a Política de Privacidade", () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/srcset=/i);
    for (const match of html.matchAll(/<link[^>]+href="([^"]*)"/g)) {
      const address = match[1]!;
      if (!address.includes("olenastudy.vercel.app")) expect(address.startsWith("/")).toBe(true);
    }
  });

  it("é uma página completa e acessível, com índice cujos itens apontam para seções existentes", () => {
    expect(html).toContain('<html lang="pt-BR"');
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toContain('name="viewport"');
    expect(html).toContain("<main");
    expect(html).toContain('aria-label="Índice"');
    const targets = [...html.matchAll(/href="#([a-z-]+)"/g)].map((match) => match[1]!);
    expect(targets.length).toBeGreaterThanOrEqual(12);
    for (const id of targets) expect(html).toContain(`id="${id}"`);
  });

  it("identifica a empresa e avisa que contato e foro ainda estão em definição, sem inventar dados", () => {
    expect(text).toContain("Galeria.Oli");
    expect(text).toMatch(/em definição/i);
    expect(text).not.toMatch(/CNPJ\s*[:nº]*\s*\d/);
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  });

  it("não promete o que o aplicativo não faz e é coerente com a Política de Privacidade", () => {
    // Hoje o uso é gratuito; planos pagos aparecem só como possibilidade futura, com aviso prévio.
    expect(text).toMatch(/Hoje o uso do aplicativo é gratuito/);
    expect(text).toMatch(/poderá oferecer planos pagos/);
    expect(text).toMatch(/antes de qualquer cobrança/);
    expect(text).toMatch(/Código de Defesa do Consumidor/);
    // Menores: o aval de um responsável, sem repetir o texto da Política de Privacidade.
    expect(text).toMatch(/menos de 18 anos/);
    expect(text).toMatch(/aval de um responsável/);
    expect(policy).toMatch(/autorização de quem é responsável/);
    // Não anuncia a integração removida do Google Agenda.
    expect(text).not.toMatch(/Google Agenda|agenda do Google/i);
  });

  it("não copia a Política de Privacidade: o que é de dados fica lá, e os termos só apontam para ela", () => {
    const words = (value: string) => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    const own = words(text);
    const other = words(policy.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " "));
    const SIZE = 8;
    const known = new Set<string>();
    for (let i = 0; i + SIZE <= other.length; i++) known.add(other.slice(i, i + SIZE).join(" "));
    const repeated: string[] = [];
    for (let i = 0; i + SIZE <= own.length; i++) {
      const piece = own.slice(i, i + SIZE).join(" ");
      if (known.has(piece)) repeated.push(piece);
    }
    // Só cabeçalho e rodapé das páginas, e os nomes da equipe, podem se repetir.
    for (const piece of repeated)
      expect(
        /olenastudy olena study voltar|josé oliver leo bizzocchi|josé oliver erick gabriel e leo|oliver erick gabriel e leo bizzocchi|erick gabriel e leo bizzocchi|todos os direitos galeria|study voltar ao aplicativo/.test(
          piece,
        ),
        piece,
      ).toBe(true);
  });

  it("os dois documentos apontam um para o outro, e o mapa do site lista os termos", () => {
    expect(html).toContain('href="/politica-de-privacidade.html"');
    expect(policy).toContain(`href="${TERMS_OF_USE_PATH}"`);
    expect(readFileSync("public/sitemap.xml", "utf8")).toContain(
      `https://olenastudy.vercel.app${TERMS_OF_USE_PATH}`,
    );
  });
});
