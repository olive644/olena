import type { Stroke } from "./handwriting-types";

// Desfazer e refazer restauram um retrato da folha. Em um caderno compartilhado, esse retrato
// foi tirado antes de o colega escrever, então restaurá-lo por inteiro apagaria os traços dele
// (e, na sincronização, apagaria também na tela dele). Aqui, o retrato vale para os traços de
// quem desfaz, e os traços que chegaram de colegas e ainda estão na folha são mantidos.
export function restoreStrokes(
  target: readonly Stroke[],
  current: readonly Stroke[],
  remoteIds: ReadonlySet<string>,
): Stroke[] {
  const inTarget = new Set(target.map((stroke) => stroke.id));
  const kept = current.filter((stroke) => remoteIds.has(stroke.id) && !inTarget.has(stroke.id));
  return [...target, ...kept];
}
