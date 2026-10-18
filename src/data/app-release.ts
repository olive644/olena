import { useEffect, useSyncExternalStore } from "react";
import known from "../../public/app-version.json";
let number = known.number;
let pending: Promise<void> | undefined;
const listeners = new Set<() => void>();
export const releaseLabel = (value: number) => `beta.${value}`;
export function useAppRelease() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => number,
  );
  useEffect(() => {
    pending ??= fetch("/app-version.json", { cache: "no-cache", signal: AbortSignal.timeout(6000) })
      .then(async (response) => {
        if (!response.ok) throw new Error("release");
        const value: unknown = await response.json();
        if (
          value &&
          typeof value === "object" &&
          "number" in value &&
          typeof value.number === "number" &&
          Number.isSafeInteger(value.number) &&
          value.number > 0
        ) {
          number = value.number;
          listeners.forEach((listener) => listener());
        }
      })
      .catch(() => {
        pending = undefined;
      });
  }, []);
  return releaseLabel(current);
}
