import { createHash } from "node:crypto";
import type { KvStore } from "./kv-store.js";

// Contadores de gasto em neurons, na mesma janela fixa e com a mesma gravação atômica dos limites
// por contagem. O valor fica em centésimos de neuron, inteiro, para somar e devolver sem erro de
// ponto flutuante.

const UNITS = 100;
type Saved = { bucket: number; units: number };

function keyOf(namespace: string, identity: string): string {
  return `${namespace}/${createHash("sha256").update(identity).digest("hex")}`;
}
const bucketOf = (windowSeconds: number) => Math.floor(Date.now() / (windowSeconds * 1000));

/** Quanto já foi gasto nesta janela, em neurons. */
export async function readBudgetUsed(
  store: KvStore,
  namespace: string,
  identity: string,
  windowSeconds: number,
): Promise<number> {
  const entry = await store.readVersion!(keyOf(namespace, identity));
  if (!entry.value) return 0;
  const saved = JSON.parse(entry.value) as Saved;
  return saved.bucket === bucketOf(windowSeconds) ? saved.units / UNITS : 0;
}

/**
 * Reserva `neurons` se o total da janela continuar dentro de `cap`. Devolve o total depois da
 * reserva, ou o que já estava gasto quando não coube.
 */
export async function reserveBudget(
  store: KvStore,
  namespace: string,
  identity: string,
  neurons: number,
  cap: number,
  windowSeconds: number,
): Promise<{ ok: boolean; used: number }> {
  const key = keyOf(namespace, identity);
  const bucket = bucketOf(windowSeconds);
  const add = Math.round(neurons * UNITS);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const entry = await store.readVersion!(key);
    const saved = entry.value ? (JSON.parse(entry.value) as Saved) : undefined;
    const units = saved?.bucket === bucket ? saved.units : 0;
    if (units + add > Math.round(cap * UNITS)) return { ok: false, used: units / UNITS };
    if (
      await store.compareAndSet!(
        key,
        JSON.stringify({ bucket, units: units + add } satisfies Saved),
        windowSeconds * 2,
        entry.version,
      )
    )
      return { ok: true, used: (units + add) / UNITS };
  }
  return { ok: false, used: await readBudgetUsed(store, namespace, identity, windowSeconds) };
}

/**
 * Acerta o gasto: soma `deltaNeurons` (negativo devolve o que sobrou da reserva ou o pedido todo
 * quando falhou). Nunca fica abaixo de zero. Melhor esforço: se a janela virou ou a gravação
 * disputada falhar, o ajuste se perde.
 */
export async function adjustBudget(
  store: KvStore,
  namespace: string,
  identity: string,
  deltaNeurons: number,
  windowSeconds: number,
): Promise<void> {
  if (!deltaNeurons) return;
  const key = keyOf(namespace, identity);
  const bucket = bucketOf(windowSeconds);
  const delta = Math.round(deltaNeurons * UNITS);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const entry = await store.readVersion!(key);
    const saved = entry.value ? (JSON.parse(entry.value) as Saved) : undefined;
    if (!saved || saved.bucket !== bucket) {
      if (delta <= 0) return;
    }
    const units = saved?.bucket === bucket ? saved.units : 0;
    if (
      await store.compareAndSet!(
        key,
        JSON.stringify({ bucket, units: Math.max(0, units + delta) } satisfies Saved),
        windowSeconds * 2,
        entry.version,
      )
    )
      return;
  }
}
