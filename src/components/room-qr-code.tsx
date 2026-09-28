import qrcode from "qrcode-generator";

export function RoomQrCode({ value, size = 152 }: { value: string; size?: number }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const quietZone = (size * 4) / (count + 8);
  const qrSize = size - quietZone * 2;
  const cell = qrSize / count;
  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) {
        path += `M${quietZone + col * cell},${quietZone + row * cell}h${cell}v${cell}h${-cell}z`;
      }
    }
  }
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
      >
        <rect width={size} height={size} fill="#fff" />
        <path d={path} fill="#292432" />
      </svg>
    </div>
  );
}
