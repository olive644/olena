import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NumberBingo from "./number-bingo";
import { createNumberBingoCard } from "../domain/number-bingo";
import type { LocalRoomAnswerFeedback, PublicLocalRoomState } from "../domain/local-room";

type Answer = (index: number, answer: string) => Promise<LocalRoomAnswerFeedback | undefined>;

function state(): PublicLocalRoomState {
  return {
    code: "ABCDE",
    phase: "lobby",
    settings: {
      activity: "bingo",
      bingoMode: "line",
      difficulty: "mixed",
      questionCount: 5,
      roundSeconds: 5,
    },
    participants: [
      {
        id: "p",
        displayName: "Ana",
        score: 0,
        bingoCard: createNumberBingoCard(() => 0),
        bingoMarks: [],
      },
    ],
    questionIndex: 0,
    questionStartedAt: 0,
    totalQuestions: 75,
    answeredParticipantIds: [],
    drawnIds: ["1"],
    currentQuestion: { id: "1", front: "1" },
  };
}

describe("solar bingo interface", () => {
  it("bloqueia sorteios até a contagem inicial terminar", async () => {
    const initial: PublicLocalRoomState = { ...state(), phase: "playing", drawnIds: [] };
    delete initial.currentQuestion;
    const props = {
      state: initial,
      isHost: true,
      participantId: "p",
      onMode: vi.fn(),
      onDraw: vi.fn().mockResolvedValue(undefined),
      onAnswer: vi.fn(),
    };
    const { rerender } = render(<NumberBingo {...props} starting />);
    const button = screen.getByRole("button", { name: "Sortear próxima bolinha" });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.click(button);
    expect(props.onDraw).not.toHaveBeenCalled();
    rerender(<NumberBingo {...props} starting={false} />);
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    await waitFor(() => expect(props.onDraw).toHaveBeenCalledTimes(1));
  });
  it("permite pedir Bingo durante outra conferência e informa a fila sem bloquear com modal", async () => {
    const base = {
      ...state(),
      phase: "playing" as const,
      bingoClaim: { id: "other", participantId: "other", claimedAt: 1 },
    };
    const props = {
      isHost: false,
      participantId: "p",
      onMode: vi.fn(),
      onDraw: vi.fn(),
      onAnswer: vi.fn().mockResolvedValue({ correct: true, pointsChange: 0 }),
    };
    const { rerender } = render(<NumberBingo state={base} {...props} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("Última bola: B 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bingo!" }));
    await waitFor(() => expect(props.onAnswer).toHaveBeenCalledWith(0, "bingo"));
    rerender(
      <NumberBingo
        state={{ ...base, bingoClaimQueue: [{ id: "own", participantId: "p", claimedAt: 2 }] }}
        {...props}
      />,
    );
    expect(screen.getByText("Seu pedido de Bingo está na fila de conferência.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bingo!" }).hasAttribute("disabled")).toBe(true);
  });
  it("reage junto à bola aceita e some, sem pontos pairando no topo", async () => {
    const base = { ...state(), phase: "playing" as const };
    const props = {
      isHost: false,
      participantId: "p",
      onMode: vi.fn(),
      onDraw: vi.fn(),
      onAnswer: vi.fn().mockResolvedValue({ correct: true, pointsChange: 2 }),
    };
    const { rerender } = render(<NumberBingo state={base} {...props} />);
    expect(document.querySelector(".bingo-ball-reaction")).toBeNull();
    const scored = { ...base, participants: base.participants.map((p) => ({ ...p, score: 2 })) };
    rerender(<NumberBingo state={scored} {...props} />);
    expect(document.querySelector(".bingo-ball-reaction")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "B 1" }));
    await waitFor(() => expect(screen.getByLabelText("Bola 1: WOW! +2 pontos!")).toBeTruthy());
    expect(document.querySelector(".bingo-solar-card .bingo-ball-reaction")).toBeTruthy();
    expect(document.querySelector(".bingo-points-meter")).toBeNull();
    const key = document.querySelector(".bingo-ball-reaction");
    rerender(<NumberBingo state={{ ...scored }} {...props} />);
    expect(document.querySelector(".bingo-ball-reaction")).toBe(key);
    await waitFor(() => expect(document.querySelector(".bingo-ball-reaction")).toBeNull(), {
      timeout: 2000,
    });
  });
  it("oferece Bingo presencial antes da criação e remove a legenda antiga", () => {
    const onPhysical = vi.fn();
    render(
      <NumberBingo
        state={state()}
        isHost
        participantId="p"
        onMode={vi.fn()}
        onDraw={vi.fn()}
        onAnswer={vi.fn()}
        onPhysical={onPhysical}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Bingo presencial/ }));
    expect(onPhysical).toHaveBeenCalledWith(true);
    expect(screen.queryByText(/75 números, cartelas/)).toBeNull();
  });
  it("offers five illustrated modes and applies selection immediately", () => {
    const onMode = vi.fn();
    render(
      <NumberBingo
        state={state()}
        isHost
        participantId="p"
        onMode={onMode}
        onDraw={vi.fn()}
        onAnswer={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("group", { name: "Modo de partida" }).querySelectorAll("button"),
    ).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: /Quatro cantos/ }));
    expect(onMode).toHaveBeenCalledWith("corners");
    for (const mode of ["line", "column", "diagonal", "corners", "full"]) {
      expect(
        document.querySelector(
          `.bingo-mode-art img[src="/room-art/poliana-bingo-${mode}-panorama.webp"]`,
        ),
      ).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: /Aplicar/ })).toBeNull();
  });
  it("shows a solar 5x5 card, locks undrawn numbers and submits marks and claims", async () => {
    const onAnswer = vi.fn().mockResolvedValue({ correct: false, pointsChange: 0 });
    render(
      <NumberBingo
        state={{ ...state(), phase: "playing" }}
        isHost={false}
        participantId="p"
        onMode={vi.fn()}
        onDraw={vi.fn()}
        onAnswer={onAnswer}
      />,
    );
    expect(
      screen
        .getByRole("region", { name: "Minha cartela" })
        .querySelectorAll(".bingo-card-grid button"),
    ).toHaveLength(25);
    expect(
      screen.getByRole("button", { name: "Sol, centro livre" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "B 2" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "B 1" }));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(0, "1"));
    expect(screen.queryByRole("button", { name: /Ouvir/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sortear/ })).toBeNull();
    expect(screen.queryByText("Complete sua constelação")).toBeNull();
    expect(screen.queryByText(/Última bolinha:/)).toBeNull();
    expect(screen.queryByText("O Sol já conta como marcado.")).toBeNull();
    expect(document.querySelector(".bingo-participant-stage .bingo-history")).toBeTruthy();
    expect(document.querySelector("canvas")).toBeNull();
    expect(document.querySelector(".bingo-card-column .bingo-solar-card")).toBeTruthy();
    expect(document.querySelectorAll(".bingo-cell-planet")).toHaveLength(24);
    for (const planet of ["earth", "mars", "jupiter", "saturn", "neptune"]) {
      expect(document.querySelectorAll(`.bingo-cell-planet[data-planet="${planet}"]`)).toHaveLength(
        planet === "jupiter" ? 4 : 5,
      );
    }
    expect(document.querySelector(".bingo-card-blackhole")).toBeTruthy();
    expect(document.querySelector(".bingo-claim img")?.getAttribute("src")).toBe(
      "/room-icons/bingo-claim.svg",
    );
    expect(document.querySelector(".bingo-rule")).toBeNull();
    expect(screen.queryByLabelText("Globo Saturno com as bolinhas restantes")).toBeNull();
  });

  describe("marcação na cartela", () => {
    function playing(marks: string[] = []): PublicLocalRoomState {
      const base = state();
      return {
        ...base,
        phase: "playing",
        questionIndex: 1,
        drawnIds: ["1", "2"],
        participants: [{ ...base.participants[0]!, bingoMarks: marks }],
      };
    }
    function mount(onAnswer: Answer, current = playing()) {
      return render(
        <NumberBingo
          state={current}
          isHost={false}
          participantId="p"
          onMode={vi.fn()}
          onDraw={vi.fn()}
          onAnswer={onAnswer}
        />,
      );
    }
    it("marca na hora, sem esperar o servidor, e mantém as outras casas livres", async () => {
      let confirm: (value: { correct: boolean; pointsChange: number }) => void = () => {};
      const onAnswer = vi.fn<Answer>(
        () =>
          new Promise<{ correct: boolean; pointsChange: number }>((resolve) => {
            confirm = resolve;
          }),
      );
      mount(onAnswer);
      const first = screen.getByRole("button", { name: "B 1" });
      fireEvent.click(first);
      // O servidor ainda não respondeu e a casa já aparece marcada.
      expect(first.getAttribute("aria-pressed")).toBe("true");
      expect(first.hasAttribute("disabled")).toBe(true);
      expect(screen.getByRole("button", { name: "B 2" }).hasAttribute("disabled")).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "B 2" }));
      expect(screen.getByRole("button", { name: "B 2" }).getAttribute("aria-pressed")).toBe("true");
      // Os pedidos seguem em fila: o segundo só sai depois de o primeiro ser confirmado.
      await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(1));
      expect(onAnswer).toHaveBeenLastCalledWith(1, "1");
      await act(async () => confirm({ correct: true, pointsChange: 1 }));
      await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(2));
      expect(onAnswer).toHaveBeenLastCalledWith(1, "2");
    });
    it("desfaz a marca e avisa quando o servidor recusa ou falha", async () => {
      const onAnswer = vi
        .fn<Answer>()
        .mockResolvedValueOnce({ correct: false, pointsChange: 0 })
        .mockResolvedValueOnce(undefined);
      mount(onAnswer);
      fireEvent.click(screen.getByRole("button", { name: "B 1" }));
      await waitFor(() =>
        expect(screen.getByText("Esse número ainda não pode ser marcado.")).toBeTruthy(),
      );
      expect(screen.getByRole("button", { name: "B 1" }).getAttribute("aria-pressed")).toBe(
        "false",
      );
      fireEvent.click(screen.getByRole("button", { name: "B 1" }));
      await waitFor(() =>
        expect(screen.getByText("Não foi possível marcar. Tente de novo.")).toBeTruthy(),
      );
      expect(screen.getByRole("button", { name: "B 1" }).getAttribute("aria-pressed")).toBe(
        "false",
      );
    });
    it("não repete o pedido de uma casa que já está marcada", async () => {
      const onAnswer = vi.fn<Answer>().mockResolvedValue({ correct: true, pointsChange: 1 });
      mount(onAnswer, playing(["1"]));
      expect(screen.getByRole("button", { name: "B 1" }).getAttribute("aria-pressed")).toBe("true");
      fireEvent.click(screen.getByRole("button", { name: "B 1" }));
      await act(async () => {});
      expect(onAnswer).not.toHaveBeenCalled();
    });
    it("destaca as casas que já podem ser marcadas", () => {
      mount(vi.fn<Answer>(), playing(["1"]));
      expect(screen.getByRole("button", { name: "B 2" }).className).toContain("bingo-callable");
      expect(screen.getByRole("button", { name: "B 1" }).className).not.toContain("bingo-callable");
    });
  });
});
