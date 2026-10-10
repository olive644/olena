// O estado público de uma sala ou caderno é lido direto no Firebase, sem passar pela API e sem
// limite de tentativas. Por isso o caminho dele não pode ser o código de 5 letras (cerca de 33
// milhões de combinações, testáveis em massa): cada sala ganha um identificador aleatório de 128
// bits, entregue só a quem entra pela API. O código curto continua sendo o que as pessoas digitam.
const LEGACY_CODE = /^[A-Z0-9]{5}$/;
const SECRET_ID = /^[a-f0-9]{32}$/;

export function createPublicStreamId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isPublicStreamId(value: string): boolean {
  return SECRET_ID.test(value) || LEGACY_CODE.test(value);
}

// Salas criadas antes desta mudança não têm identificador próprio e continuam publicadas pelo
// código até acabarem (no máximo quatro horas). Toda sala nova tem o seu.
export function publicStreamIdOf(state: { code: string; publicId?: string | undefined }): string {
  return state.publicId ?? state.code;
}
