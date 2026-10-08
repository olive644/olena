import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicLocalRoomState } from "../domain/local-room";
import { LocalRoom } from "./local-room";

const room = vi.hoisted(() => ({
  isHost: true,
  state: undefined as PublicLocalRoomState | undefined,
  reset: vi.fn(),
  endRoom: vi.fn(),
}));

vi.mock("../hooks/use-local-room", () => ({
  useLocalRoom: () => ({
    role: room.isHost ? ("host" as const) : ("participant" as const),
    state: room.state,
    error: "",
    isHost: room.isHost,
    isOrganizer: room.isHost,
    participantId: "p1",
    isRestoring: false,
    connectionStatus: "online" as const,
    hasSavedSession: true,
    setRole: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    updateSettings: vi.fn(),
    startRound: vi.fn(),
    nextQuestion: vi.fn().mockResolvedValue(undefined),
    endRoom: room.endRoom,
    repeatRound: vi.fn(),
    returnToLobby: vi.fn(),
    submitAnswer: vi.fn().mockResolvedValue(undefined),
    reset: room.reset,
    reconnect: vi.fn(),
    serverNow: () => Date.now(),
    speechCredential: () => "token",
    organizerCredential: () => "host-token",
  }),
}));

function roomState(overrides: Partial<PublicLocalRoomState> = {}): PublicLocalRoomState {
  return {
    code: "ABCDE",
    phase: "lobby",
    settings: { difficulty: "mixed", questionCount: 10, roundSeconds: 30 },
    participants: [{ id: "p1", displayName: "Ana", score: 0 }],
    questionIndex: 0,
    questionStartedAt: 0,
    totalQuestions: 10,
    answeredParticipantIds: [],
    ...overrides,
  };
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  room.isHost = true;
  room.state = roomState();
  room.reset.mockReset();
  room.endRoom.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("confirmação antes de encerrar a sala como anfitrião", () => {
  it("pede confirmação ao sair da sala e só encerra no botão de confirmar", () => {
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: /Sair da sala/ }));
    const dialog = screen.getByRole("dialog", { name: "Sair e encerrar a sala?" });
    expect(room.reset).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/encerra a sala para todos os participantes/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Encerrar sala" }));
    expect(room.reset).toHaveBeenCalledTimes(1);
  });

  it("cancelar não encerra nada e devolve a tela ao normal", () => {
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: /Sair da sala/ }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Sair e encerrar a sala?" })).getByRole("button", {
        name: "Cancelar",
      }),
    );
    expect(screen.queryByRole("dialog", { name: "Sair e encerrar a sala?" })).toBeNull();
    expect(room.reset).not.toHaveBeenCalled();
  });

  it("começa com o foco em Cancelar, a opção segura", () => {
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: /Sair da sala/ }));
    const dialog = screen.getByRole("dialog", { name: "Sair e encerrar a sala?" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancelar" }));
  });

  it.each([true, false])("Voltar preserva a sala e permite retomada, anfitrião %s", (isHost) => {
    room.isHost = isHost;
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: /Voltar/ }));
    expect(screen.queryByRole("dialog", { name: "Encerrar a sala?" })).toBeNull();
    expect(room.reset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Retomar sala ABCDE/ }));
    expect(screen.getByRole("button", { name: /Sair da sala/ })).toBeTruthy();
    expect(room.reset).not.toHaveBeenCalled();
  });

  it("quem não é anfitrião sai direto, sem diálogo", () => {
    room.isHost = false;
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: /Sair da sala/ }));
    expect(room.reset).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: /encerrar a sala/i })).toBeNull();
  });

  it("depois de a sala encerrar, o anfitrião sai direto", () => {
    room.state = roomState({ phase: "finished" });
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: /Sair da sala/ }));
    expect(room.reset).toHaveBeenCalledTimes(1);
  });

  it("a confirmação de saída não aparece na ação explícita Encerrar sala", () => {
    room.state = roomState({ phase: "results" });
    render(<LocalRoom />);
    fireEvent.click(screen.getByRole("button", { name: /Encerrar sala/ }));
    expect(screen.queryByRole("dialog", { name: "Encerrar a sala?" })).toBeNull();
    expect(room.endRoom).toHaveBeenCalledTimes(1);
  });
});

describe("aviso de que a sala está perto de acabar", () => {
  it("não aparece com a sala longe do fim", () => {
    room.state = roomState({ expiresAt: Date.now() + 60 * 60_000 });
    render(<LocalRoom />);
    expect(screen.queryByText(/Esta sala se encerra em menos de/)).toBeNull();
  });

  it("aparece com a faixa de minutos e avisa o anfitrião de como continuar", () => {
    room.state = roomState({ expiresAt: Date.now() + 4 * 60_000 });
    render(<LocalRoom />);
    expect(screen.getByText(/Esta sala se encerra em menos de 5 minutos\./)).toBeTruthy();
    expect(screen.getByText(/crie uma nova sala/)).toBeTruthy();
  });

  it("para participante, não sugere criar outra sala", () => {
    room.isHost = false;
    room.state = roomState({ expiresAt: Date.now() + 30_000 });
    render(<LocalRoom />);
    expect(screen.getByText(/menos de 1 minuto\./)).toBeTruthy();
    expect(screen.queryByText(/crie uma nova sala/)).toBeNull();
  });
});

describe("rodada de escuta", () => {
  function playing(overrides: Partial<PublicLocalRoomState> = {}) {
    room.isHost = false;
    room.state = roomState({
      phase: "playing",
      questionIndex: 1,
      totalQuestions: 5,
      questionStartedAt: Date.now() - 1000,
      currentQuestion: { id: "c2", front: "dog" },
      ...overrides,
    });
  }

  it("não deixa o corretor do celular mexer na resposta", () => {
    playing();
    render(<LocalRoom />);
    const input = screen.getByLabelText("Digite a tradução");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.getAttribute("autocapitalize")).toBe("none");
    expect(input.getAttribute("autocorrect")).toBe("off");
    expect(input.getAttribute("spellcheck")).toBe("false");
  });

  it("anuncia a pergunta para leitor de tela, sem revelar a palavra", () => {
    playing();
    render(<LocalRoom />);
    const announcements = screen.getAllByRole("status").map((element) => element.textContent);
    expect(announcements).toContain("Pergunta 2 de 5.");
    expect(announcements.join(" ")).not.toContain("dog");
  });

  it("anuncia o fim da atividade e da sala", () => {
    room.state = roomState({ phase: "results" });
    const { unmount } = render(<LocalRoom />);
    expect(screen.getAllByRole("status").map((element) => element.textContent)).toContain(
      "Atividade encerrada. Confira o resultado.",
    );
    unmount();
    room.state = roomState({ phase: "finished" });
    render(<LocalRoom />);
    expect(screen.getAllByRole("status").map((element) => element.textContent)).toContain(
      "Sala encerrada.",
    );
  });
});
