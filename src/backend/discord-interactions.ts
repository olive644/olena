import { createPublicKey, verify } from "node:crypto";
import type { SupportInteraction } from "./discord-support.js";

// Prefixo DER (SPKI) de uma chave pública Ed25519; os 32 bytes da chave vêm logo depois.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const MAX_BODY_BYTES = 16_384;
// O Discord assina o carimbo de tempo junto com o corpo. Fora desta janela é reenvio.
const MAX_SKEW_SECONDS = 300;
const PING = 1;
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const EPHEMERAL = 64;
const APPLICATION_COMMAND = 2;
const COMPONENT = 3;
const MODAL_SUBMIT = 5;
const CHAT_INPUT = 1;

/**
 * Respostas dos comandos de barra. Os nomes e as descrições registrados no Discord ficam em
 * scripts/discord-commands.json, e um teste garante que as duas listas andam juntas.
 */
export const DISCORD_COMMAND_REPLIES: Readonly<Record<string, string>> = {
  ajuda:
    "Sou o bot de atendimento do OlenaStudy. Comandos: /ajuda mostra esta mensagem e /status mostra se estou respondendo. O atendimento por tickets ainda não está ativo.",
  status: "Estou respondendo. O atendimento por aqui ainda não está ativo.",
};

export type DiscordInteractionsOptions = {
  /** Chave pública do aplicativo (64 caracteres hexadecimais). Ausente ou inválida recusa tudo. */
  publicKey: string | undefined;
  /** IDs dos servidores atendidos. Interações de outros servidores recebem recusa. */
  allowedGuildIds: readonly string[];
  /** Atendimento por tickets: botões e formulários da equipe. Ausente, o bot só responde comandos. */
  support?: { handleInteraction(interaction: SupportInteraction): Promise<unknown> };
  now?: () => number;
};

export function verifyDiscordSignature(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string,
): boolean {
  if (!/^[0-9a-f]{64}$/i.test(publicKeyHex) || !/^[0-9a-f]{128}$/i.test(signatureHex)) return false;
  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}

/**
 * Ponto de entrada das interações do Discord (botões, comandos de barra, formulários).
 * Sem conexão contínua: o Discord chama este endereço a cada interação e a função responde.
 * Esta etapa só valida a origem e responde ao PING; o atendimento ainda não está ativo.
 */
export function createDiscordInteractionsHandler(options: DiscordInteractionsOptions) {
  const now = options.now ?? Date.now;
  const reply = (status: number, value: unknown, extra: Record<string, string> = {}) =>
    Response.json(value, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        ...extra,
      },
    });
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST")
      return reply(405, { error: "Método não permitido." }, { Allow: "POST" });
    // Sem chave configurada não há como provar a origem: recusa tudo em vez de aceitar sem checar.
    if (!options.publicKey || !/^[0-9a-f]{64}$/i.test(options.publicKey))
      return reply(503, { error: "Integração não configurada." });
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES)
      return reply(413, { error: "Pedido muito grande." });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES)
      return reply(413, { error: "Pedido muito grande." });
    const signature = request.headers.get("x-signature-ed25519") ?? "";
    const timestamp = request.headers.get("x-signature-timestamp") ?? "";
    if (!verifyDiscordSignature(options.publicKey, signature, timestamp, raw))
      return reply(401, { error: "Assinatura inválida." });
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds) || Math.abs(now() / 1000 - seconds) > MAX_SKEW_SECONDS)
      return reply(401, { error: "Carimbo de tempo fora da janela." });
    let interaction: unknown;
    try {
      interaction = JSON.parse(raw);
    } catch {
      return reply(400, { error: "Corpo inválido." });
    }
    if (!interaction || typeof interaction !== "object" || Array.isArray(interaction))
      return reply(400, { error: "Corpo inválido." });
    const { type, guild_id: guildId } = interaction as { type?: unknown; guild_id?: unknown };
    if (type === PING) return reply(200, { type: PONG });
    if (typeof type !== "number") return reply(400, { error: "Interação inválida." });
    // Só quem chamou vê a resposta, e nenhuma menção é processada, mesmo que o texto tenha uma.
    const refuse = (content: string) =>
      reply(200, {
        type: CHANNEL_MESSAGE,
        data: { content, flags: EPHEMERAL, allowed_mentions: { parse: [] } },
      });
    if (typeof guildId !== "string" || !options.allowedGuildIds.includes(guildId))
      return refuse("Este bot não atende este servidor.");
    if (type === APPLICATION_COMMAND) {
      const { data } = interaction as { data?: { type?: unknown; name?: unknown } };
      const name = data && typeof data.name === "string" ? data.name : "";
      const known = Object.hasOwn(DISCORD_COMMAND_REPLIES, name);
      if (known && (data?.type === undefined || data.type === CHAT_INPUT))
        return refuse(DISCORD_COMMAND_REPLIES[name]!);
      return refuse("Comando desconhecido.");
    }
    if ((type === COMPONENT || type === MODAL_SUBMIT) && options.support)
      return reply(200, await options.support.handleInteraction(interaction as SupportInteraction));
    return refuse("O atendimento por aqui ainda não está ativo.");
  };
}
