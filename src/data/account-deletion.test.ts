import { describe, expect, it, vi } from "vitest";
import {
  AccountDeletionError,
  accountConfirmationName,
  deleteAccountEverywhere,
  isDeletionConfirmed,
  type AccountDeletionSteps,
} from "./account-deletion";

function steps(overrides: Partial<AccountDeletionSteps> = {}) {
  const calls: string[] = [];
  const value: AccountDeletionSteps = {
    reauthenticate: vi.fn(async () => void calls.push("reauth")),
    deleteCloudData: vi.fn(async () => void calls.push("cloud")),
    deleteAuthUser: vi.fn(async () => void calls.push("user")),
    wipeLocal: vi.fn(() => void calls.push("local")),
    ...overrides,
  };
  return { value, calls };
}

describe("nome de confirmação", () => {
  it("usa o nome da conta e, sem nome, o e-mail", () => {
    expect(accountConfirmationName({ displayName: " Helena Ferreira ", email: "h@x.com" })).toBe(
      "Helena Ferreira",
    );
    expect(accountConfirmationName({ email: "h@x.com" })).toBe("h@x.com");
    expect(accountConfirmationName({ displayName: "  ", email: "h@x.com" })).toBe("h@x.com");
    expect(accountConfirmationName({})).toBe("");
  });

  it("exige o nome exato, com maiúsculas e minúsculas, e nunca confirma nome vazio", () => {
    expect(isDeletionConfirmed("Helena Ferreira", "Helena Ferreira")).toBe(true);
    expect(isDeletionConfirmed("  Helena Ferreira ", "Helena Ferreira")).toBe(true);
    expect(isDeletionConfirmed("helena ferreira", "Helena Ferreira")).toBe(false);
    expect(isDeletionConfirmed("Helena", "Helena Ferreira")).toBe(false);
    expect(isDeletionConfirmed("", "")).toBe(false);
  });
});

describe("exclusão da conta", () => {
  it("confirma a identidade, apaga a nuvem, apaga a conta e só então limpa o aparelho", async () => {
    const { value, calls } = steps();
    await deleteAccountEverywhere(value);
    expect(calls).toEqual(["reauth", "cloud", "user", "local"]);
  });

  it("se a pessoa fechar o login do Google, nada é apagado", async () => {
    const { value, calls } = steps({
      reauthenticate: vi.fn(async () => {
        throw Object.assign(new Error("x"), { code: "auth/popup-closed-by-user" });
      }),
    });
    await expect(deleteAccountEverywhere(value)).rejects.toMatchObject({ reason: "cancelled" });
    expect(calls).toEqual([]);
  });

  it("se a nuvem falhar, a conta e o aparelho ficam como estavam", async () => {
    const { value, calls } = steps({
      deleteCloudData: vi.fn(async () => {
        throw new Error("rede");
      }),
    });
    const error = await deleteAccountEverywhere(value).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(AccountDeletionError);
    expect((error as AccountDeletionError).reason).toBe("failed");
    expect(calls).toEqual(["reauth"]);
  });

  it("se apagar a conta falhar, o aparelho não é limpo", async () => {
    const { value, calls } = steps({
      deleteAuthUser: vi.fn(async () => {
        throw new Error("auth");
      }),
    });
    await expect(deleteAccountEverywhere(value)).rejects.toMatchObject({ reason: "failed" });
    expect(calls).toEqual(["reauth", "cloud"]);
  });

  it("uma falha no login que não seja cancelamento é uma falha comum", async () => {
    const { value } = steps({
      reauthenticate: vi.fn(async () => {
        throw new Error("popup bloqueado");
      }),
    });
    await expect(deleteAccountEverywhere(value)).rejects.toMatchObject({ reason: "failed" });
  });
});
