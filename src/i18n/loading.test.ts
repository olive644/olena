import { expect, it, vi } from "vitest";
import { changeLanguage, LANGUAGE_KEY, uiLocale } from "./runtime";

it("does not save or activate a language when its catalog cannot load", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  try {
    await expect(changeLanguage("en-US")).rejects.toThrow("offline");
    expect(uiLocale()).toBe("pt-BR");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBeNull();
    fetcher.mockResolvedValue(new Response(JSON.stringify(["incomplete"]), { status: 200 }));
    await expect(changeLanguage("en-US")).rejects.toThrow("Invalid language catalog");
    expect(uiLocale()).toBe("pt-BR");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBeNull();
  } finally {
    fetcher.mockRestore();
  }
});
