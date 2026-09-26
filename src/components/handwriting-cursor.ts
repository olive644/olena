// Cor estável de cada participante, derivada do id, para o mesmo colega ter sempre a mesma cor.
const CURSOR_COLORS = ["#d6336c", "#1c7ed6", "#2b8a3e", "#e8590c", "#7048e8", "#0c8599"];

export function cursorColor(participantId: string): string {
  let hash = 0;
  for (const char of participantId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CURSOR_COLORS[hash % CURSOR_COLORS.length]!;
}
