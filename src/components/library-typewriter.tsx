import "./library-typewriter.css";
/** Carriage motion inspired by Nawsome's Uiverse typewriter; original paper-cut artwork. */
export function LibraryTypewriter() {
  return (
    <svg className="library-typewriter" viewBox="0 0 180 150" aria-hidden="true">
      <g className="library-typewriter-carriage">
        <path d="M38 14h80l14 13v66H38Z" fill="#fff9ef" />
        <path d="m118 14 14 13h-14Z" fill="#d5c19e" />
        <path d="M51 34h55v4H51Zm0 12h65v4H51Zm0 12h43v4H51Z" fill="#bda78e" />
        <path d="M21 76h126v17H21Z" fill="#49324f" />
        <path d="M21 76h126v6H21Z" fill="#877194" />
        <path d="M12 72h10v25H12Zm135 0h12v25h-12Z" fill="#e8b65c" />
        <path d="M4 67h9v5h18v5H4Z" fill="#ffe597" />
      </g>
      <path d="M23 86h130l20 49-9 10H12l-8-10Z" fill="#7445b4" />
      <path d="m23 86 14 12h102l14-12Z" fill="#bd95ef" />
      <path d="m139 98 14-12 20 49-9 10h-14Z" fill="#49316d" />
      <path d="m4 135 8 10h152l9-10Z" fill="#352447" />
      <path d="M32 102h111l9 26H23Z" fill="#30263b" />
      {[0, 1, 2].map((row) => (
        <g key={row} className="library-typewriter-keys">
          {Array.from({ length: 8 }, (_, i) => (
            <path
              key={i}
              d={
                "M" +
                (34 + i * 13 - row * 2) +
                " " +
                (105 + row * 7) +
                "h9l2 4H" +
                (33 + i * 13 - row * 2) +
                "Z"
              }
              fill={row === 1 && i === 3 ? "#facc15" : "#fff2ce"}
            />
          ))}
        </g>
      ))}
      <path d="M55 130h69v5H55Z" fill="#e8b65c" />
      <path d="M72 90h31v8H72Z" fill="#2b8b83" />
      <path d="m72 90 6 4h25v-4Z" fill="#8fdfc3" />
    </svg>
  );
}
