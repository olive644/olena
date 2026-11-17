import { describe, expect, it } from "vitest";
import {
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
    "summary-user-day",
    "summary-day",
    "global-day",
    "provider-quota",
  ];

  it.each(names)("tem texto claro para %s, sem travessão", (name) => {
    const message = quotaMessage(name, "summarize");
    expect(message.length).toBeGreaterThan(30);
    expect(message).not.toMatch(/[\u2013\u2014]/);
  });

  it("lembra do Resumo automático só nos resumos e diz a hora em que volta", () => {
    expect(quotaMessage("global-day", "summarize")).toContain("Resumo automático");
    expect(quotaMessage("global-day", "tutor")).not.toContain("Resumo automático");
    expect(quotaMessage("summary-day", "summarize")).toContain("21h");
    expect(quotaMessage(undefined, "tutor")).toContain("Limite de uso atingido");
  });

  it("traduz todos os avisos para inglês e escolhe o idioma pelo cabeçalho", () => {
    expect(noticeLanguage("en-US")).toBe("en");
    expect(noticeLanguage("pt-BR")).toBe("pt");
    expect(noticeLanguage(null)).toBe("pt");
    for (const name of names) {
      const english = quotaMessage(name, "summarize", "en");
      expect(english).not.toMatch(/Olena atingiu|voltam|Você|às 21h/);
      expect(english).toMatch(/Olena|You|requests|Usage/);
    }
    expect(quotaMessage("global-day", "summarize", "en")).toContain(
      "Automatic summary still works",
    );
  });
});
