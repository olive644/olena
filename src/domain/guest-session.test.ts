import { afterEach, describe, expect, it } from "vitest";
import {
  GUEST_NAME,
  GUEST_NICKNAME_KEY,
  GUEST_NICKNAME_MAX,
  GUEST_SESSION_KEY,
  endGuestSession,
  isGuestSession,
  normalizeGuestNickname,
  readGuestNickname,
  requiresLogin,
  startGuestSession,
  writeGuestNickname,
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

describe("apelido do convidado", () => {
  afterEach(() => localStorage.clear());

  it("normaliza como o nome de exibição da sala", () => {
    expect(normalizeGuestNickname("  Ana   <b>Lu</b>  ")).toBe("Ana bLu/b");
    expect(normalizeGuestNickname("x".repeat(40))).toHaveLength(GUEST_NICKNAME_MAX);
    expect(normalizeGuestNickname("   ")).toBe("");
  });

  it("volta a Guest sem apelido e guarda só apelidos diferentes de Guest", () => {
    expect(readGuestNickname()).toBe("Guest");
    writeGuestNickname("Poli");
    expect(localStorage.getItem(GUEST_NICKNAME_KEY)).toBe("Poli");
    expect(readGuestNickname()).toBe("Poli");
    writeGuestNickname("Guest");
    expect(localStorage.getItem(GUEST_NICKNAME_KEY)).toBeNull();
    writeGuestNickname("Poli");
    writeGuestNickname("  ");
    expect(readGuestNickname()).toBe("Guest");
  });

  it("some quando a pessoa entra com Google", () => {
    startGuestSession();
    writeGuestNickname("Poli");
    endGuestSession();
    expect(localStorage.getItem(GUEST_NICKNAME_KEY)).toBeNull();
  });
});
