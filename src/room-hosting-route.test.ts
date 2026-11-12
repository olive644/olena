import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  rewrites: { source: string; destination: string }[];
};

describe("rotas desativadas do Modo Sala", () => {
  it("não encaminha /sala ao aplicativo", () => {
    expect(config.rewrites).not.toContainEqual({ source: "/sala", destination: "/index.html" });
  });

  it("não encaminha o projetor ao aplicativo nem captura outras rotas", () => {
    expect(config.rewrites).not.toContainEqual({
      source: "/sala/:code/projetor",
      destination: "/index.html",
    });
    expect(config.rewrites.some((rule) => rule.source === "/(.*)")).toBe(false);
  });
});
