import { profileCompletion } from "../domain/profile-completion.js";

export function createProfileCompletionHandler(options: {
  allowedOrigins: string[];
  identify(request: Request): Promise<{ uid: string; anonymous: boolean } | undefined>;
  consume(uid: string): Promise<boolean>;
  read(uid: string): Promise<{ profile: unknown; username: unknown }>;
}) {
  return async (request: Request) => {
    const reply = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Olena-API-Version": "1",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
          ...(status === 405 ? { Allow: "GET" } : {}),
        },
      });
    if (request.method !== "GET") return reply(405, { error: "Use GET." });
    const query = new URL(request.url).searchParams;
    if (
      query.get("action") !== "profile-completion" ||
      [...query.keys()].some((key) => !["action", "version"].includes(key)) ||
      query.getAll("action").length !== 1 ||
      query.getAll("version").length > 1 ||
      (query.has("version") && query.get("version") !== "1")
    )
      return reply(400, { error: "Parâmetros inválidos." });
    const origin =
      request.headers.get("origin") ||
      (request.headers.get("sec-fetch-site") === "same-origin"
        ? new URL(request.url).origin
        : null);
    if (!origin || !options.allowedOrigins.includes(origin))
      return reply(403, { error: "Origem não autorizada." });
    try {
      const account = await options.identify(request);
      if (!account || account.anonymous || !/^[A-Za-z0-9_-]{1,128}$/.test(account.uid))
        return reply(401, { error: "Entre na conta para conferir seu perfil." });
      if (!(await options.consume(account.uid)))
        return reply(429, { error: "Aguarde antes de tentar novamente." });
      const { profile, username } = await options.read(account.uid);
      return reply(200, profileCompletion(profile, username));
    } catch {
      return reply(503, { error: "Não foi possível conferir seu perfil agora." });
    }
  };
}
