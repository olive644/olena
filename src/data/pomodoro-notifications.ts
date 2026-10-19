import { uiText } from "../i18n/runtime";

export async function requestPomodoroNotifications(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "unsupported";
  }
}

export function notifyPomodoroPhase(phase: "focus" | "shortBreak" | "longBreak") {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification("OlenaStudy · Pomodoro", {
      body:
        phase === "focus"
          ? uiText("A pausa terminou. Hora de voltar ao estudo.")
          : uiText("Rodada concluída. Hora de descansar."),
      icon: "/olena-favicon-32.png",
      tag: "olena-pomodoro-phase",
    });
  } catch {
    /* Alguns navegadores móveis não aceitam o construtor. O relógio continua. */
  }
}
