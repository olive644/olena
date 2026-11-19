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
    "study-user-day",
    "study-day",
    "global-day",
    "provider-quota",
  ];

  it.each(names)("tem texto claro para %s, sem travessão", (name) => {
    const message = quotaMessage(name, "summarize");
    expect(message.length).toBeGreaterThan(30);
    expect(message).not.toMatch(/[\u2013\u2014]/);
  });

  it("diz o tipo e o limite de cada pedido da Biblioteca e a hora em que volta", () => {
    expect(quotaMessage("study-user-day", "summarize")).toContain("2 resumos");
    expect(quotaMessage("study-user-day", "flashcards")).toContain("2 flashcards");
    expect(quotaMessage("study-user-day", "quiz")).toContain("2 quizzes");
    expect(quotaMessage("study-user-day", "exam")).toContain("2 simulados");
    expect(quotaMessage("study-day", "quiz")).toContain("21h");
    expect(quotaMessage(undefined, "tutor")).toContain("Limite de uso atingido");
    // Não há mais caminho gratuito no aparelho: o aviso não promete um.
    for (const name of names) expect(quotaMessage(name, "quiz")).not.toContain("automático");
  });

  it("cada pessoa tem 2 usos por dia por tipo e o teto global fica abaixo do da conta", async () => {
    const { STUDY_USER_DAILY_LIMIT, STUDY_GLOBAL_DAILY_LIMIT, GLOBAL_DAILY_LIMIT } =
      await import("./helena-quota");
    expect(STUDY_USER_DAILY_LIMIT).toBe(2);
    expect(STUDY_GLOBAL_DAILY_LIMIT).toBeLessThanOrEqual(GLOBAL_DAILY_LIMIT);
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
    expect(quotaMessage("study-user-day", "exam", "en")).toContain("2 mock exams");
  });
});
