import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LOCAL_ROOM_SESSION_KEY, useLocalRoom } from "./use-local-room";
import type { PublicLocalRoomState } from "../domain/local-room";

vi.mock("../data/firebase-account", () => ({
  getFirebaseAccountServices: async () => ({ auth: { currentUser: null } }),
}));
vi.mock("../data/room-app-check", () => ({ roomAppCheckToken: async () => undefined }));

afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("API válida limpa reconectando e recupera a pergunta em um segundo com stream interrompido", async () => {
  vi.useFakeTimers();
  const state: PublicLocalRoomState = {
    code: "ABCDE",
    phase: "playing",
    settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 30 },
    participants: [{ id: "p1", displayName: "Ana", score: 0 }],
    questionIndex: 0,
    questionStartedAt: Date.now(),
    totalQuestions: 5,
    answeredParticipantIds: [],
    revision: 1,
  };
  let onError: (() => void) | undefined;
  vi.stubGlobal(
    "EventSource",
    class {
      onopen = null;
      set onerror(callback: () => void) {
        onError = callback;
      }
      close() {}
      addEventListener() {}
    },
  );
  sessionStorage.setItem(
    LOCAL_ROOM_SESSION_KEY,
    JSON.stringify({ role: "participant", code: "ABCDE", credential: "token" }),
  );
  let responseState = state;
  const fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          state: responseState,
          participantId: "p1",
          streamUrl: "https://example.com/stream",
        }),
        { headers: { "X-Room-Server-Time": String(Date.now()) } },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { result, unmount } = renderHook(() => useLocalRoom());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state?.questionIndex).toBe(0);
  act(() => onError?.());
  expect(result.current.connectionStatus).toBe("reconnecting");
  responseState = { ...state, questionIndex: 1, questionStartedAt: Date.now() + 1000, revision: 2 };
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(result.current.state?.questionIndex).toBe(1);
  expect(result.current.connectionStatus).toBe("online");
  expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  unmount();
});

it("restaura organizador participante sem expor controles durante a rodada", async () => {
  vi.useFakeTimers();
  sessionStorage.setItem(
    LOCAL_ROOM_SESSION_KEY,
    JSON.stringify({ role: "host", code: "ABCDE", credential: "host-token", participating: true }),
  );
  vi.stubGlobal(
    "EventSource",
    class {
      onopen = null;
      onerror = null;
      close() {}
      addEventListener() {}
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            state: {
              code: "ABCDE",
              phase: "playing",
              settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 30 },
              participants: [{ id: "host-player", displayName: "Oli", score: 0 }],
              questionIndex: 0,
              questionStartedAt: Date.now(),
              totalQuestions: 5,
              answeredParticipantIds: [],
            },
            participantId: "host-player",
            participantToken: "player-token",
            streamUrl: "https://example.com/stream",
          }),
        ),
    ),
  );
  const { result, unmount } = renderHook(() => useLocalRoom());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.role).toBe("host");
  expect(result.current.isOrganizer).toBe(true);
  expect(result.current.isHost).toBe(false);
  expect(result.current.participantId).toBe("host-player");
  expect(result.current.speechCredential()).toBe("player-token");
  expect(result.current.organizerCredential()).toBe("host-token");
  unmount();
});
