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
/** Significados em português do Brasil, traduzidos de A. E. Waite (1910). Nenhum texto externo em inglês é exibido. */
export function useTarotMeaning(id: string | undefined) {
  const [result, setResult] = useState<{ id: string; value?: TarotMeaning }>();
  useEffect(() => {
    if (!id || !apiIdPattern.test(id)) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 8000);
    async function load() {
      let value = cache.get(id!);
      if (!value)
        try {
          const response = await fetch("/arcana/tarot-ptbr.json", { signal: controller.signal });
          if (!response.ok) throw Error();
          const all: unknown = await response.json();
          if (all && typeof all === "object")
            for (const [key, item] of Object.entries(all))
              if (apiIdPattern.test(key) && valid(item)) cache.set(key, item);
          value = cache.get(id!);
        } catch {
          /* Sem a cópia local o painel mostra texto indisponível. */
        } finally {
          clearTimeout(timer);
        }
      if (active) setResult({ id: id!, ...(value ? { value } : {}) });
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
