import { createDiscordRest } from "./discord-rest.js";
import { createDiscordSupport } from "./discord-support.js";
import { checkRateLimit } from "./rate-limit.js";
import { store } from "./support-store-runtime.js";

const ids = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^\d{5,25}$/.test(id));

const token = process.env["DISCORD_BOT_TOKEN"];
const channelId = process.env["DISCORD_SUPPORT_CHANNEL_ID"] ?? "";
const staffRoleIds = ids(process.env["DISCORD_STAFF_ROLE_IDS"]);

// Desligada por padrão. Só liga com a variável explícita e a configuração completa: sem canal,
// sem cargo da equipe ou sem token, o atendimento segue só dentro do aplicativo.
export const discordSupport =
  process.env["DISCORD_SUPPORT_ENABLED"] === "true" &&
  token &&
  /^\d{5,25}$/.test(channelId) &&
  staffRoleIds.length > 0
    ? createDiscordSupport({
        store,
        rest: createDiscordRest(token),
        channelId,
        staffRoleIds,
        // Teto global de ações da equipe por minuto, para o endpoint não virar custo aberto.
        consume: () => checkRateLimit(store, "discord-support-minute", "all", 120, 60),
      })
    : undefined;
