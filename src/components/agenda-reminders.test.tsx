import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AgendaReminders } from "./agenda-reminders";
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("preserves snoozes across remount and isolates account queues", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
  const events = [
    {
      id: "persistent",
      title: "Revisão",
      subjectId: "",
      date: "2026-10-12",
      time: "12:15",
      timeZone: "UTC",
      reminders: [15],
    },
  ];
  const first = render(<AgendaReminders events={events} scope="account-a" />);
  fireEvent.click(screen.getByRole("button", { name: "Adiar 5 min" }));
  first.unmount();
  const other = render(<AgendaReminders events={events} scope="account-b" />);
  expect(screen.getByText("Revisão · Em 15 min")).toBeTruthy();
  other.unmount();
  render(<AgendaReminders events={events} scope="account-a" />);
  expect(screen.queryByText("Revisão · Em 15 min")).toBeNull();
  act(() => vi.advanceTimersByTime(300000));
  expect(screen.getByText("Revisão · Em 10 min")).toBeTruthy();
});
it("shows reminders across views without requesting permission, deduplicates and snoozes", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T12:00:00Z"));
  const system = vi.fn(),
    request = vi.fn();
  vi.stubGlobal(
    "Notification",
    class {
      static permission = "granted";
      static requestPermission = request;
      constructor(...args: unknown[]) {
        system(...args);
      }
    },
  );
  const events = [
    {
      id: "a",
      title: "Estudar",
      subjectId: "",
      date: "2026-10-12",
      time: "12:15",
      timeZone: "UTC",
      reminders: [15],
    },
  ];
  const view = render(<AgendaReminders events={events} />);
  expect(screen.getByText("Estudar · Em 15 min")).toBeTruthy();
  expect(system).toHaveBeenCalledTimes(1);
  expect(request).not.toHaveBeenCalled();
  view.rerender(<AgendaReminders events={[...events]} />);
  expect(system).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Adiar 5 min" }));
  expect(screen.queryByText("Estudar · Em 15 min")).toBeNull();
  act(() => vi.advanceTimersByTime(300000));
  expect(screen.getByText("Estudar · Em 10 min")).toBeTruthy();
  expect(system).toHaveBeenCalledTimes(2);
});
