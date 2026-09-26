import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  NOTEBOOK_COLLAB_PENDING_KEY,
  NOTEBOOK_COLLAB_SESSION_KEY,
  useNotebookCollaboration,
} from "./use-notebook-collaboration";
import { createNotebookCollabHandler } from "../backend/notebook-collab-handler";
import { createMemoryRoomStore } from "../backend/room-transaction";
import type { HandwritingDocument } from "../domain/handwriting";

vi.mock("../data/room-app-check", () => ({ roomAppCheckToken: async () => undefined }));

function documentWith(...ids: string[]): HandwritingDocument {
  return {
    version: 1,
    paper: "ruled",
    strokes: ids.map((id, index) => ({
      id,
      tool: "pen" as const,
      brush: "fine" as const,
      color: "#17151c",
      width: 4,
      points: Array.from({ length: 4 }, (_, point) => ({
        x: 100 + point * 30,
        y: 200 + index * 40,
        pressure: 0.5,
      })),
    })),
    stickies: [],
  } as unknown as HandwritingDocument;
}

function strokeIds(document: HandwritingDocument | undefined): string[] {
  return (document?.strokes ?? []).map((stroke) => stroke.id).sort();
}

let network = true;

function setup() {
  const store = createMemoryRoomStore();
  const handler = createNotebookCollabHandler({
    store,
    randomCode: () => "ABCDE",
    publish: async () => {},
    streamUrl: () => "https://stream.example/ABCDE",
  });
  vi.stubGlobal(
    "EventSource",
    class {
      close() {}
      addEventListener() {}
    },
  );
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (!network) throw new TypeError("Failed to fetch");
    return handler(new Request(new URL(url, "https://test.example"), init));
  });
  return { store, handler };
}

beforeEach(() => {
  network = true;
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function startRoom(initial: HandwritingDocument) {
  const host = renderHook(() => useNotebookCollaboration({ notebookId: "page-a" }));
  await act(async () => {
    await host.result.current.create("Alice", initial);
  });
  await waitFor(() => expect(host.result.current.state.status).toBe("online"));
  return host;
}

it("sem conexão, a alteração fica na fila e no aparelho, com aviso, e sai quando a internet volta", async () => {
  setup();
  const host = await startRoom(documentWith("a"));

  network = false;
  act(() => host.result.current.publish(documentWith("a", "b"), "editou"));
  await waitFor(() => expect(host.result.current.state.status).toBe("offline"));
  expect(host.result.current.state.error).toBe("");
  expect(host.result.current.hasPending).toBe(true);
  expect(host.result.current.notice).toContain("Sem conexão");
  const stored = JSON.parse(localStorage.getItem(NOTEBOOK_COLLAB_PENDING_KEY) ?? "null");
  expect(strokeIds(stored.document)).toEqual(["a", "b"]);

  network = true;
  act(() => window.dispatchEvent(new Event("online")));
  await waitFor(() => expect(host.result.current.hasPending).toBe(false));
  expect(localStorage.getItem(NOTEBOOK_COLLAB_PENDING_KEY)).toBeNull();
  expect(host.result.current.state.status).toBe("online");
  expect(strokeIds(host.result.current.state.room?.document)).toEqual(["a", "b"]);
});

it("recusas do servidor continuam sendo erro, não modo offline", async () => {
  setup();
  const host = await startRoom(documentWith("a"));
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(JSON.stringify({ error: "Você não está neste caderno." }), { status: 403 }),
  );
  act(() => host.result.current.publish(documentWith("a", "b")));
  await waitFor(() => expect(host.result.current.state.status).toBe("error"));
  expect(host.result.current.state.error).toContain("não está");
});

it("uma recarga sem conexão não perde o que foi escrito: junta com o que os colegas fizeram", async () => {
  setup();
  const host = await startRoom(documentWith("a"));
  const hostSession = sessionStorage.getItem(NOTEBOOK_COLLAB_SESSION_KEY)!;
  const guest = renderHook(() => useNotebookCollaboration({ notebookId: "page-b" }));
  await act(async () => {
    await guest.result.current.join("ABCDE", "Bob");
  });
  await waitFor(() => expect(guest.result.current.state.status).toBe("online"));

  // A anfitriã escreve "mine" sem internet e a aba é recarregada.
  network = false;
  act(() => host.result.current.publish(documentWith("a", "mine")));
  await waitFor(() => expect(host.result.current.hasPending).toBe(true));
  // O colega é outro aparelho, com o próprio armazenamento: guarda a fila daqui e a devolve depois.
  const savedQueue = localStorage.getItem(NOTEBOOK_COLLAB_PENDING_KEY)!;
  host.unmount();

  // Enquanto isso o colega escreve "theirs" e o servidor guarda.
  network = true;
  act(() => guest.result.current.publish(documentWith("a", "theirs")));
  await waitFor(() =>
    expect(strokeIds(guest.result.current.state.room?.document)).toEqual(["a", "theirs"]),
  );
  localStorage.setItem(NOTEBOOK_COLLAB_PENDING_KEY, savedQueue);
  sessionStorage.setItem(NOTEBOOK_COLLAB_SESSION_KEY, hostSession);

  // A aba volta com internet: a sessão da aba retoma e a fila guardada é reenviada.
  network = true;
  const onRemote = vi.fn();
  const reopened = renderHook(() =>
    useNotebookCollaboration({ notebookId: "page-a", onRemoteDocument: onRemote }),
  );
  await waitFor(() => expect(reopened.result.current.state.status).toBe("online"));
  await waitFor(() =>
    expect(strokeIds(reopened.result.current.state.room?.document)).toEqual([
      "a",
      "mine",
      "theirs",
    ]),
  );
  const shown = onRemote.mock.calls.at(-1)?.[0] as HandwritingDocument;
  expect(strokeIds(shown)).toEqual(["a", "mine", "theirs"]);
  await waitFor(() => expect(localStorage.getItem(NOTEBOOK_COLLAB_PENDING_KEY)).toBeNull());
});

it("sair do caderno descarta a fila guardada", async () => {
  setup();
  const host = await startRoom(documentWith("a"));
  network = false;
  act(() => host.result.current.publish(documentWith("a", "b")));
  await waitFor(() => expect(localStorage.getItem(NOTEBOOK_COLLAB_PENDING_KEY)).not.toBeNull());
  network = true;
  act(() => host.result.current.leave());
  expect(localStorage.getItem(NOTEBOOK_COLLAB_PENDING_KEY)).toBeNull();
  expect(host.result.current.hasPending).toBe(false);
});
