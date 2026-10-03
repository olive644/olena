export function RoomPointsIcon({ xp = false }: { xp?: boolean }) {
  return (
    <svg
      className={`room-points-icon${xp ? " room-xp-icon" : ""}`}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path fill="var(--points-depth)" d="m24 4 7 13 14 3-10 11 1 15-12-7-14 7 3-15L3 20l15-3Z" />
      <path fill="currentColor" d="m24 1 7 13 14 3-10 11 1 15-12-7-14 7 3-15L3 17l15-3Z" />
      <path fill="var(--points-fold)" d="m24 1 0 24-21-8 15-3Zm0 24 12 18-1-15 10-11Z" />
    </svg>
  );
}

export function RoomAudioIcon({ playing = false }: { playing?: boolean }) {
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
  return (
    <svg
      className="room-seconds-unit room-points-icon"
      viewBox="0 0 66 98"
      aria-label="segundos"
      role="img"
    >
      <use href="/room-icons/room-stage.svg#seconds" />
    </svg>
  );
}

export function RoomClockIcon() {
  return (
    <svg className="room-clock-icon room-points-icon" viewBox="0 0 64 64" aria-hidden="true">
      <use href="/room-icons/room-stage.svg#clock" />
    </svg>
  );
}

export function RoomConfetti() {
  return (
    <span className="room-confetti" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} style={{ "--piece": i } as import("react").CSSProperties} />
      ))}
    </span>
  );
}

export function RoomEclipseBanner({ place }: { place: number }) {
  return (
    <svg
      className="room-eclipse-banner"
      viewBox="0 0 160 190"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <use href="/room-icons/room-stage.svg#banner" />
      <use href={`/room-icons/room-stage.svg#${place === 1 ? "solar" : "moon"}`} />
    </svg>
  );
}

export function RoomTrophyFrame({ place }: { place: number }) {
  return (
    <svg className="room-trophy-frame" data-place={place} viewBox="0 0 240 240" aria-hidden="true">
      <use href="/room-icons/room-trophies.svg#ring" />
      <use
        href={`/room-icons/room-trophies.svg#${place === 1 ? "solar" : place === 2 ? "lunar" : "blood"}`}
      />
    </svg>
  );
}
