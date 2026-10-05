import {
  isValidLocalRoomCode,
  normalizeLocalRoomCode,
  readLocalRoomCodeFromUrl,
} from "./room-code";

export function roomCodeFromQr(value: string, origin: string): string | undefined {
  if (isValidLocalRoomCode(value)) return normalizeLocalRoomCode(value);
  try {
    const url = new URL(value);
    if (url.origin !== origin && url.origin !== "https://olenastudy.vercel.app") return undefined;
    return readLocalRoomCodeFromUrl(url.href);
  } catch {
    return undefined;
  }
}
