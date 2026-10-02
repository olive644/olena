export function PaperCheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="paper-check-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path fill="currentColor" d="m2 11 4-4 5 5L20 2l3 4-12 16Z" />
      <path fill="#51465D" d="m2 11 9 11 1-6-6-9Z" />
    </svg>
  );
}
