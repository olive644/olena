// Sem --apply, somente confere. Token protegido no ambiente, nunca impresso.
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) throw new Error("Configure DISCORD_BOT_TOKEN no ambiente protegido.");
const guild = "1562664412530085908";
const category = "1562664695339417672";
const account = "1562664759017340959";
async function api(path, method = "GET", body) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      "X-Audit-Log-Reason": "OlenaStudy private account logs",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Discord HTTP ${response.status}; nenhuma credencial exibida.`);
  return response.status === 204 ? undefined : response.json();
}
const me = await api("/users/@me");
const channels = await api(`/guilds/${guild}/channels`);
const targets = channels.filter(
  (channel) => channel.id === category || channel.parent_id === category,
);
if (
  !targets.some((c) => c.id === account && c.type === 0) ||
  !targets.some((c) => c.id === category && c.type === 4)
)
  throw new Error("Categoria/canal não correspondem ao servidor esperado.");
// Categoria e filhos, inclusive os canais não sincronizados. Preserva outras permissões.
for (const target of targets) {
  const rules = target.permission_overwrites ?? [];
  const updated = rules
    .filter((rule) => rule.id !== guild && rule.id !== me.id)
    .map((rule) => ({
      ...rule,
      allow: (BigInt(rule.allow) & ~1024n).toString(),
      deny: (BigInt(rule.deny) | 1024n).toString(),
    }));
  const everyone = rules.find((rule) => rule.id === guild);
  const bot = rules.find((rule) => rule.id === me.id && rule.type === 1);
  updated.push({
    id: guild,
    type: 0,
    allow: (BigInt(everyone?.allow ?? 0) & ~1024n).toString(),
    deny: (BigInt(everyone?.deny ?? 0) | 1024n).toString(),
  });
  const permissions = 1024n | 2048n | 16384n | 65536n;
  updated.push({
    id: me.id,
    type: 1,
    allow: (BigInt(bot?.allow ?? 0) | permissions).toString(),
    deny: (BigInt(bot?.deny ?? 0) & ~permissions).toString(),
  });
  if (process.argv.includes("--apply")) {
    await api(`/channels/${target.id}`, "PATCH", { permission_overwrites: updated });
    const saved = await api(`/channels/${target.id}`);
    if (!saved.permission_overwrites.some((r) => r.id === guild && BigInt(r.deny) & 1024n))
      throw new Error("Verificação de privacidade falhou.");
  }
  console.log(
    `${target.id}: ${process.argv.includes("--apply") ? "permissões aplicadas e conferidas" : "planejado, nenhuma alteração"}`,
  );
}
console.log(
  "Administradores e proprietário continuam com acesso pelo modelo do Discord. Confirme com uma conta comum.",
);
