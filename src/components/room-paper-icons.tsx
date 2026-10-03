export function RoomPointsIcon() {
  return (
    <svg className="room-points-icon" viewBox="0 0 48 48" aria-hidden="true">
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
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <path fill="#51259B" d="M8 23h14l19-14v48L22 43H8Z" />
      <path fill="#7C3AED" d="M6 19h14L39 5v48L20 39H6Z" />
      <path fill="#A779EF" d="m6 19 14 0 19-14-19 22H6Z" />
      <path fill="#FFF9EF" d="m20 27 19-22v48L20 39Z" />
      <path
        fill="#FACC15"
        d="m44 20 7-7 7 11v16l-7 11-7-7 6-8v-8Zm13-16 7 14v28l-7 14-5-5 7-13V22L52 9Z"
      />
    </svg>
  );
}

export function RoomTrophyFrame({ place }: { place: number }) {
  return (
    <svg className="room-trophy-frame" data-place={place} viewBox="0 0 240 240" aria-hidden="true">
      <path
        fill="var(--trophy-depth)"
        d="m24 64 47 11 30 30-44-11-28-17Zm192 0-47 11-30 30 44-11 28-17Z"
      />
      <path
        fill="var(--trophy-face)"
        d="m18 52 48 12 36 30-39-8-28-17Zm204 0-48 12-36 30 39-8 28-17Z"
      />
      <path fill="var(--trophy-fold)" d="m18 52 48 12 16 14-43-12Zm204 0-48 12-16 14 43-12Z" />
      <path
        fill="var(--trophy-face)"
        fillRule="evenodd"
        d="m120 64 47 18 26 47-6 46-31 33-44 8-41-21-22-39 6-44 28-32Zm0 13-36 12-24 28-3 36 18 33 35 17 40-7 26-29 4-35-23-38Z"
      />
      <path fill="var(--trophy-depth)" d="m187 175-31 33-44 8-41-21 39 10 40-7 26-29Z" />
      {[-1, 1].map((side) => (
        <g key={side} transform={side === -1 ? "translate(240 0) scale(-1 1)" : undefined}>
          <path
            fill="var(--trophy-face)"
            d="m51 131-21-12 4 23 19 9Zm1 24-23-3 10 21 19 2Zm12 22-22 6 19 16 18-5Zm19 17-15 17 24 6 12-15Z"
          />
          <path
            fill="var(--trophy-fold)"
            d="m30 119 23 32-19-9Zm-1 33 29 23-19-2Zm13 31 37 11-18 5Z"
          />
        </g>
      ))}
      <path fill="var(--trophy-depth)" d="m86 43 34 14 34-14-7 33H93Z" />
      <path fill="var(--trophy-face)" d="m84 30 21 15 15-28 15 28 21-15-10 35H94Z" />
      <path fill="var(--trophy-fold)" d="m84 30 21 15 15-28v35H95Z" />
      <path fill="#FFF9EF" d="m120 28 6 10 12 2-9 9 1 12-10-6-10 6 1-12-9-9 12-2Z" />
      <path fill="var(--trophy-face)" d="m99 213 21-7 21 7-7 13h-28Z" />
    </svg>
  );
}
