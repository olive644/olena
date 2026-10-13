import { analyzeIsland } from "../domain/island-motion";

/** Analisa a arte da ilha fora da thread principal: o carrossel nunca trava esperando por isso. */
type Request = { rgba: Uint8ClampedArray; size: number };

self.onmessage = (event: MessageEvent<Request>) => {
  const model = analyzeIsland(event.data.rgba, event.data.size);
  self.postMessage(model, { transfer: [model.labels.buffer, model.gold.buffer] });
};
