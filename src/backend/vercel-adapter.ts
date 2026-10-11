import type { IncomingMessage, ServerResponse } from "node:http";

export type VercelRequest = IncomingMessage & { body?: unknown };

async function readBody(request: VercelRequest): Promise<string | undefined> {
  if (request.body !== undefined) {
    return typeof request.body === "string" ? request.body : JSON.stringify(request.body);
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
  }
  return chunks.length === 0 ? undefined : Buffer.concat(chunks).toString("utf8");
}

async function toWebRequest(
  request: VercelRequest,
  defaultPath: string,
  signal?: AbortSignal,
): Promise<Request> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  const protocol = headers.get("x-forwarded-proto") ?? "https";
  const host = headers.get("host") ?? "localhost";
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await readBody(request);
  return new Request(`${protocol}://${host}${request.url ?? defaultPath}`, {
    method: request.method ?? "GET",
    headers,
    ...(signal ? { signal } : {}),
    ...(body === undefined ? {} : { body }),
  });
}

export function createVercelHandler(
  defaultPath: string,
  handler: (request: Request) => Promise<Response>,
) {
  return async function vercelHandler(
    request: Request | VercelRequest,
    response?: ServerResponse,
  ): Promise<Response | void> {
    if (request instanceof Request) return handler(request);

    const abort = new AbortController();
    const disconnected = () => {
      if (!response?.writableEnded) abort.abort();
    };
    response?.once("close", disconnected);
    try {
      const result = await handler(await toWebRequest(request, defaultPath, abort.signal));
      if (!response) return result;
      response.statusCode = result.status;
      result.headers.forEach((value, name) => {
        if (name.toLowerCase() === "set-cookie") return;
        response.setHeader(name, value);
      });
      const setCookies =
        typeof (result.headers as { getSetCookie?: () => string[] }).getSetCookie === "function"
          ? (result.headers as unknown as { getSetCookie(): string[] }).getSetCookie()
          : result.headers.get("set-cookie")?.split(", ");
      if (setCookies?.length) response.setHeader("Set-Cookie", setCookies);
      if (result.headers.get("Content-Type")?.startsWith("text/event-stream") && result.body) {
        response.flushHeaders();
        const reader = result.body.getReader();
        const cancel = () => void reader.cancel().catch(() => {});
        abort.signal.addEventListener("abort", cancel, { once: true });
        try {
          while (!abort.signal.aborted) {
            const packet = await reader.read();
            if (packet.done || abort.signal.aborted) break;
            if (!response.write(Buffer.from(packet.value))) {
              await new Promise<void>((resolve) => {
                const ready = () => {
                  response.removeListener("drain", ready);
                  response.removeListener("close", ready);
                  resolve();
                };
                response.once("drain", ready);
                response.once("close", ready);
                if (response.destroyed) ready();
              });
            }
          }
          if (!response.destroyed) response.end();
        } finally {
          abort.signal.removeEventListener("abort", cancel);
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      } else response.end(Buffer.from(await result.arrayBuffer()));
    } finally {
      response?.removeListener("close", disconnected);
    }
  };
}
