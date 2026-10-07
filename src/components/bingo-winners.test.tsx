import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { BingoWinners } from "./bingo-winners";
import type { PublicLocalRoomState } from "../domain/local-room";
vi.mock("../data/room-feedback-sound", () => ({
  playBingoClaimSound: vi.fn(),
  playRoomVictorySound: vi.fn(),
}));

it("usa pódio solar na ordem de vitória, não na ordem de pontos", () => {
  const state: PublicLocalRoomState = {
    code: "ABCDE",
    phase: "results",
    settings: {
      activity: "bingo",
      bingoMode: "corners",
      difficulty: "mixed",
      questionCount: 5,
      roundSeconds: 5,
    },
    participants: [
      {
        id: "a",
        displayName: "Ana",
        score: 60,
        reward: { id: "a", place: 2, xp: 21, completedAt: 1 },
      },
      {
        id: "b",
        displayName: "Bia",
        score: 38,
        reward: { id: "b", place: 1, xp: 13, completedAt: 1 },
      },
      {
        id: "c",
        displayName: "Caio",
        score: 40,
        reward: { id: "c", place: 3, xp: 14, completedAt: 1 },
      },
    ],
    bingoWinnerIds: ["b", "a", "c"],
    questionIndex: 0,
    questionStartedAt: 0,
    totalQuestions: 75,
    answeredParticipantIds: [],
  };
  render(<BingoWinners state={state} participantId="none" />);
  expect(
    document.querySelector(".local-room-podium__place--1 .room-podium-name")?.textContent,
  ).toBe("Bia");
  expect(document.querySelectorAll(".local-room-podium__place")).toHaveLength(3);
  expect(screen.getByText("Saturno")).toBeTruthy();
  expect(screen.getByText("Júpiter")).toBeTruthy();
  expect(screen.queryByText("Eclipse Lunar")).toBeNull();
  expect(document.querySelectorAll(".room-solar-trophy")).toHaveLength(3);
  expect(screen.queryByAltText("Poliana celebrando")).toBeNull();
  expect(document.querySelectorAll(".bingo-winners-order .room-player-avatar")).toHaveLength(3);
});
