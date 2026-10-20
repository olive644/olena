import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialWorkspace } from "../domain/workspace";
import { applySyncedStorage } from "../data/synced-storage";
import { FocusView } from "./focus-view";

const streakKey = "noteoli.pomodoro-streak.v1";

describe("persistência semanal e dígitos do Foco", () => {
  it("recupera pausado após desligar, sem registrar os minutos ausentes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 2, 12));
    const props = { workspace: createInitialWorkspace(), dispatch: vi.fn() };
    const view = render(<FocusView {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo modo" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    view.unmount();
    vi.setSystemTime(new Date(2026, 9, 2, 18, 40));
    render(<FocusView {...props} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("heading", { name: "25:00" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
    expect(props.dispatch).not.toHaveBeenCalled();
  });
  afterEach(() => vi.useRealTimers());

  it("preserva os dias após remontar e mostra somente a semana atual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 2, 12));
    localStorage.setItem(streakKey, JSON.stringify(["2026-09-28", "2026-10-01", "2026-09-20"]));
    const props = { workspace: createInitialWorkspace(), dispatch: vi.fn() };
    const view = render(<FocusView {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo modo" }));
    expect(document.querySelectorAll(".streak-tomato.is-active")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "25:00" })).toBeTruthy();
    view.unmount();
    render(<FocusView {...props} />);
    expect(document.querySelectorAll(".streak-tomato.is-active")).toHaveLength(2);
    act(() => applySyncedStorage({ [streakKey]: JSON.stringify(["2026-10-02"]) }));
    expect(document.querySelectorAll(".streak-tomato.is-active")).toHaveLength(1);
  });

  it("o cronômetro usa tempo real, mantém a pausa e reinicia os dígitos", () => {
    vi.useFakeTimers();
    render(<FocusView workspace={createInitialWorkspace()} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    act(() => vi.advanceTimersByTime(61000));
    expect(screen.getByRole("heading", { name: "00:01:01" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("heading", { name: "00:01:01" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar contador" }));
    expect(screen.getByRole("heading", { name: "00:00:00" })).toBeTruthy();
  });

  it("Pomodoro recupera um salto do relógio sem depender dos ticks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 2, 12));
    render(<FocusView workspace={createInitialWorkspace()} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo modo" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    vi.setSystemTime(new Date(2026, 9, 2, 12, 0, 30));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("heading", { name: "24:29" })).toBeTruthy();
  });

  it("não perde o histórico na segunda-feira, mas inicia uma nova semana visual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    const history = JSON.stringify(["2026-09-28", "2026-10-02"]);
    localStorage.setItem(streakKey, history);
    render(<FocusView workspace={createInitialWorkspace()} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo modo" }));
    expect(document.querySelectorAll(".streak-tomato.is-active")).toHaveLength(0);
    expect(localStorage.getItem(streakKey)).toBe(history);
  });

  it("grava o dia ao concluir o foco, sem contar a pausa", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 2, 12));
    const dispatch = vi.fn();
    render(<FocusView workspace={createInitialWorkspace()} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo modo" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    const advanceSeconds = (seconds: number) => {
      for (let elapsed = 0; elapsed < seconds; elapsed += 30) {
        vi.setSystemTime(Date.now() + Math.min(30, seconds - elapsed) * 1000 - 250);
        act(() => vi.advanceTimersByTime(250));
      }
    };
    advanceSeconds(1500);
    expect(JSON.parse(localStorage.getItem(streakKey)!)).toEqual(["2026-10-02"]);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "05:00" })).toBeTruthy();
    advanceSeconds(300);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(streakKey)!)).toEqual(["2026-10-02"]);
  });
});

it.each(["timer", "pomodoro"])("pausa %s após suspensão sem criar ciclos", (mode) => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date(2026, 9, 19, 12));
    const dispatch = vi.fn();
    render(<FocusView workspace={createInitialWorkspace()} dispatch={dispatch} />);
    if (mode === "pomodoro") fireEvent.click(screen.getByRole("button", { name: "Próximo modo" }));
    fireEvent.click(screen.getByRole("button", { name: "Começar" }));
    act(() => vi.advanceTimersByTime(10_000));
    const before = screen.getByRole("heading", {
      name: mode === "pomodoro" ? "24:50" : "00:00:10",
    }).textContent;
    vi.setSystemTime(Date.now() + 400 * 60_000);
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: mode === "pomodoro" ? "24:50" : "00:00:10" }).textContent,
    ).toBe(before);
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("button", { name: "Pausar" })).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
