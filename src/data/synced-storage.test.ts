import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applySyncedStorage,
  readSyncedStorage,
  SYNCED_STORAGE_APPLIED_EVENT,
  SYNCED_STORAGE_EVENT,
  writeSyncedStorage,
} from "./synced-storage";

describe("synced storage", () => {
  beforeEach(() => localStorage.clear());

  it("mantém somente o estado oficial recebido da nuvem", () => {
    const listener = vi.fn();
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, listener);
    localStorage.setItem("helenastudy.theme", "light");
    localStorage.setItem("helena.profile.v1", "antigo");
    applySyncedStorage({ "helenastudy.theme": "dark" });

    expect(readSyncedStorage()).toEqual({ "helenastudy.theme": "dark" });
    expect(localStorage.getItem("helena.profile.v1")).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, listener);
  });

  it("avisa a sincronização após uma alteração local", () => {
    const listener = vi.fn();
    window.addEventListener(SYNCED_STORAGE_EVENT, listener);
    writeSyncedStorage("helena.soloProgress", "4");
    window.removeEventListener(SYNCED_STORAGE_EVENT, listener);

    expect(listener).toHaveBeenCalledOnce();
    expect(localStorage.getItem("helena.soloProgress")).toBe("4");
  });
});
