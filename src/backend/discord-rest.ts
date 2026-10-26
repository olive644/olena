// Cliente mínimo da API REST do Discord, só o que o atendimento precisa. O token vem do
// servidor e nunca entra em mensagens de erro, logs nem respostas.
const API = "https://discord.com/api/v10";
const TIMEOUT_MS = 5000;

export class DiscordRestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type DiscordChannelInfo = {
  guildId: string;
  overwrites: { id: string; type: number; deny: string }[];
};

export interface DiscordRest {
  /** Lê o canal para conferir quem pode vê-lo. Exige a permissão de ver o canal. */
  getChannel(channelId: string): Promise<DiscordChannelInfo>;
  createMessage(channelId: string, body: DiscordMessageBody): Promise<{ id: string }>;
  deleteMessage(channelId: string, messageId: string): Promise<void>;
}

export type DiscordMessageBody = {
  content?: string;
  embeds?: unknown[];
  components?: unknown[];
};

export function createDiscordRest(token: string, fetchImpl: typeof fetch = fetch): DiscordRest {
  async function call(
    method: string,
    path: string,
    body?: unknown,
    retried = false,
  ): Promise<Response> {
    const response = await fetchImpl(`${API}${path}`, {
      method,
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status === 429 && !retried) {
      const wait = Number(response.headers.get("retry-after"));
      // Espera curta e uma única nova tentativa. Limite maior fica para o próximo ciclo.
      if (Number.isFinite(wait) && wait > 0 && wait <= 2) {
        await new Promise((resolve) => setTimeout(resolve, wait * 1000));
        return call(method, path, body, true);
      }
    }
    return response;
  }
  return {
    async getChannel(channelId) {
      if (!/^\d{5,25}$/.test(channelId)) throw new DiscordRestError(0, "canal inválido");
      const response = await call("GET", `/channels/${channelId}`);
      if (!response.ok)
        throw new DiscordRestError(response.status, `Discord respondeu ${response.status}`);
      const channel = (await response.json()) as {
        guild_id?: unknown;
        permission_overwrites?: unknown;
      };
      if (typeof channel.guild_id !== "string" || !Array.isArray(channel.permission_overwrites))
        throw new DiscordRestError(0, "resposta inesperada do Discord");
      return {
        guildId: channel.guild_id,
        overwrites: (channel.permission_overwrites as Record<string, unknown>[]).flatMap((item) =>
          typeof item["id"] === "string" &&
          typeof item["type"] === "number" &&
          typeof item["deny"] === "string"
            ? [{ id: item["id"], type: item["type"], deny: item["deny"] }]
            : [],
        ),
      };
    },
    async createMessage(channelId, body) {
      if (!/^\d{5,25}$/.test(channelId)) throw new DiscordRestError(0, "canal inválido");
      // Nenhuma menção é processada, mesmo que o texto da pessoa tenha @everyone ou @cargo.
      const response = await call("POST", `/channels/${channelId}/messages`, {
        ...body,
        allowed_mentions: { parse: [] },
      });
      if (!response.ok)
        throw new DiscordRestError(response.status, `Discord respondeu ${response.status}`);
      const saved = (await response.json()) as { id?: unknown };
      if (typeof saved.id !== "string" || !/^\d{5,25}$/.test(saved.id))
        throw new DiscordRestError(0, "resposta inesperada do Discord");
      return { id: saved.id };
    },
    async deleteMessage(channelId, messageId) {
      if (!/^\d{5,25}$/.test(channelId) || !/^\d{5,25}$/.test(messageId))
        throw new DiscordRestError(0, "identificador inválido");
      const response = await call("DELETE", `/channels/${channelId}/messages/${messageId}`);
      // 404 significa que a mensagem já não existe: o resultado desejado.
      if (!response.ok && response.status !== 404)
        throw new DiscordRestError(response.status, `Discord respondeu ${response.status}`);
    },
  };
}
