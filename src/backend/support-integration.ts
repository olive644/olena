import type { SupportMessage } from "../domain/support.js";

/** Contrato interno do servidor. Não inclui credenciais, e-mail ou UID do usuário. */
export type SupportRelayEvent = {
  version: 1;
  key: string;
  ticketId: string;
  messageId: string;
  text: string;
  at: number;
};

export interface SupportRelayTransport {
  deliver(event: SupportRelayEvent): Promise<{ externalMessageId: string }>;
}

export type SupportRelayConfiguration =
  { enabled: false } | { enabled: true; transport: SupportRelayTransport };

// Ativação requer integração própria, outbox durável e revisão de privacidade.
// Não ler variáveis ou chamar Discord neste módulo de preparação.
export const supportRelayConfiguration: SupportRelayConfiguration = { enabled: false };

export function supportRelayEvent(
  ticketId: string,
  message: SupportMessage,
): SupportRelayEvent | undefined {
  if (!/^[a-f0-9]{64}$/.test(ticketId)) throw new Error("invalid-support-ticket");
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(message.id))
    throw new Error("invalid-support-message");
  if (!Number.isFinite(message.at) || !message.text.trim() || message.text.length > 2000)
    throw new Error("invalid-support-message");
  // Respostas da equipe não voltam ao mesmo transporte, evitando ciclos.
  if (message.from !== "user") return undefined;
  return {
    version: 1,
    key: `support.v1:${ticketId}:${message.id}`,
    ticketId,
    messageId: message.id,
    text: message.text,
    at: message.at,
  };
}
