import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NumberBingo from "./number-bingo";
import { createNumberBingoCard } from "../domain/number-bingo";
import type { PublicLocalRoomState } from "../domain/local-room";

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
    expect(screen.queryByRole("button", { name: /Aplicar/ })).toBeNull();
  });
  it("shows a solar 5x5 card, locks undrawn numbers and submits marks and claims", () => {
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
    expect(onAnswer).toHaveBeenCalledWith(0, "1");
    expect(screen.queryByRole("button", { name: /Ouvir/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Sortear/ })).toBeNull();
  });
});
