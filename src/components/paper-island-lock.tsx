/** Cadeado original das ilhas gerais, compartilhado por todos os destinos bloqueados. */
export function PaperIslandLock() {
  return (
    <svg
      className="paper-island-lock"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M6 10V7a6 6 0 0 1 12 0v3h-3V7a3 3 0 0 0-6 0v3Z" fill="#facc15" />
      <path d="m3 10 18 0v11H3Z" fill="#e8c275" />
      <path d="m3 10 18 0-3 3H6v8H3Z" fill="#fff1c2" />
      <path d="M11 14h2v4h-2Z" fill="#333142" />
    </svg>
  );
}
