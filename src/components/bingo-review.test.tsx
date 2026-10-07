import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BingoReview } from "./bingo-review";
import { createNumberBingoCard } from "../domain/number-bingo";
import type { PublicLocalRoomState } from "../domain/local-room";
import { playBingoClaimSound } from "../data/room-feedback-sound";

vi.mock("../data/room-feedback-sound", () => ({ playBingoClaimSound: vi.fn() }));
const state: PublicLocalRoomState = {
  code: "ABCDE",
  phase: "playing",
  settings: {
    activity: "bingo",
    bingoMode: "corners",
    difficulty: "mixed",
    questionCount: 5,
    roundSeconds: 5,
  },
  participants: [
    {
      id: "p",
      displayName: "Ana",
      score: 4,
      bingoCard: createNumberBingoCard(() => 0),
      bingoMarks: ["1", "61", "5", "65"],
    },
  ],
  questionIndex: 74,
  questionStartedAt: 1,
  totalQuestions: 75,
  answeredParticipantIds: [],
  bingoClaim: { id: "claim", participantId: "p", claimedAt: 2 },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.open = true;
  });
});
afterEach(() => vi.restoreAllMocks());
describe("Bingo announcement and host review", () => {
  it("does not celebrate before a claim", () => {
    render(<BingoReview state={{ ...state, bingoClaim: undefined }} isHost />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(playBingoClaimSound).not.toHaveBeenCalled();
  });
  it.each([
    ["reject", "Foi engano!"],
    ["continue", "Continuar partida"],
    ["restart", "Recomeçar"],
    ["finish", "Definir ganhador"],
  ] as const)(
    "sends %s with the pending claim id and celebrates only once",
    async (decision, label) => {
      const onReview = vi.fn().mockResolvedValue(undefined);
      const view = render(<BingoReview state={state} isHost onReview={onReview} />);
      expect(screen.getByRole("dialog", { name: "Ana FEZ BINGO!" })).toBeTruthy();
      expect(
        screen.getByRole("region", { name: "Cartela para conferência" }).querySelectorAll("button"),
      ).toHaveLength(25);
      expect(document.querySelectorAll(".room-confetti i")).toHaveLength(48);
      view.rerender(
        <BingoReview
          state={{ ...state, bingoClaim: { ...state.bingoClaim! } }}
          isHost
          onReview={onReview}
        />,
      );
      expect(playBingoClaimSound).toHaveBeenCalledOnce();
      fireEvent.click(screen.getByRole("button", { name: label }));
      await waitFor(() => expect(onReview).toHaveBeenCalledWith("claim", decision));
    },
  );
  it("shows participants the celebration but no host decisions or other player's card", () => {
    render(<BingoReview state={state} isHost={false} />);
    expect(screen.getByRole("dialog", { name: "Ana FEZ BINGO!" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("criador está conferindo");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
  });
  it("keeps the review open and allows retry after transport failure", async () => {
    const onReview = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    render(<BingoReview state={state} isHost onReview={onReview} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar partida" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Tente novamente"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar partida" }));
    await waitFor(() => expect(onReview).toHaveBeenCalledTimes(2));
  });
});
