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

// Botões da caneta. O navegador conta o botão de duas formas: `button` diz qual botão mudou neste
// evento e `buttons` é a máscara dos que estão apertados. Quem segura o botão lateral (barril,
// bit 2) ANTES de encostar na tela gera um toque com `button === 0` e `buttons === 3`; só olhar
// `button` perdia esse caso, comum na S Pen. O mesmo vale para a ponta de borracha (bit 32).
export type PenButtonInput = { pointerType: string; button: number; buttons: number };

export function isPenBarrelButton(event: PenButtonInput): boolean {
  return event.pointerType === "pen" && (event.button === 2 || (event.buttons & 2) !== 0);
}

export function isPenEraserTip(event: PenButtonInput): boolean {
  return event.pointerType === "pen" && (event.button === 5 || (event.buttons & 32) !== 0);
}
