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

export function RoomConfetti({ compact = false }: { compact?: boolean }) {
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
  const face = place === 1 ? "#a779ef" : place === 2 ? "#f0ba65" : "#50bdc4";
  const depth = place === 1 ? "#51259b" : place === 2 ? "#b87941" : "#147b83";
  return (
    <svg
      className="room-trophy-frame room-solar-trophy"
      data-place={place}
      viewBox="0 0 240 240"
      aria-hidden="true"
    >
      <use href="/room-icons/room-trophies.svg#ring" />
      <path
        fill="var(--trophy-depth)"
        d="m50 106-33-31 4 38 29 20Zm0 42-39-16 12 35 33 7Zm17 38-42-1 25 29 29-8Zm123-80 33-31-4 38-29 20Zm0 42 39-16-12 35-33 7Zm-17 38 42-1-25 29-29-8Z"
      />
      <path
        fill="var(--trophy-face)"
        d="m17 75 33 31-1 21Zm-6 57 39 16 6 20Zm214-57-35 31 1 21Zm4 57-39 16-6 20Z"
      />
      <path fill={depth} d="m101 15 27-5 24 16 4 29-23 21-29-4-20-23 3-22Z" />
      <path fill={face} d="m101 9 27-5 24 16 4 29-23 21-29-4-20-23 3-22Z" />
      <path fill="#fff9ef" opacity=".4" d="m101 9 27-5-16 16-25 7Z" />
      <path fill={depth} d="m152 20 4 29-23 21-29-4 27-12 10-27Z" />
      {place === 1 ? (
        <>
          <path fill="#c99a00" d="m72 53 77-38 18 10-79 45Z" />
          <path fill="#facc15" d="m72 48 77-38 18 10-79 45-16-5 75-39Z" />
        </>
      ) : place === 2 ? (
        <>
          <path fill="#fff0c7" d="m89 27 63 4 4 11-69-7Zm10 23 55 2-11 11-37-5Z" />
          <path fill="#c95649" d="m130 46 14 3-3 8-13-2Z" />
        </>
      ) : (
        <path fill="#b8dc7b" d="m105 17 15-1 4 11-14 13-12-6-4-10Zm17 29 17-6 6 13-16 11-7-6Z" />
      )}
      <path
        fill="#ffe88d"
        d="m60 30 5 11 12 3-12 6-5 12-5-12-12-6 12-3Zm116 37 4 8 9 3-9 4-4 9-4-9-9-4 9-3Z"
      />
    </svg>
  );
}
