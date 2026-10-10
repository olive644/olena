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
      <path fill="#292432" opacity=".15" d="m9 78 63-4 18 6-59 7Z" />
      <path fill={arcane ? "#292432" : "#51465D"} d="m8 38 66-3 14 9-3 29-12 8-62-5Z" />
      <path fill={arcane ? "#51259B" : "#79695F"} d="m12 44 61-1-1 32-60-4Z" />
      <path fill={arcane ? "#7C3AED" : "#AA9780"} d="m12 44 61-1-34 13-27 15Z" />
      <path fill="#211D29" d="m73 43 15-7-3 37-13 8Z" />
      <path fill={arcane ? "#FACC15" : "#9299A1"} d="M17 43h8v29l-8-1Zm45 0h8v32l-8-1Z" />
      <path fill={arcane ? "#FFE88D" : "#D3D7D8"} d="m17 43 4 0v28l-4 0Zm45 0h4v31h-4Z" />
      <g className="math-chest-lid">
        <path fill="#292432" d="m8 42 6-23 9-7 48-1 14 9 4 23-16 8-65-3Z" />
        <path fill={arcane ? "#7C3AED" : "#AA9780"} d="m19 23 8-7h40l12 8 3 14-67 3Z" />
        <path fill={arcane ? "#A779EF" : "#D5C8B0"} d="m19 23 8-7h40L41 40l-26 1Z" />
        <path fill={arcane ? "#FACC15" : "#9299A1"} d="m27 16 7 0-5 24-8 1Zm34 0h6l5 23h-8Z" />
        <path fill={arcane ? "#FFE88D" : "#D3D7D8"} d="m9 41 65-3 15-7v12l-16 8-65-3Z" />
        <path fill={arcane ? "#FACC15" : "#9299A1"} d="m9 45 64 1 16-6v3l-16 8-65-3Z" />
      </g>
      {arcane ? (
        <g>
          <path fill="#292432" d="m45 39 6 8 11 2-8 8 1 11-11-5-10 5 2-12-8-7 12-2Z" />
          <path fill="#FACC15" d="m45 40 3 10 10 0-8 6 3 10-9-6-8 6 3-10-8-6h10Z" />
          <path fill="#FFE88D" d="m45 40 0 20-9 6 3-10-8-6h10Z" />
        </g>
      ) : (
        <g>
          <path fill="#292432" d="m36 41 16 0 5 5-1 16-9 5-12-4Z" />
          <path fill="#D3D7D8" d="m39 44 11 0 3 3-1 13-7 4-8-3Z" />
          <path fill="#51465D" d="m45 49 5 3-3 4v4h-4v-5l-2-3Z" />
        </g>
      )}
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
