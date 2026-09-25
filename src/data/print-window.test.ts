import { afterEach, describe, expect, it, vi } from "vitest";
import { openPrintWindow } from "./print-window";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("janela de impressão", () => {
  it("abre em branco, sem noopener, e corta o vínculo com esta página", () => {
    const opened = { opener: window } as unknown as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(opened);
    expect(openPrintWindow()).toBe(opened);
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(opened.opener).toBeNull();
  });

  it("devolve nulo quando o navegador bloqueia o pop-up", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(openPrintWindow()).toBeNull();
  });
});
