import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const text = readFileSync("public/.well-known/security.txt", "utf8").replace(/\r\n/g, "\n");
const fields = new Map(
  text
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1).trim()]),
);

describe("security.txt (RFC 9116)", () => {
  it("traz os campos obrigatórios: contato por https e data de validade", () => {
    expect(fields.get("Contact")).toMatch(/^https:\/\//);
    expect(fields.get("Expires")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
  });

  it("não vence em menos de 60 dias, para a renovação não passar despercebida", () => {
    const expires = Date.parse(fields.get("Expires") ?? "");
    expect(expires - Date.now()).toBeGreaterThan(60 * 24 * 60 * 60 * 1000);
  });

  it("aponta para a política de segurança e para o endereço canônico do site", () => {
    expect(fields.get("Policy")).toContain("SECURITY.md");
    expect(fields.get("Canonical")).toBe("https://olenastudy.vercel.app/.well-known/security.txt");
  });

  it("não expõe e-mail nem telefone pessoal", () => {
    expect(text).not.toMatch(/mailto:|tel:|@[a-z0-9.-]+\.[a-z]{2,}/i);
  });
});
