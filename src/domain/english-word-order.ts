/**
 * Ordem em que o banco de palavras mostra a frase. É estável (a mesma a cada renderização,
 * pois depende só da frase) e nunca coincide com a ordem certa nem com a invertida, para que
 * a resposta não seja sempre "do último botão ao primeiro".
 */
export function scrambledWordOrder(phrase: string): number[] {
  const words = phrase.split(" ");
  const identity = words.map((_, at) => at);
  if (words.length < 2) return identity;
  const same = (order: readonly number[], target: readonly number[]) =>
    order.every((at, place) => words[at] === words[target[place]!]);
  const reversed = [...identity].reverse();
  const acceptable = (order: readonly number[]) =>
    !same(order, identity) && (words.length < 3 || !same(order, reversed));
  let seed = 2166136261;
  for (const char of phrase) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let attempt = 0; attempt < 24; attempt++) {
    const order = [...identity];
    for (let at = order.length - 1; at > 0; at--) {
      const other = Math.floor(next() * (at + 1));
      [order[at], order[other]] = [order[other]!, order[at]!];
    }
    if (acceptable(order)) return order;
  }
  const rotated = [...identity.slice(1), 0];
  return words.length === 2 ? reversed : rotated;
}
