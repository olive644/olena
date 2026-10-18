import { uiText } from "../i18n/runtime";
import { useCallback, useEffect, useState } from "react";

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string;
};

type Status = "checking" | "disconnected" | "connected";

export function useGoogleCalendar() {
  const [status, setStatus] = useState<Status>("checking");
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/google-calendar?action=events");
      if (response.status === 401) {
        setStatus("disconnected");
        return;
      }
      if (!response.ok) throw new Error("falha");
      const payload = (await response.json()) as { events: GoogleCalendarEvent[] };
      setEvents(payload.events);
      setError("");
    } catch {
      setError(uiText("Não foi possível carregar os eventos do Google Agenda agora."));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkStatus() {
      try {
        const response = await fetch("/api/google-calendar?action=status");
        const payload = (await response.json()) as { connected: boolean };
        if (cancelled) return;
        setStatus(payload.connected ? "connected" : "disconnected");
        if (payload.connected) await loadEvents();
      } catch {
        if (!cancelled) setStatus("disconnected");
      }
    }
    void checkStatus();
    return () => {
      cancelled = true;
    };
  }, [loadEvents]);

  function connect() {
    window.location.href = "/api/google-calendar?action=connect";
  }

  async function disconnect() {
    await fetch("/api/google-calendar?action=disconnect", { method: "POST" });
    setStatus("disconnected");
    setEvents([]);
  }

  return { status, events, error, connect, disconnect };
}
