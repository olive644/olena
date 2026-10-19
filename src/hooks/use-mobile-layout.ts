import { useSyncExternalStore } from "react";
const query = "(max-width: 760px)";
function subscribe(changed: () => void) {
  if (!window.matchMedia) return () => {};
  const media = window.matchMedia(query);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}
export function useMobileLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
