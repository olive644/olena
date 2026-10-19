/** Movimento reduzido pedido pelo sistema ou pelo próprio aplicativo. */
export function reducedMotion(): boolean {
  return (
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true) ||
    document.documentElement.dataset["reduceMotion"] === "true"
  );
}
