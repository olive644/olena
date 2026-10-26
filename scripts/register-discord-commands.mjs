// Registra os comandos de barra do bot do OlenaStudy em UM servidor (aparecem na hora).
// Rode no seu computador. O token fica só na variável de ambiente e nunca é impresso.
//
// PowerShell (Windows):
//   $env:DISCORD_BOT_TOKEN = Read-Host "Token do bot"
//   $env:DISCORD_APPLICATION_ID = "1564034156525260800"
//   $env:DISCORD_GUILD_ID = "1562664412530085908"
//   node scripts/register-discord-commands.mjs
//
// Substitui a lista inteira de comandos do servidor pelos de scripts/discord-commands.json.
import { readFileSync } from "node:fs";

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;
if (!token || !applicationId || !guildId) {
  console.error("Faltam DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID ou DISCORD_GUILD_ID.");
  process.exit(1);
}
if (!/^\d{5,25}$/.test(applicationId) || !/^\d{5,25}$/.test(guildId)) {
  console.error("DISCORD_APPLICATION_ID e DISCORD_GUILD_ID devem ser só números.");
  process.exit(1);
}

const commands = JSON.parse(
  readFileSync(new URL("./discord-commands.json", import.meta.url), "utf8"),
);
const response = await fetch(
  `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
  {
    method: "PUT",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  },
);
if (!response.ok) {
  // Mostra só o que o Discord respondeu. O token nunca entra na mensagem.
  const detail = await response.text().catch(() => "");
  console.error(`Falhou: HTTP ${response.status}. ${detail.slice(0, 300)}`);
  process.exit(1);
}
const saved = await response.json();
console.log(`Comandos registrados (${saved.length}): ${saved.map((c) => "/" + c.name).join(", ")}`);
