import { readFileSync } from "node:fs";
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

  it("não carrega nada de fora nem executa script (a política não pode rastrear quem a lê)", () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/(?:src|srcset)=/i);
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

  it("identifica o responsável e avisa que o canal de contato ainda está em definição", () => {
    expect(text).toContain("Oliver");
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
      "menores de 18 anos",
    ]) {
      expect(text).toContain(trecho);
    }
  });

  it("nomeia todos os serviços externos com que o aplicativo se conecta", () => {
    // Cada host liberado no connect-src do CSP é um serviço para o qual o navegador
    // pode enviar dados. Se um novo aparecer, a política precisa ser atualizada.
    const connect = csp.split(";").find((part) => part.trim().startsWith("connect-src")) ?? "";
    const hosts = connect.split(/\s+/).filter((token) => token.startsWith("https://"));
    expect(hosts.length).toBeGreaterThan(3);
    const covered: Record<string, string[]> = {
      "firebaseio.com": ["Firebase"],
      "firebaseappcheck.googleapis.com": ["App Check"],
      "content-firebaseappcheck.googleapis.com": ["App Check"],
      "identitytoolkit.googleapis.com": ["Firebase Authentication"],
      "securetoken.googleapis.com": ["Firebase Authentication"],
      "www.googleapis.com": ["Google Agenda"],
      "apis.google.com": ["Google"],
      "api.datamuse.com": ["Datamuse"],
      "www.google.com": ["reCAPTCHA"],
    };
    for (const host of hosts) {
      const name = host.replace("https://", "").replace("*.", "");
      const keywords = covered[name];
      expect(keywords, `host novo no CSP sem cobertura na política: ${name}`).toBeDefined();
      for (const keyword of keywords!) expect(text).toContain(keyword);
    }
  });

  it("cita os operadores que recebem dados fora do Google", () => {
    for (const operador of ["Vercel", "Cloudflare", "Datamuse"]) expect(text).toContain(operador);
  });

  it("descreve o que fica só no aparelho e o que não é feito", () => {
    expect(text).toContain("OCR");
    expect(text).toContain("Não vendemos");
    expect(text).toContain("analytics");
  });
});
