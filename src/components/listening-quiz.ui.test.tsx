import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListeningQuiz } from "./listening-quiz";

describe("feedback do quiz de escuta", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.999);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function reachAnswer() {
    render(<ListeningQuiz flashcards={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /iniciar escuta/i }));
    for (let step = 0; step < 5; step += 1) {
      act(() => vi.advanceTimersByTime(1_000));
    }
  }

  it("nunca apresenta uma resposta errada como acerto", () => {
    reachAnswer();
    fireEvent.change(screen.getByLabelText(/o que você ouviu/i), { target: { value: "errado" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByText("Ainda não")).toBeTruthy();
    expect(screen.getByText(/você respondeu:/i)).toBeTruthy();
    expect(screen.queryByText("Resposta correta", { selector: "small" })).toBeNull();
    expect(screen.getByText("0 acertos")).toBeTruthy();
  });

  it("a resposta correta incrementa a pontuação somente uma vez", () => {
    reachAnswer();
    const input = screen.getByLabelText(/o que você ouviu/i);
    fireEvent.change(input, { target: { value: "escola" } });
    const confirm = screen.getByRole("button", { name: "Confirmar" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(screen.getByText("Resposta correta", { selector: "small" })).toBeTruthy();
    expect(screen.getByText("1 acertos")).toBeTruthy();
  });

  it("espera cinco segundos reais antes de cada palavra", () => {
    reachAnswer();
    fireEvent.change(screen.getByLabelText(/o que você ouviu/i), { target: { value: "escola" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    fireEvent.click(screen.getByRole("button", { name: "Próxima palavra" }));

    expect(screen.getByText("5")).toBeTruthy();
    for (let second = 0; second < 4; second += 1) {
      act(() => vi.advanceTimersByTime(1_000));
    }
    expect(screen.queryByLabelText(/o que você ouviu/i)).toBeNull();
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByLabelText(/o que você ouviu/i)).toBeTruthy();
  });
});

describe("aceite da voz natural no quiz de escuta", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(Math, "random").mockReturnValue(0.999);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("não faz nenhuma requisição antes do aceite e pede a permissão na tela", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("rede não deveria ser usada")));
    vi.stubGlobal("fetch", fetchMock);
    render(<ListeningQuiz flashcards={[]} />);
    expect(screen.getByRole("heading", { name: /Voz natural e vocabulário online/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /iniciar escuta/i }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("guarda a escolha neste aparelho e para de perguntar", () => {
    render(<ListeningQuiz flashcards={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Permitir" }));
    expect(screen.queryByRole("heading", { name: /Voz natural e vocabulário online/ })).toBeNull();
    const stored = JSON.parse(window.localStorage.getItem("helena.listening.online.v1") ?? "{}");
    expect(stored.choice).toBe("accepted");
  });
});
