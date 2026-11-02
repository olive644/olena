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
