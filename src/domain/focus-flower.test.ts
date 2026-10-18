import { expect, it } from "vitest";
import { focusFlowerState } from "./focus-flower";
const zone = "America/Sao_Paulo";
const now = Date.parse("2026-10-18T15:00:00Z");
const timer = {
  id: "a",
  subjectId: "a",
  mode: "timer" as const,
  durationMinutes: 20,
  completedAt: new Date(now - 1000).toISOString(),
};
it("sem cronômetro a flor não está viva, mesmo com Pomodoro", () => {
  expect(focusFlowerState([], now, zone)).toMatchObject({ wilted: true, progress: 0 });
  expect(focusFlowerState([{ ...timer, mode: "pomodoro" }], now, zone)).toMatchObject({
    wilted: true,
    minutesToday: 0,
  });
});
it("só cronômetro válido cuida da flor e ela murcha exatamente em 24 horas", () => {
  expect(focusFlowerState([timer], now, zone)).toMatchObject({ wilted: false, minutesToday: 20 });
  const at = Date.parse(timer.completedAt);
  expect(focusFlowerState([timer], at + 86400000 - 1, zone).wilted).toBe(false);
  expect(focusFlowerState([timer], at + 86400000, zone).wilted).toBe(true);
  expect(
    focusFlowerState(
      [
        { ...timer, durationMinutes: 0 },
        { ...timer, completedAt: "invalid" },
        { ...timer, completedAt: new Date(now + 1000).toISOString() },
      ],
      now,
      zone,
    ).wilted,
  ).toBe(true);
});
it("sessão ativa floresce sem registrar estudo antes de encerrar e separa o dia da conta", () => {
  expect(focusFlowerState([], now, zone, 30)).toMatchObject({
    wilted: false,
    progress: 0.5,
    minutesToday: 0,
  });
  expect(
    focusFlowerState([{ ...timer, completedAt: "2026-10-18T01:00:00Z" }], now, zone).minutesToday,
  ).toBe(0);
});
