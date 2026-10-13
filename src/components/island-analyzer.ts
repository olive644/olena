import { analyzeIsland, type IslandModel } from "../domain/island-motion";
import type { PlaceRig } from "../domain/place-rig";

export type IslandAnalyzer = (
  rgba: Uint8ClampedArray,
  size: number,
  rig?: PlaceRig,
) => Promise<IslandModel>;

/** Analisa na própria thread, depois de ceder o turno ao navegador. Só entra se não houver worker. */
export const analyzeOnMainThread: IslandAnalyzer = (rgba, size, rig) =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve(analyzeIsland(rgba, size, rig)), 0);
  });

/** Analisa num worker do mesmo domínio; se ele não existir ou falhar, cai para a thread principal. */
export const analyzeOffThread: IslandAnalyzer = (rgba, size, rig) =>
  new Promise((resolve) => {
    if (typeof Worker === "undefined") {
      void analyzeOnMainThread(rgba, size, rig).then(resolve);
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker(new URL("../workers/island-analysis.worker.ts", import.meta.url), {
        type: "module",
      });
    } catch {
      void analyzeOnMainThread(rgba, size, rig).then(resolve);
      return;
    }
    worker.onmessage = (event: MessageEvent<IslandModel>) => {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = () => {
      worker.terminate();
      void analyzeOnMainThread(rgba, size, rig).then(resolve);
    };
    // O worker recebe uma cópia: a original ainda é usada para montar as camadas.
    const copy = rgba.slice();
    worker.postMessage({ rgba: copy, size, rig }, [copy.buffer]);
  });
