import "./paper-digits.css";

export function BingoPlanet({ index, number }: { index: number; number?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={number ? "bingo-cell-planet" : "bingo-planet"}
      data-planet={["earth", "mars", "jupiter", "saturn", "neptune"][index]}
    >
      <use
        href={`/navigation-icons/paper/bingo-planets.svg#planet-${index}`}
        width="64"
        height="64"
      />
      {number && (
        <g className="bingo-planet-digits">
          {[...number].map((digit, i) => (
            <svg
              key={i}
              x={32 - number.length * 7.5 + i * 15}
              y="23"
              width="15"
              height="23"
              viewBox="0 0 66 98"
            >
              <use href={`/paper-digits.svg#digit-${digit}`} />
            </svg>
          ))}
        </g>
      )}
    </svg>
  );
}
