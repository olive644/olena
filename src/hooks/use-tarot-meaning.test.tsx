import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useTarotMeaning } from "./use-tarot-meaning";
afterEach(() => vi.unstubAllGlobals());
it("mostra o significado em português da cópia própria, sem consultar serviço externo", async () => {
  const copy = {
    name: "A Estrela",
    upright: "Perda, roubo",
    reversed: "Arrogância",
    description: "Uma grande estrela.",
  };
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ar17: copy })));
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() => useTarotMeaning("ar17"));
  await waitFor(() => expect(result.current?.value?.upright).toBe("Perda, roubo"));
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe("/arcana/tarot-ptbr.json");
});

it("não exibe texto em inglês de fora mesmo que o serviço externo responda", async () => {
  const fetcher = vi.fn((url: string) =>
    Promise.resolve(
      url.startsWith("/arcana/")
        ? new Response("{}")
        : new Response(
            JSON.stringify({
              card: {
                name_short: "ar18",
                name: "The Moon",
                meaning_up: "x",
                meaning_rev: "y",
                desc: "z",
              },
            }),
          ),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() => useTarotMeaning("ar18"));
  await waitFor(() => expect(result.current).toBeDefined());
  expect(result.current?.value).toBeUndefined();
  expect(fetcher.mock.calls.every(([url]) => String(url).startsWith("/arcana/"))).toBe(true);
});

it("descarta resposta tardia de uma seleção anterior", async () => {
  let resolve: ((r: Response) => void) | undefined;
  const moon = { name: "A Lua", upright: "Intuição", reversed: "Medo", description: "Lua" };
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ ar18: moon })));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender } = renderHook(({ id }) => useTarotMeaning(id), {
    initialProps: { id: "ar01" },
  });
  await waitFor(() => expect(resolve).toBeDefined());
  rerender({ id: "ar18" });
  await waitFor(() => expect(result.current?.value?.name).toBe("A Lua"));
  resolve?.(new Response(JSON.stringify({ ar01: { ...moon, name: "O Mago" } })));
  await Promise.resolve();
  expect(result.current?.value?.name).toBe("A Lua");
});
