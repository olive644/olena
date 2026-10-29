import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useTarotMeaning } from "./use-tarot-meaning";
it("shows the API data fallback during a remote failure without transmitting identity", async () => {
  const copy = { name: "The Star", upright: "Hope", reversed: "Doubt", description: "A star." };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ ar17: copy })))
    .mockRejectedValueOnce(Error("offline"));
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() => useTarotMeaning("ar17"));
  await waitFor(() => expect(result.current?.value?.upright).toBe("Hope"));
  await waitFor(() => expect(result.current?.offline).toBe(true));
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
});
it("does not display a late response belonging to the previous selection", async () => {
  let resolve: ((r: Response) => void) | undefined;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response("{}"))
    .mockImplementationOnce(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ar18: { name: "Moon", upright: "Intuition", reversed: "Fear", description: "Moon" },
        }),
      ),
    )
    .mockRejectedValue(Error("offline"));
  vi.stubGlobal("fetch", fetcher);
  const { result, rerender } = renderHook(({ id }) => useTarotMeaning(id), {
    initialProps: { id: "ar01" },
  });
  await waitFor(() => expect(resolve).toBeDefined());
  rerender({ id: "ar18" });
  await waitFor(() => expect(result.current?.value?.name).toBe("Moon"));
  await act(async () => {
    resolve?.(
      new Response(
        JSON.stringify({
          cards: [
            {
              name_short: "ar01",
              name: "Magician",
              meaning_up: "Late",
              meaning_rev: "Late",
              desc: "Late",
            },
          ],
        }),
      ),
    );
  });
  expect(result.current?.value?.name).toBe("Moon");
});

it("accepts the real single-card endpoint shape and verifies its identity", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("{}"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            nhits: 1,
            card: {
              name_short: "ar02",
              name: "The High Priestess",
              meaning_up: "Wisdom",
              meaning_rev: "Conceit",
              desc: "Pillars",
            },
          }),
        ),
      ),
  );
  const { result } = renderHook(() => useTarotMeaning("ar02"));
  await waitFor(() => expect(result.current?.offline).toBe(false));
  expect(result.current?.value?.upright).toBe("Wisdom");
});
