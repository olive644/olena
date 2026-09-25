import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const index = readFileSync("index.html", "utf8");
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const csp =
  vercel.headers
    .find((rule) => rule.source === "/(.*)")
    ?.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
const fontCss = readFileSync("public/fonts/fonts.css", "utf8");
const policy = readFileSync("public/politica-de-privacidade.html", "utf8");

describe("fontes servidas pelo próprio domínio", () => {
  it("a página inicial não chama o Google Fonts", () => {
    expect(index).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    expect(index).toContain('href="/fonts/fonts.css"');
  });

  it("o CSP não libera nenhum domínio de fontes de terceiros", () => {
    const style = csp.split(";").find((part) => part.trim().startsWith("style-src")) ?? "";
    const font = csp.split(";").find((part) => part.trim().startsWith("font-src")) ?? "";
    expect(style).not.toMatch(/googleapis|gstatic/);
    expect(font.trim()).toBe("font-src 'self'");
  });

  it("todo arquivo citado no CSS existe e as licenças acompanham as letras", () => {
    const files = [...fontCss.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map((match) => match[1]!);
    expect(files).toHaveLength(8);
    for (const file of files) expect(existsSync(`public${file}`), file).toBe(true);
    expect(existsSync("public/fonts/LICENSE-Manrope.txt")).toBe(true);
    expect(existsSync("public/fonts/LICENSE-Nunito.txt")).toBe(true);
  });

  it("a política usa a Manrope do próprio aplicativo e não menciona entrega de letras por terceiros", () => {
    for (const weight of [600, 700, 800])
      expect(policy).toContain(`/fonts/manrope-latin-${weight}-normal.woff2`);
    expect(policy).not.toMatch(/Letras do aplicativo|fontes de letra/);
  });
});
