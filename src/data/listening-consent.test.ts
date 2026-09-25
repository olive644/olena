import { describe, expect, it } from "vitest";
import {
  LISTENING_CONSENT_VERSION,
  LISTENING_ONLINE_ITEM,
  readListeningOnlineChoice,
  writeListeningOnlineChoice,
} from "./listening-consent";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("escolha dos recursos online da escuta", () => {
  it("sem escolha guardada não há aceite", () => {
    expect(readListeningOnlineChoice(memory())).toBeNull();
  });

  it("guarda e lê o aceite e a recusa", () => {
    for (const choice of ["accepted", "declined"] as const) {
      const storage = memory();
      writeListeningOnlineChoice(storage, choice);
      expect(readListeningOnlineChoice(storage)).toBe(choice);
    }
  });

  it("registra a versão e o momento", () => {
    const storage = memory();
    writeListeningOnlineChoice(storage, "accepted", new Date("2026-09-25T12:00:00.000Z"));
    expect(JSON.parse(storage.getItem(LISTENING_ONLINE_ITEM)!)).toEqual({
      choice: "accepted",
      version: LISTENING_CONSENT_VERSION,
      at: "2026-09-25T12:00:00.000Z",
    });
  });

  it("pede a escolha de novo quando o que é enviado mudou (versão diferente)", () => {
    const stale = JSON.stringify({
      choice: "accepted",
      version: LISTENING_CONSENT_VERSION - 1,
      at: "x",
    });
    expect(readListeningOnlineChoice(memory({ [LISTENING_ONLINE_ITEM]: stale }))).toBeNull();
  });

  it("trata lixo, formato errado e valor desconhecido como sem escolha", () => {
    for (const raw of [
      "não é json",
      "null",
      "[]",
      '{"choice":"talvez","version":1}',
      '{"version":1}',
    ]) {
      expect(readListeningOnlineChoice(memory({ [LISTENING_ONLINE_ITEM]: raw }))).toBeNull();
    }
  });

  it("não quebra quando o armazenamento recusa a gravação", () => {
    const full = {
      setItem: () => {
        throw new DOMException("cheio", "QuotaExceededError");
      },
    };
    expect(() => writeListeningOnlineChoice(full, "accepted")).not.toThrow();
  });

  it("usa uma chave apagada junto com os dados pessoais ao sair da conta", () => {
    expect(LISTENING_ONLINE_ITEM.startsWith("helena")).toBe(true);
  });
});
