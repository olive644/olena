import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { headers: HeaderRule[] };
const headers = new Map(
  config.headers.find((rule) => rule.source === "/(.*)")?.headers.map((h) => [h.key, h.value]),
);

describe("cabeçalhos de segurança da Vercel", () => {
  it("força HTTPS por dois anos, inclusive nos subdomínios", () => {
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains");
  });

  it("isola a janela, mas mantém o popup de login do Google funcionando", () => {
    // same-origin quebraria signInWithPopup: o popup perderia o vínculo com a página.
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
  });

  it("mantém as proteções básicas contra sniffing e vazamento de referrer", () => {
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("não deixa executar script inline nem eval, e bloqueia plugins e enquadramento externo", () => {
    const csp = headers.get("Content-Security-Policy") ?? "";
    const scriptSrc = csp.split(";").find((part) => part.trim().startsWith("script-src")) ?? "";
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("base-uri 'self'");
  });
});
