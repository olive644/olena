import type { DiscordMessageBody, DiscordRest } from "./discord-rest.js";
import type { KvStore } from "./kv-store.js";

/** Banco em memória com versão por chave, como o do Firebase, para testar o atendimento. */
export function memoryStore() {
  const data = new Map<string, string>();
  const versions = new Map<string, number>();
  const store: KvStore = {
    get: async (key) => data.get(key),
    set: async (key, value) => {
      data.set(key, value);
      versions.set(key, (versions.get(key) ?? 0) + 1);
    },
    del: async (key) => {
      data.delete(key);
      versions.set(key, (versions.get(key) ?? 0) + 1);
    },
    readVersion: async (key) => ({ value: data.get(key), version: String(versions.get(key) ?? 0) }),
    compareAndSet: async (key, value, _ttl, expected) => {
      if (expected !== String(versions.get(key) ?? 0)) return false;
      data.set(key, value);
      versions.set(key, (versions.get(key) ?? 0) + 1);
      return true;
    },
  };
  return { store, data };
}

/** Discord de mentira: guarda o que foi postado e apagado e pode falhar sob demanda. */
export function fakeRest() {
  let next = 100_000_000_000_001n;
  const rest = {
    posted: [] as { channelId: string; id: string; body: DiscordMessageBody }[],
    deleted: [] as string[],
    failCreate: false,
    /** Canal privado por padrão: @everyone sem "Ver canal". Os testes podem abri-lo. */
    privateChannel: true,
    channelError: false,
    failDelete: new Set<string>(),
    createDelay: 0,
    async getChannel() {
      if (rest.channelError) throw new Error("Discord fora do ar");
      return {
        guildId: "1562664412530085908",
        overwrites: rest.privateChannel
          ? [{ id: "1562664412530085908", type: 0, deny: String(1 << 10) }]
          : [],
      };
    },
    async createMessage(channelId: string, body: DiscordMessageBody) {
      if (rest.createDelay) await new Promise((resolve) => setTimeout(resolve, rest.createDelay));
      if (rest.failCreate) throw new Error("Discord fora do ar");
      const id = String(next++);
      rest.posted.push({ channelId, id, body });
      return { id };
    },
    async deleteMessage(_channelId: string, id: string) {
      if (rest.failDelete.has(id)) throw new Error("falha ao apagar");
      rest.deleted.push(id);
    },
  };
  return rest satisfies DiscordRest & Record<string, unknown>;
}
