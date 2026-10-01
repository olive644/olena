import type { ReactNode } from "react";

const ink = "#292432",
  facet = "#51465D",
  gold = "#FACC15",
  cream = "#FFF9EF";
const art: Record<string, ReactNode> = {
  book: (
    <>
      <path fill={ink} d="M5 10 22 7 25 12 42 8 43 37 26 41 22 38 5 41Z" />
      <path fill={cream} d="m9 13 11-2 2 23-12 3Zm17 2 12-3 1 22-12 3Z" />
      <path fill={gold} d="m29 12 5-1 1 16-3-3-3 4Z" />
    </>
  ),
  school: (
    <>
      <path fill={ink} d="M5 22 24 7 43 22 39 22 40 41H8V22Z" />
      <path fill={facet} d="m5 22 19-15 19 15H32L24 15 15 22Z" />
      <path fill={gold} d="M20 29h8v12h-8ZM12 24h5v6h-5ZM31 24h5v6h-5Z" />
    </>
  ),
  graduate: (
    <>
      <path fill={ink} d="m3 17 21-12 21 12-21 12ZM12 27l12 6 12-6v10l-12 6-12-6Z" />
      <path fill={facet} d="m3 17 21-12-5 14 5 10Z" />
      <path fill={gold} d="m24 15 18 5v14h-3V22l-16-4ZM38 33h6l-1 8h-5Z" />
    </>
  ),
  teacher: (
    <>
      <path fill={ink} d="M5 6h38v28H26l5 9h-5l-3-9-4 9h-5l5-9H5Z" />
      <path fill={facet} d="M5 6h38l-5 5H10v18l-5 5Z" />
      <path fill={gold} d="M14 15h20v3H14Zm0 7h12v3H14Z" />
    </>
  ),
  chat: (
    <>
      <path fill={facet} d="M16 16h27v20h-7l-7 8v-8H16Z" />
      <path fill={ink} d="m4 7 29-2 1 24-18 1-9 8 1-8H4Z" />
      <path fill={gold} d="M10 13h16v3H10Zm0 7h10v3H10Z" />
    </>
  ),
  calculator: (
    <>
      <path fill={ink} d="m9 5 29 2 2 35-31 1Z" />
      <path fill={facet} d="m9 5 29 2-5 5-20-2Z" />
      <path fill={cream} d="M14 13h19v8H14Z" />
      <path fill={gold} d="M14 26h6v5h-6Zm12 0h6v5h-6Zm-12 9h6v4h-6Zm12 0h6v4h-6Z" />
    </>
  ),
  science: (
    <>
      <path fill={ink} d="M17 5h15v5h-3v11l13 18-3 5H9l-3-5 14-18V10h-3Z" />
      <path fill={facet} d="M20 10h4v14L10 40l-4-1 14-18Z" />
      <path fill="#7C3AED" d="m16 29 17-1 7 11H9Z" />
      <path fill={gold} d="m20 30 5-2 3 5-6 2ZM27 19h4v4h-4Z" />
    </>
  ),
  globe: (
    <>
      <path fill={ink} d="m24 4 14 6 7 14-7 14-14 7-14-7-6-14 6-14Z" />
      <path fill={facet} d="M24 4 10 24l14 21-14-7-6-14 6-14Z" />
      <path fill={gold} d="m15 11 11-3 7 8-5 7-7-2-3 6-7-6Zm15 16 9-1-7 12-5 2-2-7Z" />
    </>
  ),
  art: (
    <>
      <path fill={ink} d="m5 33 25-29 12 11-25 29-13 1Z" />
      <path fill="#7C3AED" d="m9 32 20-24 6 5-21 24Z" />
      <path fill={gold} d="m4 45 2-12 10 9Z" />
      <path fill={facet} d="m18 40 22-25-4-3-21 25Z" />
    </>
  ),
  compass: (
    <>
      <path fill={ink} d="m24 4 18 12 2 16-19 13L6 34 4 17Z" />
      <path fill={facet} d="M24 4 4 17l2 17 9-10Z" />
      <path fill={gold} d="m32 12-4 17-15 9 5-18Z" />
      <path fill={cream} d="m24 24 4 5-15 9Z" />
    </>
  ),
  calendar: (
    <>
      <path fill={ink} d="M6 10h36l-2 33-33-1Z" />
      <path fill={facet} d="M6 10h36l-5 7H7Z" />
      <path fill={cream} d="M10 20h27v3H10Z" />
      <path fill={gold} d="M12 5h4v11h-4ZM30 5h4v11h-4ZM17 31l5 4 10-9 3 4-13 10-8-6Z" />
    </>
  ),
  exam: (
    <>
      <path fill={ink} d="M10 4h22l8 9-1 31H9Z" />
      <path fill={facet} d="M32 4v10h8Z" />
      <path fill={cream} d="M15 18h18v3H15Zm0 8h13v3H15Z" />
      <path fill={gold} d="m23 35 4 3 7-8 3 3-10 10-7-5Z" />
    </>
  ),
  bulb: (
    <>
      <path fill={ink} d="M17 31 8 20l2-11 14-6 14 7 2 11-9 10-1 12H18Z" />
      <path fill={gold} d="m24 7 11 6 1 7-9 10h-7L12 19l2-7Z" />
      <path fill="#FFE88D" d="m24 7-4 13 7 10h-7L12 19l2-7Z" />
      <path fill={cream} d="M20 34h9v3h-9Z" />
    </>
  ),
  group: (
    <>
      <path
        fill={facet}
        d="M4 15 10 10l7 4v9l-7 4-6-4Zm28-1 7-4 6 5v8l-6 4-7-4ZM2 31l8-3 8 3v12H2Zm28 0 9-3 8 3v12H30Z"
      />
      <path fill={ink} d="m17 6 7-3 8 4v12l-8 5-7-5Zm-4 24 11-4 12 4v15H13Z" />
      <path fill={gold} d="m21 32 7-1 1 8-7 1Z" />
    </>
  ),
  pause: (
    <>
      <path fill={ink} d="m7 8 13-2v36H7Zm21-2 13 2v34H28Z" />
      <path fill={facet} d="m7 8 13-2-4 8-9 2Zm21-2 13 2-4 7-9-1Z" />
      <path fill={gold} d="M9 31h8v4H9Zm22 0h7v4h-7Z" />
    </>
  ),
};

export function OnboardingPaperIcon({ name }: { name: string }) {
  if (name === "flag-us")
    return (
      <svg
        className="onboarding-paper-icon"
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        data-paper-icon={name}
      >
        <image href="/room-icons/english.svg" width="48" height="48" />
      </svg>
    );
  let drawing = art[name];
  if (name.startsWith("flag-")) {
    drawing = (
      <>
        <path fill="#b5a5c4" d="m4 12 39-3-1 31-37 3Z" />
        <g transform="translate(0 -3)">
          <path fill={name === "flag-br" ? "#27834A" : "#BE3341"} d="m4 12 39-3-1 31-37 3Z" />
          {name === "flag-br" ? (
            <>
              <path fill={gold} d="m23 14 16 11-16 13L8 27Z" />
              <circle fill="#333C88" cx="23" cy="26" r="7" />
              <path fill={cream} d="m17 22 13 5-1 2-13-5Z" />
            </>
          ) : name === "flag-es" ? (
            <>
              <path fill={gold} d="m4 20 39-3-1 15-37 3Z" />
              <path fill="#BE3341" d="M14 23h6v7l-3 2-3-2Z" />
            </>
          ) : (
            <>
              <path fill={cream} d="m5 17 37-3v3L5 20Zm0 8 37-3v3L5 28Zm0 8 37-3v3L5 36Z" />
              <path fill="#333C88" d="m4 12 18-1v16L5 28Z" />
              <path fill={cream} d="m9 16 2 2 3-2-1 3 2 2h-3l-1 3-1-3H7l2-2Z" />
            </>
          )}
          <path fill="#fff" opacity=".18" d="m4 12 39-3-16 7-22 15Z" />
        </g>
      </>
    );
  }
  if (name.startsWith("clock-"))
    drawing = (
      <>
        <path fill={ink} d="m19 3 12 1v5H19ZM24 10l13 5 6 13-7 13-14 5L8 37 5 23l7-10Z" />
        <path fill={facet} d="M24 10 12 24l10 22L8 37 5 23l7-10Z" />
        <path fill={cream} d="m24 15 10 4 4 10-5 10-10 3-11-8-2-10 6-7Z" />
        <path
          fill={gold}
          d={
            name === "clock-5"
              ? "M24 18v11l6-9Z"
              : name === "clock-15"
                ? "M24 18v11h11l-4-8Z"
                : "M24 18v22l10-6 1-8-5-6Z"
          }
        />
        <path fill={ink} d="M22 19h3v12h-3Z" />
      </>
    );
  return (
    <svg
      className="onboarding-paper-icon"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      data-paper-icon={name}
    >
      {drawing}
    </svg>
  );
}
