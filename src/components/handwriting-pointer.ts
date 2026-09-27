// A amostra principal pode ser mais recente que o lote agrupado pelo navegador.
// Mantê-la evita uma amostra de atraso em mouse, toque e mesas digitalizadoras.
export function pointerSamples(event: PointerEvent): PointerEvent[] {
  const samples = event.getCoalescedEvents?.() ?? [];
  const last = samples.at(-1);
  if (
    !last ||
    last.timeStamp !== event.timeStamp ||
    last.clientX !== event.clientX ||
    last.clientY !== event.clientY ||
    last.pressure !== event.pressure ||
    last.tiltX !== event.tiltX ||
    last.tiltY !== event.tiltY
  )
    return [...samples, event];
  return samples;
}
