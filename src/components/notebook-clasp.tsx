/** Lacre único: verso, medalhão e espessura giram presos à mesma dobradiça. */
export function NotebookClasp({ className = "" }: { className?: string }) {
  return (
    <span className={"book-cover__clasp " + className} aria-hidden="true">
      <i />
      <b className="book-cover__clasp-edge" />
    </span>
  );
}
