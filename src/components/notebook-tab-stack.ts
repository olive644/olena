/**
 * Onde cada divisória e cada marcador fica no caderno aberto. A aba pertence à folha física da
 * página em que foi posta: a folha `L` traz as páginas `2L - 1` (frente) e `2L` (verso). Com o par
 * `s` aberto (páginas `2s` e `2s + 1`), as folhas `0..s` já viraram e formam a pilha da esquerda;
 * as folhas `s + 1..` esperam na pilha da direita. A aba sai pela borda livre da folha dela: pela
 * esquerda na pilha da esquerda, pela direita na da direita.
 */
export type TabSide = "left" | "right";

export function leafOfPage(pageIndex: number): number {
  return Math.ceil(Math.max(0, pageIndex) / 2);
}

export function tabSide(pageIndex: number, spread: number): TabSide {
  return leafOfPage(pageIndex) <= spread ? "left" : "right";
}

/** As abas que trocam de lado quando o caderno passa do par `from` para o par `to`. */
export function tabsChangingSide<T extends { pageId: string }>(
  tabs: readonly T[],
  pageIds: readonly string[],
  from: number,
  to: number,
): T[] {
  return tabs.filter((tab) => {
    const index = pageIds.indexOf(tab.pageId);
    return index >= 0 && tabSide(index, from) !== tabSide(index, to);
  });
}
