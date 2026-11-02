import { expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { startOnlinePresence } from "./online-presence";
import { recordPrivacyConsent } from "../domain/privacy-policy";
it("exige aceite, conta somente conta visível, cancela no cleanup e não envia nome", async () => {
  vi.useFakeTimers();
  try {
    let user = {
      uid: "u",
      isAnonymous: false,
      getIdToken: vi.fn(async () => "token"),
    } as unknown as User;
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    const stop = startOnlinePresence(() => user);
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetcher).not.toHaveBeenCalled();
    recordPrivacyConsent(localStorage);
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[1]?.body)).not.toContain("uid");
    user = { ...user, isAnonymous: true } as User;
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    stop();
    await vi.advanceTimersByTimeAsync(180000);
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
it("desliga o heartbeat quando recurso está desativado no servidor", async () => {
  vi.useFakeTimers();
  try {
    recordPrivacyConsent(localStorage);
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 204, headers: { "X-Olena-Presence": "disabled" } }),
    );
    vi.stubGlobal("fetch", fetcher);
    const stop = startOnlinePresence(
      () => ({ uid: "u", isAnonymous: false, getIdToken: async () => "token" }) as User,
    );
    await vi.advanceTimersByTimeAsync(300000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    stop();
  } finally {
    vi.useRealTimers();
  }
});

it("começa imediatamente após renovar o aceite sem reiniciar a sessão", async () => {
  vi.useFakeTimers();
  try {
    localStorage.setItem(
      "helena.privacy.v1",
      JSON.stringify({ version: "antiga", acceptedAt: "ontem" }),
    );
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    const stop = startOnlinePresence(
      () => ({ uid: "u", isAnonymous: false, getIdToken: async () => "token" }) as User,
    );
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).not.toHaveBeenCalled();
    recordPrivacyConsent(localStorage);
    window.dispatchEvent(new Event("olena:privacy-consent-changed"));
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    stop();
  } finally {
    vi.useRealTimers();
  }
});

it("não envia token da conta anterior ao trocar de sessão durante o preparo", async () => {
  vi.useFakeTimers();
  try {
    recordPrivacyConsent(localStorage);
    let release: (token: string) => void = () => {};
    const waiting = new Promise<string>((resolve) => {
      release = resolve;
    });
    let user = { uid: "anterior", isAnonymous: false, getIdToken: () => waiting } as User;
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    const stop = startOnlinePresence(() => user);
    user = { uid: "atual", isAnonymous: false, getIdToken: async () => "atual-token" } as User;
    release("anterior-token");
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("olena:privacy-consent-changed"));
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer atual-token",
    });
    stop();
    window.dispatchEvent(new Event("olena:privacy-consent-changed"));
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
