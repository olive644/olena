/** Movimento reduzido pedido pelo sistema ou pelo próprio aplicativo. */
export function reducedMotion(): boolean {
  return (
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true) ||
    document.documentElement.dataset["reduceMotion"] === "true"
  );
}

/** Avisa quando o movimento reduzido muda, pelo sistema ou pela preferência do aplicativo. */
export function watchReducedMotion(onChange: () => void): () => void {
  const preferences = new MutationObserver(onChange);
  preferences.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-reduce-motion"],
  });
  const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  media?.addEventListener?.("change", onChange);
  return () => {
    preferences.disconnect();
    media?.removeEventListener?.("change", onChange);
  };
}
