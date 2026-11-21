import { describe, expect, it } from "vitest";
import {
  ADDRESS_DAILY_LIMIT,
  DAY_SECONDS,
  noticeLanguage,
  quotaMessage,
  secondsUntilReset,
  type RateLimitName,
} from "./helena-quota";

describe("cota diária da Olena", () => {
  it("diz quanto falta para a janela do dia (00:00 UTC) terminar", () => {
    const noon = Date.UTC(2026, 10, 17, 12, 0, 0);
    expect(secondsUntilReset(DAY_SECONDS, noon)).toBe(12 * 3600);
    expect(secondsUntilReset(DAY_SECONDS, Date.UTC(2026, 10, 17, 23, 59, 59))).toBe(1);
    expect(secondsUntilReset(60, Date.UTC(2026, 10, 17, 0, 0, 20))).toBe(40);
  });

  const names: RateLimitName[] = [
    "user-minute",
    "user-day",
    "address-day",
    "user-budget",
    "address-budget",
    "global-budget",
    "busy",
    "duplicate",
    "request-too-big",
    "provider-quota",
  ];

  it.each(names)("tem texto claro para %s, sem travessão", (name) => {
    const message = quotaMessage(name, "summarize");
    expect(message.length).toBeGreaterThan(30);
    expect(message).not.toMatch(/[\u2013\u2014]/);
  });

  it("o aviso de créditos diz quanto foi usado, quanto cabe e quando volta", () => {
    const message = quotaMessage("user-budget", "quiz", "pt", {
      usedCredits: 410,
      limitCredits: 450,
    });
    expect(message).toContain("410 de 450");
    expect(message).toContain("créditos");
    expect(message).toContain("21h");
    expect(message).not.toMatch(/\b2 (resumos|quizzes|simulados|flashcards)\b/);
    expect(
      quotaMessage("user-budget", "quiz", "en", { usedCredits: 410, limitCredits: 450 }),
    ).toContain("410 of 450");
  });

  it("o aviso de texto grande diz o custo e o limite", () => {
    const message = quotaMessage("request-too-big", "summarize", "pt", {
      requestCredits: 340,
      requestMaxCredits: 300,
    });
    expect(message).toContain("340");
    expect(message).toContain("300");
    expect(message).toContain("menos fontes");
  });

  it("o limite global e o do provedor falam do limite gratuito do dia e da hora de volta", () => {
    expect(quotaMessage("global-budget", "quiz")).toContain("21h");
    expect(quotaMessage("provider-quota", "quiz")).toContain("limite gratuito de hoje");
    expect(quotaMessage(undefined, "tutor")).toContain("Limite de uso atingido");
    // Não há mais caminho gratuito no aparelho: o aviso não promete um.
    for (const name of names) expect(quotaMessage(name, "quiz")).not.toContain("automático");
  });

  it("o limite por rede cabe uma turma e não é o limite de custo", () => {
    expect(ADDRESS_DAILY_LIMIT).toBeGreaterThanOrEqual(250);
  });

  it("traduz todos os avisos para inglês e escolhe o idioma pelo cabeçalho", () => {
    expect(noticeLanguage("en-US")).toBe("en");
    expect(noticeLanguage("pt-BR")).toBe("pt");
    expect(noticeLanguage(null)).toBe("pt");
    for (const name of names) {
      const english = quotaMessage(name, "summarize", "en");
      expect(english).not.toMatch(/Olena atingiu|voltam|Você|às 21h|Esse|A Olena/);
      expect(english).toMatch(/Olena|You|request|Usage|text/i);
    }
  });
});
