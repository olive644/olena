import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicLocalRoomState } from "../domain/local-room";
import { LocalRoom } from "./local-room";

const mocks = vi.hoisted(() => ({
  submitAnswer: vi.fn<() => Promise<undefined>>(),
  generateAudio: vi.fn<(...args: unknown[]) => Promise<boolean>>().mockResolvedValue(true),
  roomState: undefined as PublicLocalRoomState | undefined,
}));

vi.mock("../data/listening-audio", () => ({
  NaturalVoicePlayer: class {
    dispose() {}
    stop() {}
    preload() {}
    generate(...args: unknown[]) {
      return mocks.generateAudio(...args);
    }
  },
}));

const PLAYING_STATE: PublicLocalRoomState = {
  code: "ABCDE",
  phase: "playing",
  settings: {
    difficulty: "mixed",
    questionCount: "all",
    roundSeconds: 30,
    autoPlayAudio: true,
  },
  participants: [{ id: "p1", displayName: "Ana", score: 0 }],
  questionIndex: 0,
  questionStartedAt: Date.now(),
  totalQuestions: 1,
  currentQuestion: { id: "c1", front: "book" },
  answeredParticipantIds: [],
};

vi.mock("../hooks/use-local-room", () => ({
  LOCAL_ROOM_SESSION_KEY: "helena:local-room-session:v1",
  useLocalRoom: () => ({
    role: "participant" as const,
    state: mocks.roomState ?? PLAYING_STATE,
    error: "",
    isHost: false,
    participantId: "p1",
    isRestoring: false,
    connectionStatus: "online" as const,
    setRole: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    updateSettings: vi.fn(),
    startRound: vi.fn(),
    nextQuestion: vi.fn(),
    endRoom: vi.fn(),
    repeatRound: vi.fn(),
    returnToLobby: vi.fn(),
    submitAnswer: mocks.submitAnswer,
    reset: vi.fn(),
    serverNow: () => Date.now(),
    speechCredential: () => "participant-token",
  }),
}));

describe("resposta do participante", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mocks.roomState = undefined;
    vi.useRealTimers();
  });

  it("mostra a Helena enquanto envia e impede outro envio", async () => {
    mocks.submitAnswer.mockReturnValue(new Promise(() => {}));
    render(<LocalRoom />);
    fireEvent.change(screen.getByLabelText("Digite a tradução"), {
      target: { value: "livro" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Responder" }));

    expect(screen.getByRole("button", { name: "Enviando…" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Enviando resposta…").closest('[role="status"]')).toBeTruthy();
  });

  it("bloqueia uma nova reprodução por cinco segundos", () => {
    vi.useFakeTimers();
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvir novamente" }));
    expect(screen.getByRole("button", { name: "Ouvir novamente em 5s" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByRole("button", { name: "Ouvir novamente" })).toBeTruthy();
  });

  it("mostra o tempo restante do feedback compartilhado, sem reiniciar a contagem", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    mocks.roomState = {
      ...PLAYING_STATE,
      questionStartedAt: 1_000,
      answeredParticipantIds: ["p1"],
      feedbackUntil: 4_000,
    };
    render(<LocalRoom />);
    expect(screen.getByText("Próxima pergunta em 3 segundos.")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1_100));
    expect(screen.getByText("Próxima pergunta em 2 segundos.")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1_900));
    expect(screen.getByText("Próxima pergunta em 0 segundos.")).toBeTruthy();
  });

  it("pede áudio da sala sem passar a voz do navegador como alternativa", () => {
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvir novamente" }));
    expect(mocks.generateAudio).toHaveBeenLastCalledWith("book", 1);
  });
});
