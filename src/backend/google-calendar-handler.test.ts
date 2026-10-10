import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createGoogleCalendarHandler } from "./google-calendar-handler";
import {
  encryptSession,
  GOOGLE_SESSION_COOKIE,
  GOOGLE_STATE_COOKIE,
} from "./google-session-cookie";
import { createMemoryRoomStore } from "./room-transaction";

const origin = "https://helena.example";
const sessionSecret = randomBytes(32).toString("base64");
const config = {
  clientId: "client-1",
  clientSecret: "secret-1",
  redirectUri: `${origin}/api/google-calendar?action=callback`,
};

function get(path: string, cookie?: string): Request {
  return new Request(`${origin}/api/google-calendar${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
}

function post(path: string, cookie?: string): Request {
  return new Request(`${origin}/api/google-calendar${path}`, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
  });
}

function handler(fetchImpl: typeof fetch) {
  return createGoogleCalendarHandler({
    config,
    sessionSecret,
    fetchImpl,
    now: () => Date.parse("2026-09-10T00:00:00Z"),
    randomState: () => "fixed-state",
    appUrl: () => origin,
  });
}

describe("handler do Google Agenda", () => {
  it("redireciona para o Google com estado em cookie", async () => {
    const response = await handler(vi.fn())(get("?action=connect"));
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("Location")!);
    expect(location.hostname).toBe("accounts.google.com");
    expect(location.searchParams.get("state")).toBe("fixed-state");
    expect(response.headers.get("Set-Cookie")).toContain(GOOGLE_STATE_COOKIE);
  });

  it("recusa callback com estado divergente", async () => {
    const response = await handler(vi.fn())(
      get(`?action=callback&code=c1&state=outro`, `${GOOGLE_STATE_COOKIE}=fixed-state`),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${origin}?google=erro`);
  });

  it("troca o código e conecta na sessão", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "a1", refresh_token: "r1", expires_in: 3600 }), {
        status: 200,
      }),
    );
    const response = await handler(fetchImpl)(
      get(`?action=callback&code=c1&state=fixed-state`, `${GOOGLE_STATE_COOKIE}=fixed-state`),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${origin}?google=conectado`);
    expect(
      response.headers.getSetCookie().some((value) => value.includes(GOOGLE_SESSION_COOKIE)),
    ).toBe(true);
  });

  it("informa status desconectado sem cookie", async () => {
    const response = await handler(vi.fn())(get("?action=status"));
    expect(await response.json()).toEqual({ connected: false });
  });

  it("exige sessão para listar eventos", async () => {
    const response = await handler(vi.fn())(get("?action=events"));
    expect(response.status).toBe(401);
  });

  it("lista eventos com sessão válida e renova token vencido", async () => {
    const expiredCookie = encryptSession(sessionSecret, {
      accessToken: "old",
      refreshToken: "r1",
      expiresAt: Date.parse("2026-09-09T00:00:00Z"),
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "new", expires_in: 3600 }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    const response = await handler(fetchImpl)(
      get("?action=events", `${GOOGLE_SESSION_COOKIE}=${expiredCookie}`),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ events: [] });
    expect(
      response.headers.getSetCookie().some((value) => value.includes(GOOGLE_SESSION_COOKIE)),
    ).toBe(true);
  });

  it("desconectar revoga o token no Google e limpa o cookie", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const cookie = `${GOOGLE_SESSION_COOKIE}=${encryptSession(sessionSecret, {
      accessToken: "a1",
      refreshToken: "r1",
      expiresAt: Date.parse("2026-09-10T01:00:00Z"),
    })}`;
    const response = await handler(fetchImpl)(post("?action=disconnect", cookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ connected: false, revoked: true });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/revoke");
    expect(String(init.body)).toBe("token=r1");
  });

  it("se o Google falhar ao revogar, a pessoa ainda sai e o resultado avisa", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("rede"));
    const cookie = `${GOOGLE_SESSION_COOKIE}=${encryptSession(sessionSecret, {
      accessToken: "a1",
      refreshToken: "r1",
      expiresAt: Date.parse("2026-09-10T01:00:00Z"),
    })}`;
    const response = await handler(fetchImpl)(post("?action=disconnect", cookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ connected: false, revoked: false });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("desconectar sem sessão não chama o Google", async () => {
    const fetchImpl = vi.fn();
    const response = await handler(fetchImpl)(post("?action=disconnect"));
    expect(await response.json()).toEqual({ connected: false, revoked: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("desconecta limpando o cookie de sessão", async () => {
    const response = await handler(vi.fn())(post("?action=disconnect"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("limita tentativas de login por endereço quando um store e configurado", async () => {
    const rateLimitStore = createMemoryRoomStore();
    const login = createGoogleCalendarHandler({
      config,
      sessionSecret,
      fetchImpl: vi.fn(),
      now: () => Date.parse("2026-09-10T00:00:00Z"),
      randomState: () => "fixed-state",
      appUrl: () => origin,
      rateLimitStore,
      clientId: () => "1.2.3.4",
    });
    for (let i = 0; i < 10; i++) {
      const response = await login(get("?action=connect"));
      expect(response.status).toBe(302);
    }
    const blocked = await login(get("?action=connect"));
    expect(blocked.status).toBe(429);

    const otherAddress = await createGoogleCalendarHandler({
      config,
      sessionSecret,
      fetchImpl: vi.fn(),
      now: () => Date.parse("2026-09-10T00:00:00Z"),
      randomState: () => "fixed-state",
      appUrl: () => origin,
      rateLimitStore,
      clientId: () => "5.6.7.8",
    })(get("?action=connect"));
    expect(otherAddress.status).toBe(302);
  });
});
