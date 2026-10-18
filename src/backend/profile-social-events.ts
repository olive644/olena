import type { HandleIdentity } from "./profile-handle-handler.js";

export function createProfileSocialEvents(options: {
  identify(request: Request): Promise<HandleIdentity | undefined>;
  allowedOrigins: string[];
  consume(uid: string): Promise<boolean>;
  watch(uid: string, signal: AbortSignal): AsyncGenerator<void>;
}) {
  return async (request: Request): Promise<Response> => {
    const error = (status: number) =>
      Response.json(
        { error: "Não foi possível conectar os avisos." },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    if (request.method !== "GET") return error(405);
    const url = new URL(request.url);
    if (
      url.searchParams.get("stream") !== "1" ||
      url.searchParams.getAll("stream").length !== 1 ||
      [...url.searchParams.keys()].some((key) => key !== "stream")
    )
      return error(400);
    const origin =
      request.headers.get("origin") ||
      (request.headers.get("sec-fetch-site") === "same-origin" ? url.origin : "");
    if (!options.allowedOrigins.includes(origin)) return error(403);
    try {
      const account = await options.identify(request);
      if (!account || account.anonymous) return error(401);
      if (!(await options.consume(account.uid))) return error(429);
      const abort = new AbortController();
      const signal = AbortSignal.any([request.signal, abort.signal, AbortSignal.timeout(40000)]);
      const iterator = options.watch(account.uid, signal);
      const encoder = new TextEncoder();
      let ready = false;
      return new Response(
        new ReadableStream<Uint8Array>(
          {
            async pull(controller) {
              try {
                signal.throwIfAborted();
                if (!ready) {
                  ready = true;
                  controller.enqueue(encoder.encode('data: {"type":"ready"}\n\n'));
                  return;
                }
                const next = await iterator.next();
                if (next.done || signal.aborted) {
                  controller.close();
                  return;
                }
                controller.enqueue(encoder.encode('data: {"type":"changed"}\n\n'));
              } catch {
                abort.abort();
                controller.close();
              }
            },
            cancel() {
              abort.abort();
              void iterator.return(undefined).catch(() => {});
            },
          },
          { highWaterMark: 0 },
        ),
        {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            "X-Accel-Buffering": "no",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
          },
        },
      );
    } catch {
      return error(503);
    }
  };
}
