import type { SupportMessage, SupportTicket } from "../domain/support.js";

export const TICKET_TTL_SECONDS = 30 * 86400;
export const INBOX_KEY = "privateSupport/inbox";
export const ticketKey = (id: string) => `privateSupport/tickets/${id}`;

/** Estado da ponte com o Discord. Fica só no servidor e nunca vai para o navegador. */
export type RelayState = {
  /** Versão do aviso que a pessoa confirmou antes de a conversa seguir ao Discord. */
  consent?: { version: string; at: number };
  /** IDs de mensagens da pessoa ainda não entregues ao Discord. */
  pending: string[];
  /** Mensagens que o bot postou no canal, para poder apagá-las ao encerrar. */
  posted: string[];
  /** Mensagens a apagar que ficaram para uma próxima tentativa. */
  toDelete: string[];
  /** Reserva de envio: outro processo não envia antes disso, evitando mensagem duplicada. */
  lease?: number;
  failures: number;
};

/** Mensagem como o servidor a guarda: a da equipe leva o nome de quem respondeu. */
export type StoredSupportMessage = SupportMessage & { by?: string };

/** Entrega da conversa à equipe: pendente, entregue ou com falha repetida. */
export type SupportDelivery = "pending" | "delivered" | "failed";

/** O que a pessoa vê da conversa, além do que o tipo do domínio já traz. */
export type VisibleSupportTicket = Omit<SupportTicket, "messages"> & {
  messages: StoredSupportMessage[];
  /** Quem da equipe assumiu ou respondeu por último, e quando. */
  assignee?: { name: string; at: number };
  /** Quando a equipe encerrou a conversa. Uma mensagem nova da pessoa reabre. */
  closedAt?: number;
  delivery?: SupportDelivery;
};

export type StoredSupportTicket = Omit<VisibleSupportTicket, "delivery"> & { relay?: RelayState };

export function emptyRelay(): RelayState {
  return { pending: [], posted: [], toDelete: [], failures: 0 };
}

/** Só o que a pessoa pode ver. O estado da ponte, com IDs do Discord, nunca sai do servidor. */
export function publicTicket(ticket: StoredSupportTicket): VisibleSupportTicket {
  const { relay, ...visible } = ticket;
  const delivery: SupportDelivery | undefined = relay
    ? relay.pending.length > 0
      ? relay.failures >= 3
        ? "failed"
        : "pending"
      : relay.consent
        ? "delivered"
        : undefined
    : undefined;
  return { ...visible, ...(delivery ? { delivery } : {}) };
}
