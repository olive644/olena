/** X colorido aprovado, sem alterar os SVGs monocromáticos do editor. */
export function PaperCloseIcon() {
  return (
    <img
      className="paper-editor-icon agenda-close-icon"
      src="/navigation-icons/paper/agenda-close.svg"
      alt=""
      aria-hidden="true"
      data-paper-editor-icon="close"
    />
  );
}

/** O mesmo X colorido, para ficar ao lado de um texto dentro de um botão (sem a regra do botão só de ícone). */
export function PaperCloseGlyph({ size = 20 }: { size?: number }) {
  return (
    <img
      className="paper-close-glyph"
      src="/navigation-icons/paper/agenda-close.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      width={size}
      height={size}
    />
  );
}
