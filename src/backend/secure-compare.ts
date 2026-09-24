import { createHash, timingSafeEqual } from "node:crypto";

// Compara segredos (tokens de anfitrião e de participante) sem revelar, pelo
// tempo de resposta, quantos caracteres iniciais batem. O hash SHA-256 iguala
// o tamanho das duas entradas, porque timingSafeEqual exige buffers do mesmo
// comprimento e o comprimento do segredo não deve vazar.
// Um segredo ausente (undefined) nunca é igual a nada, nem à credencial vazia.
export function safeEqual(a: string | undefined, b: string): boolean {
  if (a === undefined) return false;
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}
