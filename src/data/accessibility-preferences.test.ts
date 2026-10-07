import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ACCESSIBILITY_KEY,
  initializeAccessibility,
  isMotionReduced,
  updateAccessibility,
} from "./accessibility-preferences";
let dispose: () => void;
beforeEach(() => {
  localStorage.clear();
  dispose = initializeAccessibility();
});
afterEach(() => {
  dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  initializeAccessibility()();
});
it("persiste e restaura as duas configurações gerais", () => {
  expect(updateAccessibility({ reduceMotion: true, highlightSelections: true })).toBe(true);
  expect(isMotionReduced()).toBe(true);
  dispose();
  dispose = initializeAccessibility();
  expect(document.documentElement.dataset["reduceMotion"]).toBe("true");
  expect(document.documentElement.dataset["highlightSelections"]).toBe("true");
});
it("ignora dados inválidos e respeita o movimento reduzido do sistema", () => {
  localStorage.setItem(ACCESSIBILITY_KEY, "{");
  dispose();
  dispose = initializeAccessibility();
  expect(document.documentElement.dataset["reduceMotion"]).toBe("false");
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  expect(isMotionReduced()).toBe(true);
});
it("não finge salvar quando o armazenamento falha", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(updateAccessibility({ reduceMotion: true })).toBe(false);
  expect(document.documentElement.dataset["reduceMotion"]).toBe("false");
});
it("acompanha a configuração alterada em outra aba", () => {
  localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify({ highlightSelections: true }));
  window.dispatchEvent(new StorageEvent("storage", { key: ACCESSIBILITY_KEY }));
  expect(document.documentElement.dataset["highlightSelections"]).toBe("true");
});
