export function MathChestArt({
  open = false,
  arcane = false,
}: {
  open?: boolean;
  arcane?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 96 88"
      className={`math-common-chest${open ? " is-open" : ""}${arcane ? " is-arcane" : ""}`}
      aria-hidden="true"
    >
      <use
        href={`/navigation-icons/paper/math-chests.svg#${arcane ? "arcane" : "common"}-body`}
        width="96"
        height="88"
      />
      <g className="math-chest-lid">
        <use
          href={`/navigation-icons/paper/math-chests.svg#${arcane ? "arcane" : "common"}-lid`}
          width="96"
          height="88"
        />
      </g>
      <use
        href={`/navigation-icons/paper/math-chests.svg#${arcane ? "arcane" : "common"}-lock`}
        width="96"
        height="88"
      />
      {open && (
        <path
          className="math-chest-glow"
          fill={arcane ? "#A779EF" : "#FFE88D"}
          d="m46 4 4 13 14 1-11 8 3 13-11-8-11 8 4-13-11-8 14-1Z"
        />
      )}
    </svg>
  );
}
