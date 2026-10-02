import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  rewrites: { source: string; destination: string }[];
};

describe("rota publicada do Modo Sala", () => {
  it("serve o aplicativo ao abrir ou recarregar /sala diretamente", () => {
    expect(config.rewrites).toContainEqual({ source: "/sala", destination: "/index.html" });
  });

  it("preserva a rota do projetor sem capturar APIs ou arquivos de áudio", () => {
    expect(config.rewrites).toContainEqual({
      source: "/sala/:code/projetor",
      destination: "/index.html",
    });
    expect(config.rewrites.some((rule) => rule.source === "/(.*)")).toBe(false);
  });
});
