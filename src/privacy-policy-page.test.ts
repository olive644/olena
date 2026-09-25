import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY_PATH, PRIVACY_POLICY_VERSION } from "./domain/privacy-policy";

const html = readFileSync("public/politica-de-privacidade.html", "utf8");
const text = html
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const csp =
  vercel.headers
    .find((rule) => rule.source === "/(.*)")
    ?.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";

describe("página da Política de Privacidade", () => {
  it("fica no caminho que o aplicativo aponta e traz a mesma versão do código", () => {
    expect(PRIVACY_POLICY_PATH).toBe("/politica-de-privacidade.html");
    expect(html).toContain(`data-policy-version="${PRIVACY_POLICY_VERSION}"`);
  });

  it("não usa travessões, como as regras do repositório pedem", () => {
    expect(html).not.toMatch(/[–—]/);
  });

  it("não executa script nem carrega nada de fora (a política não pode rastrear quem a lê)", () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/srcset=/i);
    // Imagens e ícones só do próprio aplicativo.
    for (const match of html.matchAll(/ssrc="([^"]*)"/g))
      expect(match[1]!.startsWith("/")).toBe(true);
    for (const match of html.matchAll(/<link[^>]+href="([^"]*)"/g)) {
      const address = match[1]!;
      if (!address.includes("olenastudy.vercel.app")) expect(address.startsWith("/")).toBe(true);
    }
  });

  it("é uma página completa e acessível: idioma, título, ponto de entrada e índice", () => {
    expect(html).toContain('<html lang="pt-BR"');
    expect(html).toMatch(/<title>[^<]+<\/title>/);
    expect(html).toContain('name="viewport"');
    expect(html).toContain("<main");
    expect(html).toContain('aria-label="Índice"');
  });

  it("todo item do índice aponta para uma seção que existe", () => {
    const targets = [...html.matchAll(/href="#([a-z-]+)"/g)].map((match) => match[1]!);
    expect(targets.length).toBeGreaterThanOrEqual(9);
    for (const id of targets) expect(html).toContain(`id="${id}"`);
  });

  it("identifica a empresa responsável e a equipe, e avisa que o contato ainda está em definição", () => {
    expect(text).toContain("Galeria.Oli");
    for (const pessoa of ["José Oliver", "Helena Ferreira", "Leo Bizzocchi"]) {
      expect(text).toContain(pessoa);
    }
    expect(text).not.toContain("pessoa física");
    expect(text).toContain("Canal de contato em definição");
  });

  it("cobre os direitos da LGPD e o caminho para pedir a exclusão", () => {
    for (const trecho of [
      "Lei nº 13.709/2018",
      "art. 18",
      "portabilidade",
      "retirar o consentimento",
      "ANPD",
      "excluir a sua conta",
      "menos de 18 anos",
      "menores de 18",
    ]) {
      expect(text, `falta na política: ${trecho}`).toContain(trecho);
    }
  });

  it("fala em linguagem simples: sem nomes de fornecedores nem termos técnicos", () => {
    const proibidos = [
      "Firebase",
      "Vercel",
      "GitHub",
      "Cloudflare",
      "Datamuse",
      "Workers AI",
      "banco de dados",
      "servidor",
      "SHA-256",
      "AES",
      "HttpOnly",
      "SameSite",
      "localStorage",
      "sessionStorage",
      "IndexedDB",
      "reCAPTCHA",
      "App Check",
      "OCR",
      "hash",
      "API",
      "token",
      "HTTPS",
      "código aberto",
    ];
    for (const termo of proibidos) {
      // Palavra inteira: 'API' não pode casar com 'aplicativo'.
      const escaped = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const inteira = new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, "iu");
      expect(text, `termo técnico na política: ${termo}`).not.toMatch(inteira);
    }
  });

  it("cobre em palavras simples todo serviço externo liberado no CSP", () => {
    // Cada host liberado no connect-src do CSP é um serviço para o qual o navegador
    // pode enviar dados. Se um novo aparecer, a política precisa ser atualizada.
    const connect = csp.split(";").find((part) => part.trim().startsWith("connect-src")) ?? "";
    const hosts = connect.split(/\s+/).filter((token) => token.startsWith("https://"));
    expect(hosts.length).toBeGreaterThan(3);
    const covered: Record<string, string> = {
      "firebaseio.com": "guardar seus estudos na nuvem",
      "firebaseappcheck.googleapis.com": "verificação de segurança",
      "content-firebaseappcheck.googleapis.com": "verificação de segurança",
      "identitytoolkit.googleapis.com": "entrar na conta",
      "securetoken.googleapis.com": "entrar na conta",
      "www.googleapis.com": "Google Agenda",
      "apis.google.com": "Google",
      "api.datamuse.com": "consulta de vocabulário",
      "www.google.com": "verificação de segurança",
    };
    for (const host of hosts) {
      const name = host.replace("https://", "").replace("*.", "");
      const phrase = covered[name];
      expect(phrase, `host novo no CSP sem cobertura na política: ${name}`).toBeDefined();
      expect(text, `falta na política: ${phrase}`).toContain(phrase!);
    }
  });

  it("descreve as empresas parceiras por função, sem citar nomes", () => {
    for (const funcao of [
      "A empresa que hospeda o aplicativo na internet",
      "Uma empresa parceira de voz por inteligência artificial",
      "Um serviço de consulta de vocabulário",
    ]) {
      expect(text).toContain(funcao);
    }
    expect(text).toContain("A lista completa e atualizada dessas empresas está disponível");
  });

  it("descreve o que fica só no aparelho e o que não é feito", () => {
    expect(text).toContain("reconhecimento de fórmulas escritas à mão");
    expect(text).toContain("Não vendemos");
    expect(text).toContain("ferramentas de análise");
  });

  it("tem o rodapé de direitos com o ícone da Galeria.Oli", () => {
    expect(text).toContain("Todos os direitos Galeria.Oli - OlenaStudy");
    expect(html).toContain('src="/galeria-oli-icon.svg"');
    expect(html).toMatch(/<footer[^>]*brand-footer[\s\S]*<img[^>]+galeria-oli-icon.svg/);
  });

  it("usa o visual de papel recortado do aplicativo em cada bloco", () => {
    expect(html).toContain("border-radius: 28px 28px 36px 12px");
    expect(html).toMatch(/box-shadow:\s*7px 9px 0/);
    expect(html.match(/class="paper[ "]/g)!.length).toBeGreaterThanOrEqual(12);
  });
});

describe("ícone da Galeria.Oli", () => {
  const icon = readFileSync("public/galeria-oli-icon.svg", "utf8");

  it("é um SVG de verdade, com caixa de visualização quadrada", () => {
    expect(icon.trimStart().startsWith("<svg")).toBe(true);
    expect(icon).toContain('xmlns="http://www.w3.org/2000/svg"');
    const box = icon.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(box).not.toBeNull();
    expect(box![1]).toBe(box![2]);
  });

  it("é vetor puro: nada de imagem embutida, fundo, script ou referência externa", () => {
    expect(icon).not.toMatch(/<image/i);
    expect(icon).not.toMatch(/<rect/i);
    expect(icon).not.toMatch(/<script/i);
    expect(icon).not.toMatch(/href=|xlink|url\(|data:/i);
    expect(icon).not.toMatch(/style=|<style/i);
  });

  it("não tem fundo: só o rosto (contorno, miolo e traços), nenhum preenchimento branco", () => {
    const fills = [...icon.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map((match) =>
      match[1]!.toLowerCase(),
    );
    expect(fills.length).toBeGreaterThanOrEqual(4);
    expect(fills).not.toContain("#ffffff");
    expect(fills).not.toContain("#fff");
    // contorno, miolo claro e tinta escura
    expect(new Set(fills).size).toBe(3);
  });

  it("é acessível e leve, para não pesar em cada abertura do aplicativo", () => {
    expect(icon).toContain('aria-label="Galeria.Oli"');
    expect(icon.length).toBeLessThan(20 * 1024);
  });

  it("existe só em SVG: o PNG antigo foi removido", () => {
    expect(existsSync("public/galeria-oli-icon.png")).toBe(false);
  });
});

describe("exclusão de conta na política", () => {
  it("aponta para o botão do Perfil e não fala mais em pedido manual", () => {
    expect(text).toContain('use o botão "Excluir minha conta"');
    expect(text).toContain("digite o nome da conta para confirmar");
    expect(text).not.toContain("ainda não tem um botão de exclusão");
    expect(text).not.toContain("atendido manualmente");
  });
});
