import { describe, expect, it, vi } from "vitest";
import { createDiscordAuthHandler } from "./discord-auth-handler";
import { createMemoryRoomStore } from "./room-transaction";
import { createHash } from "node:crypto";

const origin = "https://olena.test";
function setup() {
  let now = Date.now();
  const store = createMemoryRoomStore(() => now);
  const resolve = vi.fn(async () => "firebase-owner");
  const mint = vi.fn(async () => "signed-custom-token");
  const fetcher = vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith("/token")
      ? Response.json({ access_token: "discord-secret", token_type: "Bearer" })
      : Response.json({ id: "123456789012345678", username: "learner" }),
  );
  const identify = vi.fn(async () => ({ uid: "existing-owner" }));
  const handler = createDiscordAuthHandler({
    clientId: "client",
    clientSecret: "secret",
    origin,
    allowedOrigins: [origin],
    store,
    fetchImpl: fetcher,
    resolve,
    mint,
    identify,
  });
  const request = (step: string, headers: Record<string, string> = {}) =>
    handler(
      new Request(`${origin}/api/olena?action=account-auth&step=${step}`, {
        method: "POST",
        headers: { origin, ...headers },
      }),
    );
  async function start(headers: Record<string, string> = {}) {
    const response = await request("start", headers);
    const { url } = (await response.json()) as { url: string };
    return {
      authorize: new URL(url),
      setCookie: response.headers.get("set-cookie")!,
      state: new URL(url).searchParams.get("state")!,
      cookie: response.headers.get("set-cookie")!.split(";")[0]!,
    };
  }
  const callback = (state: string, cookie: string, issuer = "https://discord.com") =>
    handler(
      new Request(
        `${origin}/api/olena?action=account-auth&step=callback&code=authorization-code&state=${state}&iss=${encodeURIComponent(issuer)}`,
        { headers: { cookie } },
      ),
    );
  return {
    start,
    request,
    callback,
    fetcher,
    resolve,
    mint,
    identify,
    expire: () => {
      now += 601000;
    },
  };
}

describe("Discord OAuth", () => {
  it("binds state and single-use exchange to the same browser, without URL tokens", async () => {
    const s = setup();
    const flow = await s.start();
    const response = await s.callback(flow.state, flow.cookie);
    expect(response.status).toBe(303);
    expect(flow.authorize.searchParams.get("scope")).toBe("identify");
    expect(flow.authorize.searchParams.has("client_secret")).toBe(false);
    expect(flow.authorize.searchParams.get("code_challenge_method")).toBe("S256");
    const exchangeBody = new URLSearchParams(String(s.fetcher.mock.calls[0]?.[1]?.body));
    const verifier = exchangeBody.get("code_verifier")!;
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(
      flow.authorize.searchParams.get("code_challenge"),
    );
    expect(flow.authorize.searchParams.has("code_verifier")).toBe(false);
    expect(flow.setCookie).toMatch(/^__Host-/);
    expect(flow.setCookie).toContain("Path=/; HttpOnly; Secure; SameSite=Lax");
    expect(flow.setCookie).not.toContain("Domain=");
    const location = response.headers.get("location")!;
    expect(location).not.toContain("signed-custom-token");
    expect(location).not.toContain("discord-secret");
    const code = new URL(location).searchParams.get("discord")!;
    expect(s.mint).not.toHaveBeenCalled();
    const wrong = await s.request(`exchange&code=${code}`, {
      cookie: "__Host-olena_discord_oauth=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(wrong.status).toBe(403);
    const exchanged = await s.request(`exchange&code=${code}`, { cookie: flow.cookie });
    expect(exchanged.status).toBe(200);
    expect(await exchanged.json()).toEqual({ token: "signed-custom-token", linked: false });
    expect((await s.request(`exchange&code=${code}`, { cookie: flow.cookie })).status).toBe(403);
    expect((await s.callback(flow.state, flow.cookie)).status).toBe(403);
    expect(s.mint).toHaveBeenCalledTimes(1);
  });
  it("rejects cross-origin starts, missing cookies and expired state before provider calls", async () => {
    const s = setup();
    expect((await s.request("start", { origin: "https://evil.test" })).status).toBe(403);
    const flow = await s.start();
    expect((await s.callback(flow.state, "")).status).toBe(403);
    s.expire();
    expect((await s.callback(flow.state, flow.cookie)).status).toBe(403);
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  it("rejects an unexpected OAuth issuer", async () => {
    const s = setup();
    const flow = await s.start();
    const response = await s.callback(flow.state, flow.cookie, "https://evil.test");
    expect(response.headers.get("location")).toContain("authError=discord");
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  it("links only to the server-verified owner and never matches by email", async () => {
    const s = setup();
    const flow = await s.start({ authorization: "Bearer valid-token" });
    await s.callback(flow.state, flow.cookie);
    expect(s.resolve).toHaveBeenCalledWith(
      { id: "123456789012345678", name: "learner" },
      "existing-owner",
    );
    expect(s.identify).toHaveBeenCalledOnce();
  });
  it("consumes concurrent callbacks once", async () => {
    const s = setup();
    const flow = await s.start();
    const results = await Promise.all([
      s.callback(flow.state, flow.cookie),
      s.callback(flow.state, flow.cookie),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([303, 403]);
    expect(s.resolve).toHaveBeenCalledOnce();
  });
  it("does not issue a token after a provider failure", async () => {
    const s = setup();
    const flow = await s.start();
    s.fetcher.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    expect((await s.callback(flow.state, flow.cookie)).headers.get("location")).toContain(
      "authError=discord",
    );
    expect(s.mint).not.toHaveBeenCalled();
  });
  it("limits attempts across serverless instances through the shared store", async () => {
    const s = setup();
    for (let index = 0; index < 30; index++) expect((await s.request("start")).status).toBe(200);
    expect((await s.request("start")).status).toBe(429);
  });
});
