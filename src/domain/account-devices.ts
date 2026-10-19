export type AccountDevice = {
  id: string;
  browser: string;
  system: string;
  lastSeen: number;
};
export const DEVICE_RETENTION_MS = 90 * 86400_000;
export const DEVICE_LIMIT = 30;

// Só nomes amplos, sem versão completa, IP, localização ou impressão digital.
export function deviceDescription(agent: string) {
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /OPR\//.test(agent)
      ? "Opera"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Chrome\/|CriOS\//.test(agent)
          ? "Chrome"
          : /Safari\//.test(agent)
            ? "Safari"
            : "Browser";
  const system = /Android/.test(agent)
    ? "Android"
    : /iPhone|iPad|iPod/.test(agent)
      ? "iOS"
      : /Windows/.test(agent)
        ? "Windows"
        : /Macintosh|Mac OS/.test(agent)
          ? "macOS"
          : /Linux/.test(agent)
            ? "Linux"
            : "Other";
  return { browser, system };
}
