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

async function openWithSprite(sprite: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(sprite)),
  );
  const child = target();
  vi.stubGlobal("documentPictureInPicture", { requestWindow: vi.fn(async () => child) });
  await openPomodoroWindow();
  return child.document;
}
it("embute o sprite de dígitos como SVG real", async () => {
  const doc = await openWithSprite(
    '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="digit-0" viewBox="0 0 1 1"/></svg>',
  );
  expect(doc.querySelector(".pomodoro-sprite svg symbol#digit-0")).not.toBeNull();
});
it("não deixa um sprite adulterado executar script nem virar HTML na janela flutuante", async () => {
  const doc = await openWithSprite(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>window.hacked=1</script><symbol id="digit-0"/></svg>',
  );
  expect(doc.querySelector("script")).toBeNull();
  expect(doc.querySelector(".pomodoro-sprite")?.children).toHaveLength(0);
  const html = await openWithSprite('<img src=x onerror="window.hacked=1">');
  expect(html.querySelector("img")).toBeNull();
  expect(html.querySelector(".pomodoro-sprite")?.children).toHaveLength(0);
  const broken = await openWithSprite("<svg><oops");
  expect(broken.querySelector(".pomodoro-sprite")?.children).toHaveLength(0);
});
