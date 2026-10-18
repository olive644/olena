import { expect, it, vi } from "vitest";
import { changeLanguage, LANGUAGE_KEY, uiLocale } from "./runtime";

it("does not save or activate a language when its catalog cannot load", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  try {
    await expect(changeLanguage("en-US")).rejects.toThrow("offline");
    expect(uiLocale()).toBe("pt-BR");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBeNull();
    fetcher.mockImplementation(
      async () => new Response(JSON.stringify(["incomplete"]), { status: 200 }),
    );
    await expect(changeLanguage("en-US")).rejects.toThrow("Invalid language catalog");
    expect(uiLocale()).toBe("pt-BR");
    expect(localStorage.getItem(LANGUAGE_KEY)).toBeNull();
  } finally {
    fetcher.mockRestore();
  }
});

it("retries transient failures and accepts append-only catalogs from a newer deployment", async () => {
  vi.resetModules();
  const runtime = await import("./runtime");
  const english = (await import("../../public/locales/en-US.json")).default;
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValueOnce(new Error("transient"))
    .mockImplementation(async () => new Response(JSON.stringify([...english, "A newer message"])));
  await runtime.changeLanguage("en-US");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(runtime.uiLocale()).toBe("en-US");
  expect(localStorage.getItem("olena:ui-catalog:en-US")).toContain("A newer message");
  fetcher.mockRestore();
});

it("opens a previously confirmed catalog immediately without a network dependency", async () => {
  vi.resetModules();
  const runtime = await import("./runtime");
  const english = (await import("../../public/locales/en-US.json")).default;
  const { CATALOG_VERSION } = await import("./catalog-version");
  localStorage.setItem(
    "olena:ui-catalog:en-US",
    JSON.stringify({ version: CATALOG_VERSION, messages: english }),
  );
  const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  await runtime.changeLanguage("en-US");
  expect(runtime.uiLocale()).toBe("en-US");
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockRestore();
});
