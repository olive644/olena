import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_ROOM_SESSION_KEY,
  normalizeRoomState,
  readStoredLocalRoomSession,
  useLocalRoom,
} from "./use-local-room";
import type { PublicLocalRoomState } from "../domain/local-room";

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
        { status: 200, headers: { "Content-Type": "application/json" } },
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
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/local-room?action=resume",
      expect.objectContaining({ method: "POST" }),
    );
    expect(eventSourceConstructor).toHaveBeenCalledWith(
      "https://firebase.example/rooms/ABCDE.json",
    );
  });
});
