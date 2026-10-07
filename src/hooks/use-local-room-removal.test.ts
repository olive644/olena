import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  LOCAL_ROOM_SESSION_KEY,
  normalizeRoomState,
  readStoredLocalRoomSession,
  useLocalRoom,
} from "./use-local-room";
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

const lobby: PublicLocalRoomState = {
  code: "ABCDE",
  phase: "lobby",
  settings: { difficulty: "mixed", questionCount: 5, roundSeconds: 30 },
  participants: [
    { id: "p1", displayName: "Ana", score: 0 },
    { id: "p2", displayName: "Bia", score: 0 },
  ],
  questionIndex: 0,
  questionStartedAt: 0,
  totalQuestions: 0,
  answeredParticipantIds: [],
  revision: 1,
};

it("o estado vindo do Firebase preserva a entrada fechada e a lista de removidos", () => {
  const normalized = normalizeRoomState({
    ...lobby,
    locked: true,
    removedParticipantIds: ["p2"],
  });
  expect(normalized.locked).toBe(true);
  expect(normalized.removedParticipantIds).toEqual(["p2"]);
  expect(normalizeRoomState(lobby)).not.toHaveProperty("locked");
});

it("quem foi removido pelo anfitrião volta à tela inicial com a explicação e sem sessão salva", async () => {
  vi.useFakeTimers();
  let onPut: ((event: MessageEvent<string>) => void) | undefined;
  vi.stubGlobal(
    "EventSource",
    class {
      onopen = null;
      onerror = null;
      close() {}
      addEventListener(name: string, callback: (event: MessageEvent<string>) => void) {
        if (name === "put") onPut = callback;
      }
    },
  );
  sessionStorage.setItem(
    LOCAL_ROOM_SESSION_KEY,
    JSON.stringify({ role: "participant", code: "ABCDE", credential: "token-p1" }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ state: lobby, participantId: "p1", streamUrl: "https://example.com/s" }),
          { headers: { "X-Room-Server-Time": String(Date.now()) } },
        ),
    ),
  );
  const { result, unmount } = renderHook(() => useLocalRoom());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.state?.code).toBe("ABCDE");

  // Remover outra pessoa não tira ninguém da sala.
  act(() =>
    onPut?.(
      new MessageEvent("put", {
        data: JSON.stringify({
          path: "/",
          data: { ...lobby, revision: 2, removedParticipantIds: ["p2"] },
        }),
      }),
    ),
  );
  expect(result.current.state).toBeDefined();

  act(() =>
    onPut?.(
      new MessageEvent("put", {
        data: JSON.stringify({
          path: "/",
          data: { ...lobby, revision: 3, removedParticipantIds: ["p1"] },
        }),
      }),
    ),
  );
  expect(result.current.state).toBeUndefined();
  expect(result.current.role).toBe("choose");
  expect(result.current.error).toBe("O anfitrião removeu você desta sala.");
  expect(readStoredLocalRoomSession()).toBeUndefined();
  unmount();
});
