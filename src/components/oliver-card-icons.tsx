export function OliverAttributeIcon({ kind }: { kind: "power" | "life" | "stamina" }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <use href={`/navigation-icons/paper/oliver-attributes.svg#${kind}`} width="32" height="32" />
    </svg>
  );
}
