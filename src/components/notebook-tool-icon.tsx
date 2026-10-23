export function NotebookToolIcon({ name }: { name: "cover" | "index" }) {
  return (
    <svg viewBox="0 0 40 40" className="paper-tab-icon" aria-hidden="true">
      <use href={`/navigation-icons/paper/notebook-tools.svg#${name}`} width="40" height="40" />
    </svg>
  );
}
