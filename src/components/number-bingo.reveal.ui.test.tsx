import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import type { PublicLocalRoomState } from "../domain/local-room";
import { createNumberBingoCard } from "../domain/number-bingo";
import NumberBingo from "./number-bingo";

const globe = vi.hoisted(() => ({
  reveal: undefined as ((ids: readonly string[]) => void) | undefined,
}));
vi.mock("./bingo-saturn", () => ({
  BingoSaturn: ({
    onReveal,
    children,
  }: {
    onReveal?: (ids: readonly string[]) => void;
    children?: ReactNode;
  }) => {
    globe.reveal = onReveal;
    return children;
  },
}));
vi.mock("./bingo-participant", () => ({
  BingoParticipant: ({
    onReveal,
    children,
  }: {
    onReveal?: (ids: readonly string[]) => void;
    children?: ReactNode;
  }) => {
    globe.reveal = onReveal;
    return children;
  },
}));

const state: PublicLocalRoomState = {
  code: "ABCDE",
  phase: "playing",
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
  questionIndex: 1,
  questionStartedAt: 0,
  totalQuestions: 75,
  answeredParticipantIds: [],
  drawnIds: ["1", "2"],
  currentQuestion: { id: "2", front: "2" },
};

it.each([true, false])("só libera números revelados, criador=%s", (isHost) => {
  render(
    <NumberBingo
      state={state}
      isHost={isHost}
      participantId="p"
      onMode={vi.fn()}
      onDraw={vi.fn()}
      onAnswer={vi.fn()}
    />,
  );
  // Ao chegar no meio do jogo, tudo o que já saiu está liberado.
  expect(screen.getByRole("button", { name: "B 2" }).hasAttribute("disabled")).toBe(false);
  // Uma bolinha nova saiu, mas ainda está girando: o número não pode ser marcado nem entregue.
  act(() => globe.reveal?.(["1"]));
  expect(screen.getByRole("button", { name: "B 2" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("button", { name: "B 1" }).hasAttribute("disabled")).toBe(false);
  act(() => globe.reveal?.(["1", "2"]));
  expect(screen.getByRole("button", { name: "B 2" }).hasAttribute("disabled")).toBe(false);
});
