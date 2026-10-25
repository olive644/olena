import { createDiscordInteractionsHandler } from "./discord-interactions.js";

// IDs dos servidores atendidos (oficial e de testes), separados por vírgula. Não são segredos.
const allowedGuildIds = (process.env["DISCORD_ALLOWED_GUILD_IDS"] ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => /^\d{5,25}$/.test(id));

export const handleDiscordInteractions = createDiscordInteractionsHandler({
  publicKey: process.env["DISCORD_PUBLIC_KEY"],
  allowedGuildIds,
});
