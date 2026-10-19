import { afterEach, expect, it, vi } from "vitest";
import { openPomodoroWindow } from "./pomodoro-window";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function target() {
  return {
    document: document.implementation.createHTMLDocument(),
    addEventListener: vi.fn(),
    close: vi.fn(),
  } as unknown as Window;
}
it("usa PiP quando disponível e copia o tema", async () => {
  const child = target();
  const requestWindow = vi.fn(async () => child);
  vi.stubGlobal("documentPictureInPicture", { requestWindow });
  document.documentElement.setAttribute("data-theme", "dark");
  expect(await openPomodoroWindow()).toBe(child);
  expect(requestWindow).toHaveBeenCalledWith({ width: 320, height: 340 });
  expect(child.document.documentElement.getAttribute("data-theme")).toBe("dark");
  document.documentElement.removeAttribute("data-theme");
});
it("oferece janela comum sem PiP e detecta pop-up bloqueado", async () => {
  vi.stubGlobal("documentPictureInPicture", undefined);
  const child = target();
  const open = vi.spyOn(window, "open").mockReturnValue(child);
  expect(await openPomodoroWindow()).toBe(child);
  open.mockReturnValue(null);
  await expect(openPomodoroWindow()).rejects.toThrow("popup-blocked");
});
