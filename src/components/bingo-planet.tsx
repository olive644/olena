const bodies = ["#50bdc4", "#ff8e77", "#f0ba65", "#7c3aed", "#6996df"];
const shadows = ["#147b83", "#c95649", "#b87941", "#51259b", "#345580"];
export function BingoPlanet({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="bingo-planet">
      {index === 3 && <path d="M5 40 47 13 61 19 19 49Z" fill="#c99a00" />}
      <path d="m19 10 23-2 16 17-3 22-20 12-22-10-8-21Z" fill={bodies[index]} />
      <path d="m42 8 16 17-3 22-20 12-22-10 23-5 12-19Z" fill={shadows[index]} />
      <path d="m19 10 23-2-9 9-18 4-10 7Z" fill="#fff9ef" opacity=".4" />
      {index === 0 && (
        <path d="m20 16 10-1 3 9-8 8-10-4-1-7Zm12 22 9-4 6 8-8 9-5-2Z" fill="#b8dc7b" />
      )}
      {index === 1 && (
        <>
          <path d="m17 24 9-3 4 8-7 5-8-4Zm16 15 8-2 4 6-6 5Z" fill="#f4b694" />
          <path d="m24 43 6-2 3 4-5 3Z" fill="#8e383e" />
        </>
      )}
      {index === 2 && (
        <>
          <path d="m9 24 46 2 3 7-47-3Zm5 14 40 2-2 8-33-3Z" fill="#fff0c7" />
          <path d="m35 37 9 1 5 5-8 4-7-3Z" fill="#c95649" />
        </>
      )}
      {index === 3 && <path d="m3 39 51-24 8 4-51 29-8-3 46-25Z" fill="#facc15" />}
      {index === 4 && <path d="m12 25 39-5 6 6-44 7Zm7 14 33-5-3 8-22 4Z" fill="#a4e8eb" />}
    </svg>
  );
}
