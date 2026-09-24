import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCOUNT_OWNER_KEY, claimDeviceForAccount, clearPersonalData } from "./personal-data";
import { SYNCED_STORAGE_APPLIED_EVENT } from "./synced-storage";

const PERSONAL_KEYS = [
  "helenastudy.workspace.v1",
  "helenastudy.workspace.history.v1",
  "helenastudy.handwriting.draft.abc",
  "helenastudy.handwriting.saved.page-1",
  "helenastudy.sync-conflict.v1",
  "helena.profile.v1",
  "helena.soloProgress",
  "helena:local-room-session:v1",
  "helena-study:word-frequency:v1",
  "noteoli.pomodoro-streak.v1",
];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("clearPersonalData", () => {
  it("apaga o histórico, os rascunhos, o progresso e a sequência de foco", () => {
    for (const key of PERSONAL_KEYS) localStorage.setItem(key, "dado");
    clearPersonalData(localStorage);
    for (const key of PERSONAL_KEYS) expect(localStorage.getItem(key)).toBeNull();
  });

  it("não mexe em chaves de outros aplicativos da mesma origem", () => {
    localStorage.setItem("outro-app.token", "x");
    localStorage.setItem("helenastudy.workspace.v1", "{}");
    clearPersonalData(localStorage);
    expect(localStorage.getItem("outro-app.token")).toBe("x");
    expect(localStorage.getItem("helenastudy.workspace.v1")).toBeNull();
  });

  it("limpa também a sessão (sala e caderno colaborativo)", () => {
    sessionStorage.setItem("helena:local-room-session:v1", "{}");
    sessionStorage.setItem("helena:notebook-collab-session:v1", "{}");
    clearPersonalData(sessionStorage);
    expect(sessionStorage.length).toBe(0);
  });

  it("preserva as chaves pedidas", () => {
    localStorage.setItem("helena.onboarding.v1", "ok");
    localStorage.setItem("helena.profile.v1", "perfil");
    clearPersonalData(localStorage, ["helena.onboarding.v1"]);
    expect(localStorage.getItem("helena.onboarding.v1")).toBe("ok");
    expect(localStorage.getItem("helena.profile.v1")).toBeNull();
  });
});

describe("claimDeviceForAccount", () => {
  it("na primeira conta só registra a dona e mantém o que já existia no aparelho", () => {
    localStorage.setItem("helenastudy.workspace.v1", "uso local anterior ao login");
    expect(claimDeviceForAccount(localStorage, "ana")).toBe(false);
    expect(localStorage.getItem(ACCOUNT_OWNER_KEY)).toBe("ana");
    expect(localStorage.getItem("helenastudy.workspace.v1")).toBe("uso local anterior ao login");
  });

  it("a mesma conta voltando não apaga nada", () => {
    claimDeviceForAccount(localStorage, "ana");
    localStorage.setItem("helenastudy.workspace.history.v1", "historico");
    expect(claimDeviceForAccount(localStorage, "ana")).toBe(false);
    expect(localStorage.getItem("helenastudy.workspace.history.v1")).toBe("historico");
  });

  it("outra conta no mesmo aparelho apaga os dados da anterior e avisa o app", () => {
    claimDeviceForAccount(localStorage, "ana");
    for (const key of PERSONAL_KEYS) localStorage.setItem(key, "dado da Ana");
    localStorage.setItem("helena.onboarding.v1", '{"completed":true}');
    const applied = vi.fn();
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, applied);

    expect(claimDeviceForAccount(localStorage, "beto")).toBe(true);

    window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, applied);
    for (const key of PERSONAL_KEYS) expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem("helena.onboarding.v1")).toBe('{"completed":true}');
    expect(localStorage.getItem(ACCOUNT_OWNER_KEY)).toBe("beto");
    expect(applied).toHaveBeenCalledTimes(1);
  });
});
