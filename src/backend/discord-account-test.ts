export type DiscordAccountTestCode =
  | "discord-log-public"
  | "discord-log-extra-viewer"
  | "discord-log-bot-access"
  | "discord-log-destination"
  | "discord-token-invalid"
  | "discord-channel-access"
  | "discord-send-denied"
  | "discord-rate-limit"
  | "discord-unavailable"
  | "discord-invalid-response";

export class DiscordAccountTestError extends Error {
  constructor(
    readonly code: DiscordAccountTestCode,
    readonly target?: "category" | "channel",
  ) {
    super(code);
  }
}

type Dependencies = {
  ownerEmail: string;
  allowedOrigins: readonly string[];
  enabled: () => boolean;
  identify: (
    request: Request,
  ) => Promise<
    { uid: string; email?: string; emailVerified: boolean; anonymous: boolean } | undefined
  >;
  consume: (request: Request, uid?: string) => Promise<boolean>;
  send: () => Promise<string>;
};

export function createDiscordAccountTestHandler(deps: Dependencies) {
  const reply = (status: number, body: unknown) =>
    Response.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  return async (request: Request): Promise<Response> => {
    if (!["GET", "POST"].includes(request.method)) return reply(405, { error: "method" });
    const origin = request.headers.get("origin");
    if (
      (request.method === "POST" || origin !== null) &&
      !deps.allowedOrigins.includes(origin ?? "")
    )
      return reply(403, { error: "origin" });
    try {
      if (!(await deps.consume(request))) return reply(429, { error: "quota" });
      const identity = await deps.identify(request);
      if (!identity) return reply(401, { error: "auth" });
      if (
        !deps.ownerEmail.trim() ||
        identity.anonymous ||
        !identity.emailVerified ||
        identity.email?.trim().toLowerCase() !== deps.ownerEmail.trim().toLowerCase()
      )
        return reply(403, { error: "owner" });
      if (request.method === "GET") return reply(200, { enabled: deps.enabled() });
      if (!deps.enabled()) return reply(503, { error: "disabled" });
      const raw = await request.text();
      if (raw.length > 256) return reply(413, { error: "body" });
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        return reply(400, { error: "body" });
      }
      if (
        !body ||
        typeof body !== "object" ||
        !("confirm" in body) ||
        body.confirm !== true ||
        Object.keys(body).length !== 1
      )
        return reply(400, { error: "body" });
      if (!(await deps.consume(request, identity.uid))) return reply(429, { error: "quota" });
      const messageId = await deps.send();
      if (!/^\d{17,22}$/.test(messageId))
        throw new DiscordAccountTestError("discord-invalid-response");
      return reply(200, { messageId });
    } catch (cause) {
      return cause instanceof DiscordAccountTestError
        ? reply(503, { error: cause.code, ...(cause.target ? { target: cause.target } : {}) })
        : reply(503, { error: "unavailable" });
    }
  };
}
