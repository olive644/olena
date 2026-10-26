import { createHash } from "node:crypto";
import type { DiscordMessageBody, DiscordRest } from "./discord-rest.js";
import type { KvStore } from "./kv-store.js";
import {
  TICKET_TTL_SECONDS,
  emptyRelay,
  ticketKey,
  type StoredSupportMessage,
  type StoredSupportTicket,
} from "./support-keys.js";

/** Versão do aviso mostrado antes de a conversa seguir ao Discord. Trocar exige novo aceite. */
export const SUPPORT_NOTICE_VERSION = "2026-10-26";

const LEASE_MS = 20_000;
const MAX_PER_FLUSH = 5;
const MAX_TEAM_TEXT = 1800;
const MAX_MESSAGES = 100;
const CLOSE_BUDGET_MS = 2200;
const COMPONENT = 3;
const MODAL_SUBMIT = 5;
const RESPONSE_MESSAGE = 4;
const RESPONSE_MODAL = 9;
const EPHEMERAL = 64;

export type SupportInteraction = {
  id?: unknown;
  type?: unknown;
  channel_id?: unknown;
  channel?: { id?: unknown };
  member?: {
    roles?: unknown;
    nick?: unknown;
    user?: { global_name?: unknown; username?: unknown };
  };
  data?: { custom_id?: unknown; components?: unknown };
};

export type DiscordSupportOptions = {
  store: KvStore;
  rest: DiscordRest;
  channelId: string;
  staffRoleIds: readonly string[];
  /** Teto de ações da equipe por minuto. Sem limite configurado, nada é recusado. */
  consume?: () => Promise<boolean>;
  now?: () => number;
};

class Refusal extends Error {}

export function escapeMarkdown(text: string): string {
  return text.replace(/([\\*_~`|>#[\]()])/g, "\\$1");
}

function button(label: string, style: number, customId: string) {
  return { type: 2, style, label, custom_id: customId };
}

/** Mensagem da pessoa como chega ao canal: texto escapado e os botões de atendimento. */
export function ticketMessage(
  ticketId: string,
  message: StoredSupportMessage,
  position: number,
): DiscordMessageBody {
  return {
    embeds: [
      {
        title: `Ticket ${ticketId.slice(0, 8)}`,
        description: escapeMarkdown(message.text).slice(0, 3900),
        color: 0x7433e0,
        footer: { text: `Mensagem ${position}` },
        timestamp: new Date(message.at).toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          button("Responder", 1, `sup:reply:${ticketId}`),
          button("Assumir", 2, `sup:claim:${ticketId}`),
          button("Encerrar", 4, `sup:close:${ticketId}`),
        ],
      },
    ],
  };
}

function ephemeral(content: string) {
  return {
    type: RESPONSE_MESSAGE,
    data: { content, flags: EPHEMERAL, allowed_mentions: { parse: [] } },
  };
}

function teamMessageId(interactionId: string): string {
  const hash = createHash("sha256").update(`support-team:${interactionId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function staffName(interaction: SupportInteraction): string {
  const raw = [
    interaction.member?.nick,
    interaction.member?.user?.global_name,
    interaction.member?.user?.username,
  ].find((value): value is string => typeof value === "string" && value.trim() !== "");
  // Sem caracteres de controle e com tamanho limitado: o nome aparece na tela da pessoa.
  const clean = (raw ?? "")
    .replace(/\p{Cc}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return clean || "Equipe";
}

function submittedText(interaction: SupportInteraction): string {
  const rows = interaction.data?.components;
  if (!Array.isArray(rows)) return "";
  for (const row of rows as { components?: unknown }[]) {
    if (!row || !Array.isArray(row.components)) continue;
    for (const field of row.components as { custom_id?: unknown; value?: unknown }[])
      if (field?.custom_id === "text" && typeof field.value === "string") return field.value;
  }
  return "";
}

export function createDiscordSupport(options: DiscordSupportOptions) {
  const { store, rest, channelId, staffRoleIds } = options;
  const now = options.now ?? Date.now;

  // Lê, altera e grava o ticket com checagem de versão, repetindo se houver concorrência.
  async function mutate<T>(
    id: string,
    change: (ticket: StoredSupportTicket) => T,
  ): Promise<T | undefined> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const snapshot = await store.readVersion!(ticketKey(id));
      if (!snapshot.value) return undefined;
      const ticket = JSON.parse(snapshot.value) as StoredSupportTicket;
      const result = change(ticket);
      if (
        await store.compareAndSet!(
          ticketKey(id),
          JSON.stringify(ticket),
          TICKET_TTL_SECONDS,
          snapshot.version,
        )
      )
        return result;
    }
    throw new Error("support-conflict");
  }

  /** Apaga mensagens do canal. Devolve as que não deu para apagar nesta tentativa. */
  async function deleteMessages(ids: readonly string[], budgetMs: number): Promise<string[]> {
    const left: string[] = [];
    const started = now();
    for (let i = 0; i < ids.length; i += 5) {
      if (now() - started > budgetMs) {
        left.push(...ids.slice(i));
        break;
      }
      const chunk = ids.slice(i, i + 5);
      const results = await Promise.allSettled(
        chunk.map((id) => rest.deleteMessage(channelId, id)),
      );
      results.forEach((result, index) => {
        if (result.status === "rejected") left.push(chunk[index]!);
      });
    }
    return left;
  }

  return {
    noticeVersion: SUPPORT_NOTICE_VERSION,

    /** Marca a mensagem como pendente, dentro da mesma gravação do ticket (fila durável). */
    enqueue(ticket: StoredSupportTicket, messageId: string, consentVersion: string): void {
      const relay = (ticket.relay ??= emptyRelay());
      if (relay.consent?.version !== consentVersion)
        relay.consent = { version: consentVersion, at: now() };
      relay.pending.push(messageId);
      // Mensagem nova de uma conversa encerrada reabre e recomeça sem a pessoa anterior.
      delete ticket.closedAt;
      delete ticket.assignee;
    },

    /** Entrega ao canal o que estiver pendente. Falhas ficam pendentes e nunca lançam. */
    async flush(ticketId: string): Promise<void> {
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const snapshot = await store.readVersion!(ticketKey(ticketId));
          if (!snapshot.value) return;
          const ticket = JSON.parse(snapshot.value) as StoredSupportTicket;
          const relay = ticket.relay;
          if (!relay || relay.pending.length === 0) return;
          if (relay.lease && relay.lease > now()) return;
          relay.lease = now() + LEASE_MS;
          if (
            !(await store.compareAndSet!(
              ticketKey(ticketId),
              JSON.stringify(ticket),
              TICKET_TTL_SECONDS,
              snapshot.version,
            ))
          )
            continue;
          const delivered: { appId: string; discordId: string }[] = [];
          let failed = false;
          for (const appId of relay.pending.slice(0, MAX_PER_FLUSH)) {
            const index = ticket.messages.findIndex((message) => message.id === appId);
            const message = ticket.messages[index];
            if (!message) {
              delivered.push({ appId, discordId: "" });
              continue;
            }
            try {
              const saved = await rest.createMessage(
                channelId,
                ticketMessage(ticketId, message, index + 1),
              );
              delivered.push({ appId, discordId: saved.id });
            } catch {
              failed = true;
              break;
            }
          }
          const posted = delivered.filter((item) => item.discordId).map((item) => item.discordId);
          for (let retry = 0; retry < 4; retry++) {
            const latest = await store.readVersion!(ticketKey(ticketId));
            if (!latest.value) {
              // A conta foi apagada enquanto enviávamos: não deixar rastro no canal.
              await deleteMessages(posted, 5000);
              return;
            }
            const current = JSON.parse(latest.value) as StoredSupportTicket;
            const state = (current.relay ??= emptyRelay());
            state.pending = state.pending.filter(
              (id) => !delivered.some((item) => item.appId === id),
            );
            if (current.closedAt) state.toDelete.push(...posted);
            else state.posted.push(...posted);
            delete state.lease;
            state.failures = failed ? state.failures + 1 : 0;
            if (
              await store.compareAndSet!(
                ticketKey(ticketId),
                JSON.stringify(current),
                TICKET_TTL_SECONDS,
                latest.version,
              )
            )
              break;
          }
          return;
        }
      } catch {
        /* Falha de rede ou do banco: o que ficou pendente é tentado de novo depois. */
      }
    },

    /** Remove do canal tudo o que o bot postou para este ticket (exclusão de conta). */
    async purge(ticketId: string): Promise<void> {
      const snapshot = await store.get(ticketKey(ticketId));
      if (!snapshot) return;
      const relay = (JSON.parse(snapshot) as StoredSupportTicket).relay;
      if (!relay) return;
      await deleteMessages([...relay.posted, ...relay.toDelete], 20_000);
    },

    /** Botões e formulários da equipe. Só chega aqui interação de servidor já autorizado. */
    async handleInteraction(interaction: SupportInteraction): Promise<unknown> {
      const channel = interaction.channel_id ?? interaction.channel?.id;
      const roles = interaction.member?.roles;
      const isStaff =
        channel === channelId &&
        Array.isArray(roles) &&
        roles.some((role) => typeof role === "string" && staffRoleIds.includes(role));
      if (!isStaff) return ephemeral("Você não tem permissão para atender tickets.");
      if (options.consume && !(await options.consume()))
        return ephemeral("Muitas ações em pouco tempo. Aguarde um instante.");
      const customId = interaction.data?.custom_id;
      const match =
        typeof customId === "string"
          ? /^sup:(reply|claim|close|send):([a-f0-9]{64})$/.exec(customId)
          : null;
      if (!match) return ephemeral("Ação desconhecida.");
      const action = match[1]!;
      const ticketId = match[2]!;
      const name = staffName(interaction);
      try {
        if (interaction.type === COMPONENT && action === "reply") {
          const snapshot = await store.get(ticketKey(ticketId));
          const ticket = snapshot ? (JSON.parse(snapshot) as StoredSupportTicket) : undefined;
          if (!ticket) return ephemeral("Esta conversa não existe mais.");
          if (ticket.closedAt) return ephemeral("Esta conversa já foi encerrada.");
          return {
            type: RESPONSE_MODAL,
            data: {
              custom_id: `sup:send:${ticketId}`,
              title: "Responder ao usuário",
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 4,
                      custom_id: "text",
                      style: 2,
                      label: "Sua resposta",
                      min_length: 1,
                      max_length: MAX_TEAM_TEXT,
                      required: true,
                    },
                  ],
                },
              ],
            },
          };
        }
        if (interaction.type === COMPONENT && action === "claim") {
          const outcome = await mutate(ticketId, (ticket) => {
            if (ticket.closedAt) throw new Refusal("Esta conversa já foi encerrada.");
            ticket.assignee = { name, at: now() };
            return "ok" as const;
          });
          if (!outcome) return ephemeral("Esta conversa não existe mais.");
          return ephemeral(
            `Você assumiu o ticket ${ticketId.slice(0, 8)}. A pessoa vai ver o seu nome.`,
          );
        }
        if (interaction.type === MODAL_SUBMIT && action === "send") {
          const text = submittedText(interaction).trim();
          if (!text) return ephemeral("Escreva uma resposta.");
          if (text.length > MAX_TEAM_TEXT) return ephemeral("Resposta muito longa.");
          const interactionId = typeof interaction.id === "string" ? interaction.id : "";
          if (!/^\d{5,25}$/.test(interactionId)) return ephemeral("Interação inválida.");
          const messageId = teamMessageId(interactionId);
          const outcome = await mutate(ticketId, (ticket) => {
            if (ticket.closedAt) throw new Refusal("Esta conversa já foi encerrada.");
            if (ticket.messages.some((message) => message.id === messageId))
              return "duplicate" as const;
            if (ticket.messages.length >= MAX_MESSAGES)
              throw new Refusal("Esta conversa atingiu o limite de 100 mensagens.");
            ticket.messages.push({ id: messageId, text, at: now(), from: "team", by: name });
            ticket.updatedAt = now();
            ticket.assignee = { name, at: now() };
            return "saved" as const;
          });
          if (!outcome) return ephemeral("Esta conversa não existe mais.");
          if (outcome === "saved") {
            // Registro da resposta no canal, também apagado ao encerrar.
            try {
              const logged = await rest.createMessage(channelId, {
                embeds: [
                  {
                    title: `Ticket ${ticketId.slice(0, 8)}`,
                    description:
                      `**${escapeMarkdown(name)}** respondeu:\n${escapeMarkdown(text)}`.slice(
                        0,
                        3900,
                      ),
                    color: 0x138a91,
                  },
                ],
              });
              await mutate(ticketId, (ticket) => {
                const state = (ticket.relay ??= emptyRelay());
                if (ticket.closedAt) state.toDelete.push(logged.id);
                else state.posted.push(logged.id);
              });
            } catch {
              /* A resposta já está salva para a pessoa; só o registro no canal falhou. */
            }
          }
          return ephemeral("Resposta enviada. A pessoa vai vê-la no aplicativo.");
        }
        if (interaction.type === COMPONENT && action === "close") {
          const ids = await mutate(ticketId, (ticket) => {
            if (ticket.closedAt) return [] as string[];
            const state = (ticket.relay ??= emptyRelay());
            const all = [...state.posted, ...state.toDelete];
            state.posted = [];
            state.toDelete = all;
            ticket.closedAt = now();
            delete ticket.assignee;
            return all;
          });
          if (ids === undefined) return ephemeral("Esta conversa não existe mais.");
          const left = await deleteMessages(ids, CLOSE_BUDGET_MS);
          await mutate(ticketId, (ticket) => {
            if (ticket.relay) ticket.relay.toDelete = left;
          });
          return ephemeral(
            left.length === 0
              ? "Conversa encerrada. As mensagens do ticket foram apagadas do canal."
              : `Conversa encerrada. ${left.length} mensagem(ns) ainda serão apagadas em breve.`,
          );
        }
      } catch (error) {
        if (error instanceof Refusal) return ephemeral(error.message);
        return ephemeral("Não foi possível concluir agora. Tente de novo em instantes.");
      }
      return ephemeral("Ação desconhecida.");
    },
  };
}

export type DiscordSupport = ReturnType<typeof createDiscordSupport>;
