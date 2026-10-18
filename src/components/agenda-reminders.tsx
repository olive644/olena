import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import type { StudyEvent } from "../domain/workspace";
import { addDays, eventInstant, startsOn, validateCalendarEvent } from "../domain/agenda-calendar";
import { toDateKey } from "../domain/workspace";
import { AgendaCloseIcon } from "./agenda-close-icon";
import "./agenda-reminders.css";
import { useNotificationPreferences } from "../data/notification-preferences";

type Alert = { key: string; title: string; due: number; snoozed: boolean };
function readLocalList(key: string): unknown[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function saveLocalList(key: string, value: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Alerts still work in memory when device storage is full. */
  }
}
export function AgendaReminders({
  events,
  scope = "local",
}: {
  events: StudyEvent[];
  scope?: string;
}) {
  useLanguage();

  const firedKey = `agenda-local-reminders:${scope}:fired`,
    queueKey = `agenda-local-reminders:${scope}:queue`;
  const seen = useRef(new Set<string>());
  const notificationPreferences = useNotificationPreferences();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const delayed = useRef(
    readLocalList(queueKey).flatMap((value) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("key" in value) ||
        typeof value.key !== "string" ||
        !("due" in value) ||
        typeof value.due !== "number" ||
        !Number.isFinite(value.due)
      )
        return [];
      return [{ key: value.key, due: value.due, title: "", snoozed: true }];
    }),
  );
  useEffect(() => {
    const check = () => {
      if (!notificationPreferences.agenda) return;
      const now = Date.now(),
        today = toDateKey(new Date(now));
      const pending: Alert[] = [];
      const remembered = readLocalList(firedKey).filter(
        (value): value is string => typeof value === "string",
      );
      const activeAlerts = new Map<string, Alert>();
      for (const event of events) {
        if (!event.reminders?.length || validateCalendarEvent(event)) continue;
        for (let offset = -1; offset <= 8; offset++) {
          const date = addDays(today, offset);
          if (!startsOn(event, date) || event.completedDates?.includes(date)) continue;
          const start = eventInstant(date, event.allDay ? "09:00" : event.time, event.timeZone);
          if (!Number.isFinite(start)) continue;
          for (const minutes of event.reminders) {
            const due = start - minutes * 60000,
              key = `${event.id}:${start}:${minutes}`;
            const remaining = Math.round((start - now) / 60000);
            const alert = {
              key,
              title: `${event.title} · ${remaining > 0 ? uiText(1603, [remaining]) : remaining === 0 ? uiText(92) : uiText(1604, [Math.abs(remaining)])}`,
              due,
              snoozed: false,
            };
            activeAlerts.set(key, alert);
            if (seen.current.has(key) || remembered.includes(key) || now < due || now - due > 60000)
              continue;
            seen.current.add(key);
            remembered.push(key);
            pending.push(alert);
          }
        }
      }
      const snoozed = delayed.current
        .filter((alert) => alert.due <= now && activeAlerts.has(alert.key))
        .map((alert) => ({ ...activeAlerts.get(alert.key)!, snoozed: true }));
      delayed.current = delayed.current.filter(
        (alert) => alert.due > now && activeAlerts.has(alert.key),
      );
      saveLocalList(
        queueKey,
        delayed.current.map(({ key, due }) => ({ key, due })),
      );
      pending.push(...snoozed);
      if (!pending.length) return;
      saveLocalList(firedKey, remembered.slice(-2000));
      setAlerts((current) => [...current, ...pending].slice(-5));
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const alert of pending) {
          try {
            new Notification("OlenaStudy, lembrete", {
              body: alert.title,
              tag: alert.key,
              icon: "/olena-favicon-32.png",
            });
          } catch {
            /* In-app alert remains available when system notifications are unsupported. */
          }
        }
      }
    };
    check();
    const timer = setInterval(check, 30000);
    return () => clearInterval(timer);
  }, [events, firedKey, queueKey, notificationPreferences.agenda]);
  if (!notificationPreferences.agenda || !alerts.length) return null;
  return (
    <aside className="agenda-live-reminders" aria-label={uiText(93)} aria-live="polite">
      {alerts.map((alert) => (
        <article key={alert.key}>
          <strong>{alert.title}</strong>
          <div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                delayed.current.push({ ...alert, due: Date.now() + 300000, snoozed: true });
                saveLocalList(
                  queueKey,
                  delayed.current.map(({ key, due }) => ({ key, due })),
                );
                setAlerts((items) => items.filter((item) => item.key !== alert.key));
              }}
            >
              {uiText(94)}
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={uiText(1605, [alert.title])}
              onClick={() => setAlerts((items) => items.filter((item) => item.key !== alert.key))}
            >
              <AgendaCloseIcon />
            </button>
          </div>
        </article>
      ))}
    </aside>
  );
}
