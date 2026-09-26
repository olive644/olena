import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useNotebookCollaboration } from "./use-notebook-collaboration";
import { createNotebookCollabHandler } from "../backend/notebook-collab-handler";
import { createMemoryRoomStore } from "../backend/room-transaction";
import type { HandwritingDocument } from "../domain/handwriting";

vi.mock("../data/room-app-check", () => ({ roomAppCheckToken: async () => undefined }));
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

it("publica com o código criado pelo servidor e permite ao segundo participante receber a folha", async () => {
  const listeners = new Set<(event: MessageEvent<string>) => void>();
  const handler = createNotebookCollabHandler({
    store: createMemoryRoomStore(),
    randomCode: () => "ABCDE",
    publish: async (_code, state) => {
      for (const listener of listeners)
        listener(new MessageEvent("put", { data: JSON.stringify({ path: "/", data: state }) }));
    },
    streamUrl: () => "https://stream.example/ABCDE",
  });
  vi.stubGlobal(
    "EventSource",
    class {
      listener?: (event: MessageEvent<string>) => void;
      close() {
        if (this.listener) listeners.delete(this.listener);
      }
      addEventListener(_type: string, listener: (event: MessageEvent<string>) => void) {
        this.listener = listener;
        listeners.add(listener);
      }
    },
  );
  const requests: { action: string; code?: string }[] = [];
  let delayLeave = false;
  let finishLeave: (() => void) | undefined;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const action = new URL(url, "https://test.example").searchParams.get("action")!;
    const body = JSON.parse(init.body as string) as { code?: string };
    requests.push({ action, ...body });
    if (action === "leave" && delayLeave)
      await new Promise<void>((resolve) => {
        finishLeave = resolve;
      });
    return handler(new Request(new URL(url, "https://test.example"), init));
  });
  const host = renderHook(() => useNotebookCollaboration({ notebookId: "page-a" }));
  const remote = vi.fn();
  const guest = renderHook(() =>
    useNotebookCollaboration({ notebookId: "page-b", onRemoteDocument: remote }),
  );
  const document: HandwritingDocument = {
    version: 1,
    paper: "ruled",
    strokes: [],
    pageText: "Questão 1",
  };
  await act(async () => {
    expect(await host.result.current.create("Alice", document)).toBe(true);
  });
  expect(host.result.current.state.room?.document).toEqual(document);
  expect(requests.filter((request) => request.action === "update")).toHaveLength(0);
  await act(async () => {
    expect(await guest.result.current.join("ABCDE", "Bob")).toBe(true);
  });
  await waitFor(() => expect(remote).toHaveBeenCalledWith(document));
  expect(guest.result.current.activity).toBe("");
  act(() => {
    host.result.current.publish({ ...document, pageText: "Questão revisada" }, "editou o caderno");
  });
  await waitFor(() => expect(guest.result.current.activity).toBe("Alice editou o caderno"));
  act(() => {
    guest.result.current.publish({
      ...document,
      pageText: "Questão revisada",
      strokes: [
        {
          id: "bob-stroke",
          tool: "pen",
          width: 2,
          color: "#17151c",
          points: [{ x: 1, y: 2, pressure: 0.5 }],
        },
      ],
    });
  });
  await waitFor(() => {
    expect(host.result.current.state.room?.document?.pageText).toBe("Questão revisada");
    expect(host.result.current.state.room?.document?.strokes).toHaveLength(1);
    expect(guest.result.current.state.room?.document).toEqual(
      host.result.current.state.room?.document,
    );
  });
  expect(requests.filter((item) => item.action === "update").length).toBeLessThanOrEqual(5);
  delayLeave = true;
  act(() => guest.result.current.leave());
  expect(guest.result.current.state.status).toBe("idle");
  await waitFor(() => expect(finishLeave).toBeTypeOf("function"));
  finishLeave?.();
  host.unmount();
  guest.unmount();
});

it("mostra o cursor do colega vindo do canal leve e o esconde quando fica parado", async () => {
  const sources = new Set<Map<string, (event: MessageEvent<string>) => void>>();
  const emit = (type: string, path: string, data: unknown) => {
    for (const source of sources) {
      source.get(type)?.(new MessageEvent(type, { data: JSON.stringify({ path, data }) }));
    }
  };
  const cursorWrites: { participantId: string; cursor: unknown }[] = [];
  const handler = createNotebookCollabHandler({
    store: createMemoryRoomStore(),
    randomCode: () => "ABCDE",
    publish: async (_code, state) => emit("put", "/", state),
    publishCursor: async (_code, participantId, cursor) => {
      cursorWrites.push({ participantId, cursor });
      emit("put", `/cursors/${participantId}`, cursor);
    },
    streamUrl: () => "https://stream.example/ABCDE",
  });
  vi.stubGlobal(
    "EventSource",
    class {
      handlers = new Map<string, (event: MessageEvent<string>) => void>();
      constructor() {
        sources.add(this.handlers);
      }
      close() {
        sources.delete(this.handlers);
      }
      addEventListener(type: string, listener: (event: MessageEvent<string>) => void) {
        this.handlers.set(type, listener);
      }
    },
  );
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) =>
    handler(new Request(new URL(url, "https://test.example"), init)),
  );

  const host = renderHook(() => useNotebookCollaboration({ notebookId: "page-a" }));
  const guest = renderHook(() => useNotebookCollaboration({ notebookId: "page-b" }));
  await act(async () => {
    await host.result.current.create("Alice");
  });
  await act(async () => {
    await guest.result.current.join("ABCDE", "Bob");
  });
  await waitFor(() => expect(host.result.current.state.room?.participants).toHaveLength(2));

  // Sozinho na folha ninguém recebe cursor: com colega, a posição sai.
  act(() => host.result.current.sendCursor(100, 200));
  await waitFor(() => expect(cursorWrites.length).toBeGreaterThan(0));
  const written = cursorWrites.at(-1)!;
  expect(written.cursor).toMatchObject({ x: 100, y: 200 });

  // O colega vê o cursor com o nome de quem escreve, e não vê o próprio.
  await waitFor(() =>
    expect(guest.result.current.cursors).toEqual([
      expect.objectContaining({ displayName: "Alice", x: 100, y: 200 }),
    ]),
  );
  expect(host.result.current.cursors.every((item) => item.displayName !== "Alice")).toBe(true);

  // Sem novas posições por mais de cinco segundos, o cursor some.
  const realNow = performance.now.bind(performance);
  vi.spyOn(performance, "now").mockImplementation(() => realNow() + 6_000);
  await waitFor(() => expect(guest.result.current.cursors).toEqual([]), { timeout: 3_000 });
  vi.restoreAllMocks();
});
