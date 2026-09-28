import qrcode from "qrcode-generator";

function isFinderModule(row: number, column: number, count: number) {
  return (
    (row < 7 && column < 7) || (row < 7 && column >= count - 7) || (row >= count - 7 && column < 7)
  );
}

function roundedCellPath(x: number, y: number, cell: number, radius: number) {
  const inner = cell - radius * 2;
  return `M${x + radius} ${y}h${inner}q${radius} 0 ${radius} ${radius}v${inner}q0 ${radius} -${radius} ${radius}h-${inner}q-${radius} 0 -${radius} -${radius}v-${inner}q0 -${radius} ${radius} -${radius}z`;
}

function FinderMark({ x, y, cell }: { x: number; y: number; cell: number }) {
  return (
    <g aria-hidden="true" data-qr-finder>
      <rect x={x} y={y} width={cell * 7} height={cell * 7} rx={cell * 0.12} fill="#0B5C66" />
      <rect
        x={x + cell}
        y={y + cell}
        width={cell * 5}
        height={cell * 5}
        rx={cell * 0.1}
        fill="#FFF9EF"
      />
      <rect
        x={x + cell * 2}
        y={y + cell * 2}
        width={cell * 3}
        height={cell * 3}
        rx={cell * 0.08}
        fill="#292432"
      />
    </g>
  );
}

export function RoomQrCode({ value, size = 152 }: { value: string; size?: number }) {
  const qr = qrcode(0, "H");
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const quietZone = (size * 4) / (count + 8);
  const qrSize = size - quietZone * 2;
  const cell = qrSize / count;
  let modules = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col) && !isFinderModule(row, col, count))
        modules += roundedCellPath(
          quietZone + col * cell,
          quietZone + row * cell,
          cell,
          cell * 0.18,
        );
    }
  }
  const finderOrigins = [
    [0, 0],
    [count - 7, 0],
    [0, count - 7],
  ] as const;
  const logoSize = qrSize * 0.24;

  return (
    <div className="helena-room-qr helena-room-qr--holding">
      <img
        src="/helena-room-invite.webp"
        alt="Helena erguendo a placa de convite da sala"
        width="840"
        height="840"
        fetchPriority="high"
        decoding="async"
      />
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label="QR code para entrar na sala"
        data-qr-error-correction="H"
      >
        <path d={modules} fill="#292432" shapeRendering="crispEdges" data-qr-modules />
        {finderOrigins.map(([column, row]) => (
          <FinderMark
            key={`${row}-${column}`}
            x={quietZone + column * cell}
            y={quietZone + row * cell}
            cell={cell}
          />
        ))}
        <image
          href="/olena-favicon-180.png"
          x={(size - logoSize) / 2}
          y={(size - logoSize) / 2}
          width={logoSize}
          height={logoSize}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          data-qr-logo
        />
      </svg>
    </div>
  );
}
