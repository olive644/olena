import { analyzeIsland } from "../domain/island-motion";
import type { PlaceRig } from "../domain/place-rig";

/** Analisa a arte da ilha fora da thread principal: o carrossel nunca trava esperando por isso. */
type Request = { rgba: Uint8ClampedArray; size: number; rig?: PlaceRig };

self.onmessage = (event: MessageEvent<Request>) => {
  const model = analyzeIsland(event.data.rgba, event.data.size, event.data.rig);
  const transfer: Transferable[] = [model.labels.buffer, model.gold.buffer];
  if (model.place) {
    transfer.push(
      model.place.partMask.buffer,
      model.place.fillIndex.buffer,
      model.place.fillColor.buffer,
      model.place.clearIndex.buffer,
    );
    if (model.place.water) transfer.push(model.place.water.buffer);
  }
  self.postMessage(model, { transfer });
};
