type HelenaRoomIconProps = {
  name: "back" | "close" | "play";
  size?: number;
};

export function HelenaRoomIcon({ name, size = 20 }: HelenaRoomIconProps) {
  if (name === "back") {
    return (
      <svg
        className="helena-room-icon"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <path d="M11 5 4.5 12 11 19" />
        <path d="M5 12h14" />
        <path
          className="helena-room-icon__spark"
          d="m18.5 3 .7 1.7 1.8.8-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.8Z"
        />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg
        className="helena-room-icon"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <path d="m6.5 6.5 11 11m0-11-11 11" />
        <path
          className="helena-room-icon__spark"
          d="m18.5 2.5.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6Z"
        />
      </svg>
    );
  }

  return (
    <img
      className="room-paper-icon"
      src="/room-icons/play.svg"
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
    />
  );
}
