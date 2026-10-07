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

it("reabre o stream fechado do bingo, preserva cartela e fila, e cancela a tentativa ao sair", async () => {
  vi.useFakeTimers();
  const sources: {
    readyState: number;
    onerror: (() => void) | null;
    onopen: (() => void) | null;
  }[] = [];
  vi.stubGlobal(
    "EventSource",
    class {
      readyState = 0;
      onopen = null;
      onerror = null;
      close() {}
      addEventListener() {}
      constructor() {
        sources.push(this);
      }
    },
  );
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
      { id: "p", displayName: "Ana", score: 2, bingoCard: ["27"], bingoMarks: ["27"] },
    ],
    questionIndex: 0,
    questionStartedAt: Date.now(),
    totalQuestions: 75,
    answeredParticipantIds: [],
    drawnIds: ["27"],
    bingoClaimQueue: [{ id: "q", participantId: "p", claimedAt: 1 }],
  };
  sessionStorage.setItem(
    LOCAL_ROOM_SESSION_KEY,
    JSON.stringify({ role: "participant", code: "ABCDE", credential: "token" }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ state, participantId: "p", streamUrl: "/stream" })),
  );
  const { result, unmount } = renderHook(() => useLocalRoom());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  sources[0]!.readyState = 2;
  act(() => sources[0]!.onerror?.());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(sources).toHaveLength(2);
  expect(result.current.state?.participants[0]?.bingoMarks).toEqual(["27"]);
  expect(result.current.state?.bingoClaimQueue).toEqual(state.bingoClaimQueue);
  sources[1]!.readyState = 2;
  act(() => sources[1]!.onerror?.());
  unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20_000);
  });
  expect(sources).toHaveLength(2);
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

const playingState: PublicLocalRoomState = {
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

function roomResponse(body: object) {
  return new Response(JSON.stringify(body), {
    headers: { "X-Room-Server-Time": String(Date.now()) },
  });
}

function participantSession() {
  sessionStorage.setItem(
    LOCAL_ROOM_SESSION_KEY,
    JSON.stringify({ role: "participant", code: "ABCDE", credential: "token" }),
  );
}

it("reabre o stream com espera crescente quando o navegador desiste da conexão", async () => {
  vi.useFakeTimers();
  const sources: FakeStream[] = [];
  class FakeStream {
    readyState = 0;
    onopen: (() => void) | null = null;
    onerror: (() => void) | null = null;
    close = vi.fn();
    addEventListener() {}
    constructor(readonly url: string) {
      sources.push(this);
    }
  }
  vi.stubGlobal("EventSource", FakeStream);
  participantSession();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      roomResponse({
        state: playingState,
        participantId: "p1",
        streamUrl: "https://example.com/stream",
      }),
    ),
  );
  const { unmount } = renderHook(() => useLocalRoom());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(sources).toHaveLength(1);

  // Primeira queda definitiva: reabre depois de 1 s.
  sources[0]!.readyState = 2;
  act(() => sources[0]!.onerror?.());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(999);
  });
  expect(sources).toHaveLength(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(sources).toHaveLength(2);
  expect(sources[1]!.url).toBe("https://example.com/stream");

  // Cai de novo sem nunca ter aberto: a espera dobra para 2 s.
  sources[1]!.readyState = 2;
  act(() => sources[1]!.onerror?.());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1999);
  });
  expect(sources).toHaveLength(2);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(sources).toHaveLength(3);

  // Quando a conexão abre, a espera volta ao começo.
  act(() => sources[2]!.onopen?.());
  sources[2]!.readyState = 2;
  act(() => sources[2]!.onerror?.());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(sources).toHaveLength(4);
  unmount();
});

it("não reabre o stream sozinho quando o navegador ainda está reconectando", async () => {
  vi.useFakeTimers();
  const sources: { readyState: number; onerror: (() => void) | null }[] = [];
  vi.stubGlobal(
    "EventSource",
    class {
      readyState = 0;
      onopen = null;
      onerror: (() => void) | null = null;
      close() {}
      addEventListener() {}
      constructor() {
        sources.push(this);
      }
    },
  );
  participantSession();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      roomResponse({
        state: playingState,
        participantId: "p1",
        streamUrl: "https://example.com/stream",
      }),
    ),
  );
  const { unmount } = renderHook(() => useLocalRoom());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  act(() => sources[0]!.onerror?.());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(20000);
  });
  expect(sources).toHaveLength(1);
  unmount();
});

function answerHarness(
  answerBehaviour: (call: number, signal?: AbortSignal | null) => Promise<Response>,
) {
  vi.useFakeTimers();
  vi.stubGlobal(
    "EventSource",
    class {
      onopen = null;
      onerror = null;
      close() {}
      addEventListener() {}
    },
  );
  participantSession();
  const answers = { calls: 0, bodies: [] as string[] };
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const action = new URL(String(input), "https://helena.example").searchParams.get("action");
      if (action === "answer") {
        answers.calls += 1;
        answers.bodies.push(String(init?.body));
        return answerBehaviour(answers.calls, init?.signal);
      }
      return Promise.resolve(
        roomResponse({
          state: playingState,
          participantId: "p1",
          streamUrl: "https://example.com/stream",
        }),
      );
    }),
  );
  return answers;
}

it("repete a resposta uma vez, com o mesmo corpo, quando o primeiro envio passa de 6 segundos", async () => {
  const answers = answerHarness((call, signal) =>
    call === 1
      ? new Promise<Response>((_resolve, reject) =>
          signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          ),
        )
      : Promise.resolve(roomResponse({ correct: true, pointsChange: 10, state: playingState })),
  );
  const { result, unmount } = renderHook(() => useLocalRoom());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  let feedback: Awaited<ReturnType<typeof result.current.submitAnswer>>;
  await act(async () => {
    const pending = result.current.submitAnswer(0, "cat");
    await vi.advanceTimersByTimeAsync(5999);
    expect(answers.calls).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    feedback = await pending;
  });
  expect(answers.calls).toBe(2);
  expect(answers.bodies[1]).toBe(answers.bodies[0]);
  expect(feedback!).toMatchObject({ correct: true, pointsChange: 10 });
  expect(result.current.error).toBe("");
  unmount();
});

it("não repete a resposta quando o servidor a recusa", async () => {
  const answers = answerHarness(async () =>
    Response.json({ error: "O tempo desta pergunta acabou." }, { status: 409 }),
  );
  const { result, unmount } = renderHook(() => useLocalRoom());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    expect(await result.current.submitAnswer(0, "cat")).toBeUndefined();
  });
  expect(answers.calls).toBe(1);
  expect(result.current.error).toBe("O tempo desta pergunta acabou.");
  unmount();
});

it("mostra a mensagem em português quando as duas tentativas passam do prazo", async () => {
  const answers = answerHarness(
    (_call, signal) =>
      new Promise<Response>((_resolve, reject) =>
        signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
      ),
  );
  const { result, unmount } = renderHook(() => useLocalRoom());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    const pending = result.current.submitAnswer(0, "cat");
    await vi.advanceTimersByTimeAsync(12000);
    expect(await pending).toBeUndefined();
  });
  expect(answers.calls).toBe(2);
  expect(result.current.error).toBe("Não foi possível enviar a resposta.");
  unmount();
});
