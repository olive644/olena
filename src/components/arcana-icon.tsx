import { useId } from "react";
export type ArcanaIconName =
  | "all"
  | "major"
  | "minor"
  | "wands"
  | "cups"
  | "swords"
  | "pentacles"
  | "meaning"
  | "rarity"
  | "reversed"
  | "symbolism"
  | "characters"
  | "source";

// Recortes originais deste app, com facetas sólidas e base deslocada.
export function ArcanaIcon({ name }: { name: ArcanaIconName }) {
  const clip = useId();
  const shapes: Record<ArcanaIconName, string> = {
    all: "M4 8 17 4 25 34 12 38Z M23 4 38 4 38 38 24 38Z M39 8 49 13 40 42 29 38Z",
    major: "M26 2 32 17 49 20 36 31 39 47 26 39 12 47 15 31 2 20 20 17Z",
    minor:
      "M10 4 38 4 44 10 44 44 14 44 8 38 8 10Z M17 14 27 8 37 14 32 24 36 35 26 31 16 35 20 24Z",
    wands:
      "M9 42 15 46 41 10 35 5Z M34 6 33 2 42 3 46 11 40 15Z M19 26 8 22 10 15 22 22Z M26 23 29 12 36 12 31 26Z",
    cups: "M12 6 40 6 37 26 30 33 30 40 39 43 39 47 13 47 13 43 22 40 22 33 15 26Z M11 10 4 10 4 23 14 28 15 21 10 19 10 15 12 15Z M41 10 48 10 48 23 38 28 37 21 42 19 42 15 40 15Z",
    swords: "M26 1 34 12 30 32 41 30 43 36 30 38 30 47 22 47 22 38 9 36 11 30 22 32 18 12Z",
    pentacles: "M26 2 43 9 50 26 43 43 26 50 9 43 2 26 9 9Z",
    meaning: "M26 2 34 16 49 24 34 32 26 48 18 32 3 24 18 16Z",
    rarity: "M15 5 37 5 49 21 26 49 3 21Z",
    reversed:
      "M9 6 38 6 45 13 45 28 37 28 37 15 29 15 29 23 17 11Z M43 46 14 46 7 39 7 24 15 24 15 37 23 37 23 29 35 41Z",
    symbolism: "M2 26 14 12 26 8 38 12 50 26 38 40 26 44 14 40Z",
    characters:
      "M18 4 26 8 28 19 20 27 10 24 7 13Z M34 9 43 12 46 22 38 29 30 25 29 16Z M4 46 6 32 18 28 30 32 32 46Z M32 33 39 31 47 36 49 46 36 46Z",
    source: "M3 8 15 5 26 11 37 5 49 8 49 43 37 40 26 46 15 40 3 43Z",
  };
  return (
    <svg
      className={`arcana-icon arcana-icon--${name}`}
      viewBox="0 0 52 56"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <path d={shapes[name]} />
        </clipPath>
      </defs>
      <path fill="#51259b" d={shapes[name]} transform="translate(0 4)" />
      <path fill="#6d28d9" d={shapes[name]} />
      <path
        clipPath={`url(#${clip})`}
        fill="#8b5cf6"
        d={name === "swords" ? "M26 1 26 32 18 12Z" : "M9 9 26 3 26 26 9 38Z"}
      />
      {name === "pentacles" ? (
        <path fill="#facc15" d="m26 9 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" />
      ) : name === "symbolism" ? (
        <>
          <path fill="#facc15" d="m26 14 10 12-10 12-10-12Z" />
          <path fill="#51259b" d="m26 20 4 6-4 6-4-6Z" />
        </>
      ) : (
        <path
          fill="#facc15"
          d={
            name === "source"
              ? "M23 13 26 16 29 13 29 40 26 42 23 40Z"
              : "m26 18 3 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z"
          }
        />
      )}
    </svg>
  );
}
