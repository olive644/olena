import { afterEach, expect, it, vi } from "vitest";
import { requestPomodoroNotifications, notifyPomodoroPhase } from "./pomodoro-notifications";
afterEach(() => vi.unstubAllGlobals());
it("pede permissão somente quando ainda não há decisão", async () => {
  const requestPermission = vi.fn(async () => "granted" as const);
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  expect(await requestPomodoroNotifications()).toBe("granted");
  expect(requestPermission).toHaveBeenCalledOnce();
  vi.stubGlobal("Notification", { permission: "denied", requestPermission });
  expect(await requestPomodoroNotifications()).toBe("denied");
  expect(requestPermission).toHaveBeenCalledOnce();
});
it("avisa com permissão e não quebra em plataformas sem suporte", async () => {
  const sent: string[] = [];
  class NotificationMock {
    static permission = "granted";
    constructor(_title: string, options: NotificationOptions) {
      sent.push(options.body ?? "");
    }
  }
  vi.stubGlobal("Notification", NotificationMock);
  notifyPomodoroPhase("shortBreak");
  notifyPomodoroPhase("focus");
  expect(sent).toEqual([
    "Rodada concluída. Hora de descansar.",
    "A pausa terminou. Hora de voltar ao estudo.",
  ]);
  vi.stubGlobal("Notification", undefined);
  expect(await requestPomodoroNotifications()).toBe("unsupported");
  expect(() => notifyPomodoroPhase("focus")).not.toThrow();
});
