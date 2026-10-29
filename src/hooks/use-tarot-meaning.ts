import { useEffect, useState } from "react";
export type TarotMeaning = { name: string; upright: string; reversed: string; description: string };
function valid(value: unknown): value is TarotMeaning {
  if (!value || typeof value !== "object") return false;
  return ["name", "upright", "reversed", "description"].every(
    (key) =>
      typeof (value as Record<string, unknown>)[key] === "string" &&
      ((value as Record<string, string>)[key]?.length ?? 0) < 30000,
  );
}
const cache = new Map<string, TarotMeaning>();
const apiIdPattern = /^(ar(?:0\d|1\d|2[01])|(?:wa|cu|sw|pe)(?:ac|0[2-9]|10|pa|kn|qu|ki))$/;
export function useTarotMeaning(id: string | undefined) {
  const [result, setResult] = useState<{ id: string; value?: TarotMeaning; offline?: boolean }>();
  useEffect(() => {
    if (!id || !apiIdPattern.test(id)) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 8000);
    async function load() {
      let fallback = cache.get(id!);
      if (!fallback)
        try {
          const response = await fetch("/arcana/tarot-api.json", { signal: controller.signal });
          if (!response.ok) throw Error();
          const all: unknown = await response.json();
          if (all && typeof all === "object")
            for (const [key, item] of Object.entries(all))
              if (apiIdPattern.test(key) && valid(item)) cache.set(key, item);
          fallback = cache.get(id!);
        } catch {
          /* Remote response may still provide the text. */
        }
      if (active && fallback) setResult({ id: id!, value: fallback, offline: true });
      try {
        const response = await fetch(`https://tarotapi.dev/api/v1/cards/${id}`, {
          signal: controller.signal,
          credentials: "omit",
          referrerPolicy: "no-referrer",
        });
        if (!response.ok) throw Error();
        const json: unknown = await response.json();
        const card =
          json && typeof json === "object" ? (json as { card?: unknown }).card : undefined;
        const candidate =
          card && typeof card === "object"
            ? {
                name: (card as Record<string, unknown>)["name"],
                upright: (card as Record<string, unknown>)["meaning_up"],
                reversed: (card as Record<string, unknown>)["meaning_rev"],
                description: (card as Record<string, unknown>)["desc"],
              }
            : undefined;
        if (
          !card ||
          typeof card !== "object" ||
          (card as Record<string, unknown>)["name_short"] !== id ||
          !valid(candidate)
        )
          throw Error();
        cache.set(id!, candidate);
        if (active) setResult({ id: id!, value: candidate, offline: false });
      } catch {
        if (active) setResult({ id: id!, ...(fallback ? { value: fallback } : {}), offline: true });
      } finally {
        clearTimeout(timer);
      }
    }
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [id]);
  return result?.id === id ? result : undefined;
}
