import { createServer } from "node:http";
import { afterEach, expect, it, vi } from "vitest";
import { createHelenaHandler, type HelenaProvider } from "./helena-handler";
import { createCloudflareTeacher } from "./helena-teacher";
import { createProgressiveProvider } from "./olena-student";
import { createVercelHandler } from "./vercel-adapter";
import { streamHelena } from "../data/helena-client";
import { readEventStream, readModelStream } from "../ai/event-stream";
import type { HelenaRequest } from "../ai/helena-contract";

const payload: HelenaRequest = {
  version: 1,
  capability: "tutor",
  prompt: "Explique soma",
  sources: [],
  privacy: { consent: true, retention: "none" },
};
const encoder = new TextEncoder();
const nativeFetch = globalThis.fetch;
const packet = (value: unknown) => encoder.encode(`data: ${JSON.stringify(value)}\n\n`);
const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

async function serve(provider: HelenaProvider, authenticated = true, quota = true) {
  const handler = createVercelHandler(
    "/api/helena",
    createHelenaHandler({
      allowedOrigins: ["https://olena.test"],
      identifyClient: () => (authenticated ? "test-account" : ""),
      rateLimiter: { consume: async () => quota },
      provider,
    }),
  );
  const server = createServer((request, response) => {
    void handler(request, response).catch(() => response.destroy());
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error();
  const fetcher: typeof fetch = (_input, init) =>
    nativeFetch(`http://127.0.0.1:${address.port}/api/helena`, {
      ...init,
      headers: { ...init?.headers, Origin: "https://olena.test" },
    });
  return fetcher;
}

it("delivers real incremental upstream bytes through the HTTP adapter before completion", async () => {
  let upstream: ReadableStreamDefaultController<Uint8Array> | undefined;
  const providerFetch = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
    expect(JSON.parse(String(init?.body)).stream).toBe(true);
    return new Response(
      new ReadableStream({
        start(controller) {
          upstream = controller;
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  });
  const fetcher = await serve(
    createCloudflareTeacher(
      {
        accountId: "a".repeat(32),
        token: "private",
        model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      },
      providerFetch,
    ),
  );
  const onText = vi.fn();
  const result = streamHelena(payload, { fetcher, onText });
  await vi.waitFor(() => expect(upstream).toBeDefined());
  upstream!.enqueue(packet({ response: "Olá, " }));
  await vi.waitFor(() => expect(onText).toHaveBeenCalledWith("Olá, "));
  // The provider is still open: this would fail with the old arrayBuffer adapter.
  upstream!.enqueue(packet({ response: "vamos somar." }));
  upstream!.enqueue(encoder.encode("data: [DONE]\n\n"));
  upstream!.close();
  await expect(result).resolves.toMatchObject({ answer: "Olá, vamos somar." });
});

it("aborts the provider and releases its reader when the browser disconnects", async () => {
  const cancelled = vi.fn();
  let providerSignal: AbortSignal | undefined;
  const fetcher = await serve(
    createCloudflareTeacher(
      {
        accountId: "a".repeat(32),
        token: "private",
        model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      },
      vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
        providerSignal = init?.signal ?? undefined;
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(packet({ response: "Começo" }));
            },
            cancel: cancelled,
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        );
      }),
    ),
  );
  const abort = new AbortController();
  const onText = vi.fn();
  const result = streamHelena(payload, { fetcher, onText, signal: abort.signal });
  const rejection = expect(result).rejects.toBeDefined();
  await vi.waitFor(() => expect(onText).toHaveBeenCalledWith("Começo"));
  abort.abort();
  await rejection;
  await vi.waitFor(() => expect(providerSignal?.aborted).toBe(true));
  expect(cancelled).toHaveBeenCalledOnce();
});

it("keeps authentication, quota and external error sanitization in the streaming path", async () => {
  const stream = vi.fn(async function* () {
    yield await Promise.reject(new Error("private server secret"));
  });
  const provider = { generate: vi.fn(), stream };
  for (const [authenticated, quota] of [
    [false, true],
    [true, false],
  ]) {
    await expect(
      streamHelena(payload, {
        fetcher: await serve(provider, authenticated, quota),
        onText: vi.fn(),
      }),
    ).rejects.toThrow();
  }
  expect(stream).not.toHaveBeenCalled();
  await expect(
    streamHelena(payload, { fetcher: await serve(provider), onText: vi.fn() }),
  ).rejects.toThrow("A resposta foi interrompida");
});

it("decodes fragmented UTF-8 and CRLF SSE without duplicating text", async () => {
  const bytes = encoder.encode('data: {"response":"Olá ⭐"}\r\n\r\ndata: [DONE]\r\n\r\n');
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  const text: string[] = [];
  for await (const value of readModelStream(
    new Response(body, { headers: { "Content-Type": "text/event-stream" } }),
  ))
    text.push(value);
  expect(text).toEqual(["Olá ⭐"]);
});

it.each(["data: broken\n\n", 'data: {"response":"partial"}\n\n', `data: ${"x".repeat(32001)}\n\n`])(
  "rejects malformed, incomplete or oversized streams",
  async (content) => {
    const response = new Response(content, { headers: { "Content-Type": "text/event-stream" } });
    await expect(
      (async () => {
        for await (const chunk of readModelStream(response)) {
          void chunk;
        }
      })(),
    ).rejects.toThrow();
  },
);

it("does not fall back after a partial approved-student answer or after interruption", async () => {
  const teacherStream = vi.fn(async function* () {
    yield "teacher";
  });
  const teacher = { generate: vi.fn(), stream: teacherStream };
  const student = {
    generate: vi.fn(),
    async *stream() {
      yield "partial";
      throw new Error("failed");
    },
  };
  const provider = createProgressiveProvider(teacher, student, ["tutor"]);
  const pieces: string[] = [];
  await expect(
    (async () => {
      for await (const part of provider.stream!(payload, new AbortController().signal))
        pieces.push(part);
    })(),
  ).rejects.toThrow();
  expect(pieces).toEqual(["partial"]);
  expect(teacherStream).not.toHaveBeenCalled();
});

it("ignores SSE comments and cancels an unfinished reader on early return", async () => {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(": heartbeat\n\ndata: test\n\n"));
    },
    cancel,
  });
  for await (const data of readEventStream(stream)) {
    expect(data).toBe("test");
    break;
  }
  expect(cancel).toHaveBeenCalledOnce();
});

it("accepts OpenAI-compatible content deltas without exposing reasoning", async () => {
  const response = new Response(
    'data: {"choices":[{"delta":{"reasoning_content":"private reasoning"}}]}\n\n' +
      'data: {"choices":[{"delta":{"content":"Resposta"}}]}\n\ndata: [DONE]\n\n',
    { headers: { "Content-Type": "text/event-stream" } },
  );
  const pieces: string[] = [];
  for await (const piece of readModelStream(response)) pieces.push(piece);
  expect(pieces).toEqual(["Resposta"]);
});

it("only streams evaluated student capabilities and falls back solely before text starts", async () => {
  const teacherStream = vi.fn(async function* () {
    yield "teacher";
  });
  const studentStream = vi.fn(async function* () {
    yield await Promise.reject(new Error("failed before text"));
  });
  const teacher = { generate: vi.fn(), stream: teacherStream };
  const student = { generate: vi.fn(), stream: studentStream };
  for (const capabilities of [[], ["tutor"]] as const) {
    const provider = createProgressiveProvider(teacher, student, capabilities);
    const pieces: string[] = [];
    for await (const piece of provider.stream!(payload, new AbortController().signal))
      pieces.push(piece);
    expect(pieces).toEqual(["teacher"]);
  }
  expect(studentStream).toHaveBeenCalledOnce();
  expect(teacherStream).toHaveBeenCalledTimes(2);
  const abort = new AbortController();
  abort.abort();
  const provider = createProgressiveProvider(teacher, undefined, []);
  await expect(
    provider.stream!(payload, abort.signal)[Symbol.asyncIterator]().next(),
  ).rejects.toThrow();
  expect(teacherStream).toHaveBeenCalledTimes(2);
});
