import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_ROOM_SESSION_KEY,
  normalizeRoomState,
  readStoredLocalRoomSession,
  useLocalRoom,
} from "./use-local-room";
import type { PublicLocalRoomState } from "../domain/local-room";
import { getFirebaseAccountServices } from "../data/firebase-account";

vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));

beforeEach(() => {
  // Sem conta logada por padrão: o comportamento de convidado (sem Authorization) continua
  // sendo o caminho exercitado pelos testes que não mexem nisso.
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: null },
  } as never);
});

describe("normalizeRoomState", () => {
  it("rejeita dados de participantes inválidos", () => {
    expect(() =>
      normalizeRoomState({
        code: "ABCDE",
        phase: "lobby",
        settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 30 },
        participants: [{ id: "p", displayName: "Ana", score: Number.NaN }],
      }),
    ).toThrow("dados inválidos");
  });
  it("rejeita configurações de áudio inválidas", () => {
    expect(() =>
      normalizeRoomState({
        code: "ABCDE",
        phase: "lobby",
        settings: {
          difficulty: "mixed",
          questionCount: 5,
          roundSeconds: 30,
          audioRate: 2 as 1,
        },
        participants: [],
      }),
    ).toThrow("dados inválidos");
  });
  it("continua lendo a velocidade salva por uma versão antiga", () => {
    const state = normalizeRoomState({
      code: "ABCDE",
      phase: "lobby",
      settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 30, audioRate: 0.75 },
      participants: [],
    });
    expect(state.settings.audioRate).toBe(0.75);
  });
  it("preenche arrays que o Firebase omite quando estão vazios", () => {
    const raw = {
      code: "ABCDE",
      phase: "lobby",
      settings: { difficulty: "mixed", questionCount: 10, roundSeconds: 30 },
      questionIndex: 0,
      questionStartedAt: 1000,
      totalQuestions: 0,
      // participants e answeredParticipantIds ausentes de propósito, como o
      // Realtime Database realmente envia quando o array está vazio.
    } as const;
    expect(normalizeRoomState(raw)).toEqual({
      code: "ABCDE",
      phase: "lobby",
      settings: { difficulty: "mixed", questionCount: 10, roundSeconds: 30 },
      participants: [],
      questionIndex: 0,
      questionStartedAt: 1000,
      totalQuestions: 0,
      answeredParticipantIds: [],
    });
  });

  it("preserva os valores quando já vêm preenchidos", () => {
    const raw: PublicLocalRoomState = {
      code: "ABCDE",
      phase: "playing",
      settings: { difficulty: "hard", questionCount: 5, roundSeconds: 15 },
      participants: [{ id: "p1", displayName: "Ana", score: 2 }],
      questionIndex: 1,
      questionStartedAt: 2000,
      feedbackUntil: 5000,
      totalQuestions: 5,
      answeredParticipantIds: ["p1"],
      currentQuestion: { id: "c1", front: "hello" },
    };
    expect(normalizeRoomState(raw)).toEqual(raw);
  });
});

describe("sessão temporária da sala", () => {
  it("preserva a sessão quando App Check recusa temporariamente a reconexão", async () => {
    const session = { role: "participant", code: "ABCDE", credential: "private-token" };
    window.sessionStorage.setItem(LOCAL_ROOM_SESSION_KEY, JSON.stringify(session));
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Recarregue para verificar o dispositivo" }, { status: 403 }),
        ),
    );
    const { result, unmount } = renderHook(() => useLocalRoom());
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    expect(readStoredLocalRoomSession()).toEqual(session);
    unmount();
  });
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("recupera uma credencial válida da aba atual", () => {
    const storage = {
      getItem: (key: string) =>
        key === LOCAL_ROOM_SESSION_KEY
          ? JSON.stringify({ role: "participant", code: "ab-c de", credential: "p1" })
          : null,
    };
    expect(readStoredLocalRoomSession(storage)).toEqual({
      role: "participant",
      code: "ABCDE",
      credential: "p1",
    });
  });

  it("ignora conteúdo inválido ou corrompido", () => {
    expect(readStoredLocalRoomSession({ getItem: () => "não é json" })).toBeUndefined();
    expect(
      readStoredLocalRoomSession({
        getItem: () => JSON.stringify({ role: "host", code: "123", credential: "token" }),
      }),
    ).toBeUndefined();
  });

  it("retoma automaticamente a sala salva e reconecta ao Firebase", async () => {
    const serverTime = Date.now() + 10_000;
    window.sessionStorage.setItem(
      LOCAL_ROOM_SESSION_KEY,
      JSON.stringify({ role: "participant", code: "ABCDE", credential: "p1" }),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          state: {
            code: "ABCDE",
            phase: "playing",
            settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 30 },
            participants: [{ id: "p1", displayName: "Ana", score: 10 }],
            questionIndex: 1,
            questionStartedAt: 2_000,
            totalQuestions: 5,
            answeredParticipantIds: [],
            currentQuestion: { id: "c2", front: "world" },
          },
          streamUrl: "https://firebase.example/rooms/ABCDE.json",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Room-Server-Time": String(serverTime),
          },
        },
      ),
    );
    const eventSourceConstructor = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "EventSource",
      class {
        onopen = null;
        onerror = null;
        close = vi.fn();
        addEventListener = vi.fn();

        constructor(url: string) {
          eventSourceConstructor(url);
        }
      },
    );

    const { result } = renderHook(() => useLocalRoom());
    expect(result.current.isRestoring).toBe(true);
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(result.current.role).toBe("participant");
    expect(result.current.state?.phase).toBe("playing");
    expect(Math.abs(result.current.serverNow() - Date.now() - 10_000)).toBeLessThan(1_000);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/local-room?action=resume",
      expect.objectContaining({ method: "POST" }),
    );
    expect(eventSourceConstructor).toHaveBeenCalledWith(
      "https://firebase.example/rooms/ABCDE.json",
    );
  });

  it("mostra uma mensagem em português quando o próprio fetch falha, em vez do texto nativo em inglês", async () => {
    // Erro nativo do navegador (timeout do AbortController, "Failed to fetch" sem rede): não
    // vem traduzido, então não pode ser mostrado direto na tela.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));

    const { result } = renderHook(() => useLocalRoom());
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await act(async () =>
      result.current.createRoom({ difficulty: "mixed", questionCount: 5, roundSeconds: 30 }),
    );

    expect(result.current.error).toBe("Não foi possível criar a sala.");
  });

  it("envia o token da conta logada junto do pedido, para o servidor poder impedir entrar duas vezes na sala", async () => {
    vi.mocked(getFirebaseAccountServices).mockResolvedValue({
      auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue("id-token-da-ana") } },
    } as never);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "ABCDE",
          hostToken: "host-1",
          state: {
            code: "ABCDE",
            phase: "lobby",
            settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 30 },
            participants: [],
          },
          streamUrl: "https://firebase.example/rooms/ABCDE.json",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "EventSource",
      class {
        onopen = null;
        onerror = null;
        close = vi.fn();
        addEventListener = vi.fn();
        constructor() {
          /* não importa para este teste */
        }
      },
    );

    const { result } = renderHook(() => useLocalRoom());
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await act(async () =>
      result.current.createRoom({ difficulty: "mixed", questionCount: 5, roundSeconds: 30 }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/local-room?action=create",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer id-token-da-ana" }),
      }),
    );
  });

  it("não manda Authorization quando ninguém está logado (convidado continua funcionando)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "ABCDE",
          hostToken: "host-1",
          state: {
            code: "ABCDE",
            phase: "lobby",
            settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 30 },
            participants: [],
          },
          streamUrl: "https://firebase.example/rooms/ABCDE.json",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "EventSource",
      class {
        onopen = null;
        onerror = null;
        close = vi.fn();
        addEventListener = vi.fn();
        constructor() {
          /* não importa para este teste */
        }
      },
    );

    const { result } = renderHook(() => useLocalRoom());
    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    await act(async () =>
      result.current.createRoom({ difficulty: "mixed", questionCount: 5, roundSeconds: 30 }),
    );

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });
});
