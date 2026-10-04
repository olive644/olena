import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicLocalRoomState } from "../domain/local-room";
import { LocalRoom } from "./local-room";

const mocks = vi.hoisted(() => ({
  submitAnswer: vi.fn<() => Promise<undefined>>(),
  generateAudio: vi.fn<(...args: unknown[]) => Promise<boolean>>().mockResolvedValue(true),
  roomState: undefined as PublicLocalRoomState | undefined,
  isHost: false,
  serverOffset: 0,
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

vi.mock("../data/recorded-room-player", () => ({
  RecordedRoomPlayer: class {
    unlock() {}
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
    role: mocks.isHost ? ("host" as const) : ("participant" as const),
    state: mocks.roomState ?? PLAYING_STATE,
    error: "",
    isHost: mocks.isHost,
    isOrganizer: mocks.isHost,
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
    serverNow: () => Date.now() + mocks.serverOffset,
    speechCredential: () => "participant-token",
  }),
}));

describe("resposta do participante", () => {
  it("mantém o foco da resposta ao tocar em Ouvir novamente", () => {
    render(<LocalRoom />);
    const input = screen.getByLabelText("Digite a tradução");
    input.focus();
    const replay = screen.getByRole("button", { name: "Ouvir novamente" });
    const pointer = new Event("pointerdown", { bubbles: true, cancelable: true });
    Object.defineProperty(pointer, "pointerType", { value: "touch" });
    fireEvent(replay, pointer);
    expect(pointer.defaultPrevented).toBe(true);
    fireEvent.click(replay);
    expect(document.activeElement).toBe(input);
    expect(mocks.generateAudio).toHaveBeenCalledTimes(1);
    input.blur();
    expect(document.activeElement).not.toBe(input);
  });

  it("não intercepta o toque quando a pessoa já saiu do campo de resposta", () => {
    render(<LocalRoom />);
    const input = screen.getByLabelText("Digite a tradução");
    input.blur();
    const pointer = new Event("pointerdown", { bubbles: true, cancelable: true });
    Object.defineProperty(pointer, "pointerType", { value: "touch" });
    fireEvent(screen.getByRole("button", { name: "Ouvir novamente" }), pointer);
    expect(pointer.defaultPrevented).toBe(false);
  });

  it.each([false, true])(
    "bloqueia ouvir antes do início, inclusive para o criador: %s",
    (isHost) => {
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      mocks.isHost = isHost;
      mocks.roomState = {
        ...PLAYING_STATE,
        questionStartedAt: 4000,
        countdownStartedAt: 1000,
        settings: { ...PLAYING_STATE.settings, participantAudio: true },
      };
      render(<LocalRoom />);
      const listen = screen.getByRole("button", {
        name: isHost ? "Reproduzir áudio" : "Ouvir novamente",
      });
      expect(listen.hasAttribute("disabled")).toBe(true);
      fireEvent.click(listen);
      expect(mocks.generateAudio).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(2999));
      expect(mocks.generateAudio).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(mocks.generateAudio).toHaveBeenCalledTimes(1);
      expect(listen.hasAttribute("disabled")).toBe(false);
    },
  );

  it("ouvir bloqueado não inicia o cooldown nem toca áudio quando a sala está sem áudio automático", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    mocks.roomState = { ...PLAYING_STATE, questionStartedAt: 4000, countdownStartedAt: 1000 };
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvir novamente" }));
    expect(mocks.generateAudio).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Ouvir novamente em 5s" })).toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole("button", { name: "Ouvir novamente" }));
    expect(mocks.generateAudio).toHaveBeenCalledTimes(1);
  });

  it("áudio compartilhado é uma opção da sala, sem ativação individual no lobby", () => {
    mocks.roomState = {
      ...PLAYING_STATE,
      phase: "lobby",
      settings: { ...PLAYING_STATE.settings, participantAudio: true },
    };
    render(<LocalRoom />);
    expect(screen.getByText(/Áudio da sala ativado/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ativar áudio neste dispositivo" })).toBeNull();
    expect(mocks.generateAudio).not.toHaveBeenCalled();
  });

  it("mantém o cooldown de cinco segundos mesmo com diferença entre o relógio local e o servidor", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    mocks.serverOffset = 100000;
    mocks.roomState = { ...PLAYING_STATE, questionStartedAt: 101000 };
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvir novamente" }));
    expect(screen.getByRole("button", { name: "Ouvir novamente em 5s" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("button", { name: "Ouvir novamente" })).toBeTruthy();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mocks.roomState = undefined;
    mocks.isHost = false;
    mocks.serverOffset = 0;
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

  it("não reproduz automaticamente no aluno, mas permite ouvir novamente", () => {
    render(<LocalRoom />);
    expect(mocks.generateAudio).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ouvir novamente" }));
    expect(mocks.generateAudio).toHaveBeenCalledTimes(1);
  });

  it("reproduz no participante somente quando o organizador ativa a opção", () => {
    mocks.roomState = {
      ...PLAYING_STATE,
      settings: { ...PLAYING_STATE.settings, participantAudio: true },
    };
    render(<LocalRoom />);
    expect(mocks.generateAudio).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Revelar palavra" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Modo Projetor" })).toBeNull();
    expect(screen.getByLabelText("Digite a tradução")).toBeTruthy();
  });

  it("reproduz automaticamente somente no criador mesmo com configuração antiga desativada", () => {
    mocks.isHost = true;
    mocks.roomState = {
      ...PLAYING_STATE,
      settings: { ...PLAYING_STATE.settings, autoPlayAudio: false },
    };
    render(<LocalRoom />);
    expect(mocks.generateAudio).toHaveBeenCalledTimes(1);
  });

  it("não limita repetições em salas com configuração antiga", () => {
    vi.useFakeTimers();
    mocks.roomState = {
      ...PLAYING_STATE,
      settings: { ...PLAYING_STATE.settings, audioRepetitions: 1 },
    };
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvir novamente" }));
    act(() => vi.advanceTimersByTime(5_000));
    fireEvent.click(screen.getByRole("button", { name: "Ouvir novamente" }));
    expect(mocks.generateAudio).toHaveBeenCalledTimes(2);
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
    expect(screen.getByText("Atualizando pergunta…")).toBeTruthy();
  });

  it("pede áudio da sala sem passar a voz do navegador como alternativa", () => {
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvir novamente" }));
    expect(mocks.generateAudio).toHaveBeenLastCalledWith(0);
  });
});
