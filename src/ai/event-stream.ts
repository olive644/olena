/** Bounded SSE decoding, including UTF-8 and event boundaries split across packets. */
export async function* readEventStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let bytes = 0;
  const abort = () => void reader.cancel().catch(() => {});
  signal?.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const packet = await reader.read();
      signal?.throwIfAborted();
      bytes += packet.value?.byteLength ?? 0;
      if (bytes > 512_000) throw new Error("Stream too large");
      buffer += packet.done ? decoder.decode() : decoder.decode(packet.value, { stream: true });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (frame.length > 32_000) throw new Error("Event too large");
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");
        if (data) yield data;
      }
      if (buffer.length > 32_000) throw new Error("Event too large");
      if (packet.done) {
        if (buffer.trim()) throw new Error("Truncated event");
        return;
      }
    }
  } finally {
    signal?.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Cloudflare native SSE and OpenAI-compatible text deltas only, never reasoning. */
export async function* readModelStream(response: Response, signal?: AbortSignal) {
  if (
    !response.ok ||
    !response.body ||
    !response.headers.get("Content-Type")?.includes("text/event-stream")
  ) {
    await response.body?.cancel();
    throw new Error("Streaming provider unavailable");
  }
  let length = 0;
  for await (const data of readEventStream(response.body, signal)) {
    if (data === "[DONE]") {
      if (!length) throw new Error("Empty model stream");
      return;
    }
    const value: unknown = JSON.parse(data);
    if (
      !value ||
      typeof value !== "object" ||
      "error" in value ||
      ("success" in value && value.success === false)
    )
      throw new Error("Invalid model event");
    let delta: unknown;
    if ("response" in value) delta = value.response;
    else if ("choices" in value && Array.isArray(value.choices)) {
      const choice: unknown = value.choices[0];
      if (choice && typeof choice === "object" && "delta" in choice) {
        const chunk = choice.delta;
        if (chunk && typeof chunk === "object" && "content" in chunk) delta = chunk.content;
      }
    }
    if (delta === undefined || delta === null || delta === "") continue;
    if (typeof delta !== "string" || (length += delta.length) > 12_000)
      throw new Error("Invalid model delta");
    yield delta;
  }
  throw new Error("Model stream ended without completion");
}
