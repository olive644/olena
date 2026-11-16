// A dobra do canto de cima à direita da folha (o triângulo cortado). Ali não há papel: nada de
// tinta. O tamanho é o mesmo (em pixels de tela) do `::after` e do `clip-path` em styles.css.
export const FOLD_SIZE_PX = 34;

export function isInFoldCorner(
  bounds: { top: number; right: number },
  clientX: number,
  clientY: number,
  size = FOLD_SIZE_PX,
): boolean {
  const fromRight = bounds.right - clientX;
  const fromTop = clientY - bounds.top;
  return fromRight >= 0 && fromTop >= 0 && fromRight + fromTop < size;
}
