const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string;
};

export function buildAuthorizationUrl(config: GoogleOAuthConfig, state: string): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
};

export async function exchangeCodeForTokens(
  config: GoogleOAuthConfig,
  code: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleTokens> {
  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token || !payload.refresh_token) {
    throw new Error(`Falha ao trocar o código do Google: ${payload.error ?? response.status}`);
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
}

export async function refreshAccessToken(
  config: GoogleOAuthConfig,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ accessToken: string; expiresAt: number }> {
  const response = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(`Falha ao renovar o token do Google: ${payload.error ?? response.status}`);
  }
  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  };
}

type GoogleEventsResponse = {
  items?: Array<{
    id: string;
    summary?: string;
    htmlLink: string;
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
  }>;
};

// Revoga o refresh token no Google (o que também invalida o access token dele). Sem isso,
// desconectar só apagava o cookie e a autorização continuava válida na conta da pessoa.
export async function revokeToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const response = await fetchImpl(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
  return response.ok;
}

export async function listUpcomingEvents(
  accessToken: string,
  range: { timeMinISO: string; timeMaxISO: string },
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleCalendarEvent[]> {
  const url = new URL(EVENTS_ENDPOINT);
  url.searchParams.set("timeMin", range.timeMinISO);
  url.searchParams.set("timeMax", range.timeMaxISO);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "20");
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 401) throw Object.assign(new Error("Token expirado"), { status: 401 });
  if (!response.ok) throw new Error(`Falha ao listar eventos do Google: ${response.status}`);
  const payload = (await response.json()) as GoogleEventsResponse;
  return (payload.items ?? [])
    .filter((item) => item.start && item.end)
    .map((item) => ({
      id: item.id,
      title: item.summary ?? "(Sem título)",
      start: (item.start!.dateTime ?? item.start!.date)!,
      end: (item.end!.dateTime ?? item.end!.date)!,
      allDay: !item.start!.dateTime,
      htmlLink: item.htmlLink,
    }));
}
