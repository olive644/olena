import { uiText, useLanguage } from "../i18n/runtime";
export function RoomPointsIcon({ xp = false }: { xp?: boolean }) {
  useLanguage();

  return (
    <svg
      className={`room-points-icon${xp ? " room-xp-icon" : ""}`}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <use href="/room-icons/points.svg#points" />
    </svg>
  );
}

export function RoomAudioIcon({ playing = false }: { playing?: boolean }) {
  useLanguage();

  return (
    <svg
      className={`room-audio-icon${playing ? " is-playing" : ""}`}
      viewBox="0 0 72 68"
      aria-hidden="true"
    >
      <use href="/room-icons/room-stage.svg#audio" />
    </svg>
  );
}

export function RoomSecondsUnit() {
  useLanguage();

  return (
    <svg
      className="room-seconds-unit room-points-icon"
      viewBox="0 0 66 98"
      aria-label={uiText(966)}
      role="img"
    >
      <use href="/room-icons/room-stage.svg#seconds" />
    </svg>
  );
}

export function RoomClockIcon() {
  useLanguage();

  return (
    <svg className="room-clock-icon room-points-icon" viewBox="0 0 64 64" aria-hidden="true">
      <use href="/room-icons/room-stage.svg#clock" />
    </svg>
  );
}

export function RoomConfetti({ compact = false }: { compact?: boolean }) {
  useLanguage();

  return (
    <span className="room-confetti" aria-hidden="true">
      {Array.from({ length: 48 }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--piece": i,
              "--burst-x": `${Math.cos(i * 2.4) * (compact ? 18 + (i % 7) * 2 : 70 + (i % 7) * 14)}px`,
              "--burst-y": `${compact ? -16 - (i % 9) * 2 : -60 - (i % 9) * 14}px`,
              "--fall-x": `${Math.cos(i * 2.4) * (compact ? 22 + (i % 7) * 2 : 100 + (i % 7) * 14)}px`,
              "--turn": `${180 + i * 23}deg`,
            } as import("react").CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function RoomEclipseBanner({ place, solar = false }: { place: number; solar?: boolean }) {
  useLanguage();

  return (
    <svg
      className="room-eclipse-banner"
      viewBox="0 0 160 190"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <use href="/room-icons/room-stage.svg#banner" />
      {!solar && <use href={`/room-icons/room-stage.svg#${place === 1 ? "solar" : "moon"}`} />}
      {solar && (
        <>
          <path fill="#ffe88d" d="m15 18 5 10 11 2-8 7 2 11-10-5-10 5 2-11-8-7 11-2Z" />
          <path fill="#50bdc4" d="m118 154 16-5 15 10-4 16-18 5-12-13Z" />
          <path fill="#147b83" d="m134 149 15 10-4 16-18 5 10-14Z" />
        </>
      )}
    </svg>
  );
}

export function RoomTrophyFrame({ place }: { place: number }) {
  useLanguage();

  return (
    <svg className="room-trophy-frame" data-place={place} viewBox="0 0 240 240" aria-hidden="true">
      <use href="/room-icons/room-trophies.svg#ring" />
      <use
        href={`/room-icons/room-trophies.svg#${place === 1 ? "solar" : place === 2 ? "lunar" : "blood"}`}
      />
    </svg>
  );
}

export function RoomSolarTrophyFrame({ place }: { place: number }) {
  return (
    <svg
      className="room-trophy-frame room-solar-trophy"
      data-place={place}
      viewBox="0 0 240 240"
      aria-hidden="true"
    >
      <use href={`/room-icons/solar-frames.svg#p${place === 1 ? 1 : place === 2 ? 2 : 3}`} />
    </svg>
  );
}
