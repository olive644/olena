import { afterEach, describe, expect, it } from "vitest";
import {
  GUEST_NAME,
  GUEST_SESSION_KEY,
  endGuestSession,
  isGuestSession,
  requiresLogin,
  startGuestSession,
} from "./guest-session";

describe("guest-session", () => {
  afterEach(() => localStorage.clear());

  it("o convidado se chama Guest", () => {
    expect(GUEST_NAME).toBe("Guest");
  });

  it("começa e termina a sessão de convidado neste aparelho", () => {
    expect(isGuestSession()).toBe(false);
    startGuestSession();
    expect(isGuestSession()).toBe(true);
    expect(localStorage.getItem(GUEST_SESSION_KEY)).toBe("1");
    endGuestSession();
    expect(isGuestSession()).toBe(false);
  });

  it("não quebra quando o armazenamento recusa a leitura ou a escrita", () => {
    const broken = {
      getItem() {
        throw new Error("bloqueado");
      },
      setItem() {
        throw new Error("bloqueado");
      },
      removeItem() {
        throw new Error("bloqueado");
      },
    } as unknown as Storage;
    expect(isGuestSession(broken)).toBe(false);
    expect(() => startGuestSession(broken)).not.toThrow();
    expect(() => endGuestSession(broken)).not.toThrow();
  });

  it("exige login só de quem está desconectado e não é convidado", () => {
    expect(requiresLogin(true, false, false)).toBe(true);
    expect(requiresLogin(true, false, true)).toBe(false);
    expect(requiresLogin(true, true, false)).toBe(false);
    expect(requiresLogin(true, undefined, false)).toBe(false);
    expect(requiresLogin(false, false, false)).toBe(false);
  });
});
