import { readFileSync } from "node:fs";
import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DISCORD_COMMAND_REPLIES,
  createDiscordInteractionsHandler,
  verifyDiscordSignature,
} from "./discord-interactions";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
// Os 32 bytes finais do SPKI DER são a chave pública crua, que o Discord mostra em hexadecimal.
const publicKeyHex = publicKey
  .export({ format: "der", type: "spki" })
  .subarray(-32)
  .toString("hex");
const NOW = 1_800_000_000_000;
const GUILD = "123456789012345678";

function signed(body: string, timestamp = String(Math.floor(NOW / 1000)), key = privateKey) {
  return new Request("https://exemplo.test/api/olena?action=discord-interactions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature-ed25519": sign(null, Buffer.from(timestamp + body), key).toString("hex"),
      "x-signature-timestamp": timestamp,
    },
    body,
  });
}
const handler = (overrides: Partial<Parameters<typeof createDiscordInteractionsHandler>[0]> = {}) =>
  createDiscordInteractionsHandler({
    publicKey: publicKeyHex,
    allowedGuildIds: [GUILD],
    now: () => NOW,
    ...overrides,
  });

describe("verifyDiscordSignature", () => {
  it("aceita assinatura válida e recusa corpo ou carimbo alterados", () => {
    const body = '{"type":1}';
    const ts = "1800000000";
    const signature = sign(null, Buffer.from(ts + body), privateKey).toString("hex");
    expect(verifyDiscordSignature(publicKeyHex, signature, ts, body)).toBe(true);
    expect(verifyDiscordSignature(publicKeyHex, signature, ts, '{"type":2}')).toBe(false);
    expect(verifyDiscordSignature(publicKeyHex, signature, "1800000001", body)).toBe(false);
  });

  it("recusa chave ou assinatura mal formadas sem lançar erro", () => {
    expect(verifyDiscordSignature("xyz", "00", "1", "{}")).toBe(false);
    expect(verifyDiscordSignature(publicKeyHex, "zz".repeat(64), "1", "{}")).toBe(false);
    expect(verifyDiscordSignature(publicKeyHex, "00".repeat(64), "1", "{}")).toBe(false);
  });
});

describe("interações do Discord", () => {
  it("responde PONG ao PING de verificação do portal", async () => {
    const response = await handler()(signed('{"type":1}'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ type: 1 });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("recusa assinatura de outra chave com 401", async () => {
    const other = generateKeyPairSync("ed25519").privateKey;
    expect((await handler()(signed('{"type":1}', undefined, other))).status).toBe(401);
  });

  it("recusa pedido sem cabeçalhos de assinatura", async () => {
    const request = new Request("https://exemplo.test/api/olena", { method: "POST", body: "{}" });
    expect((await handler()(request)).status).toBe(401);
  });

  it("recusa carimbo fora da janela mesmo com assinatura válida (reenvio)", async () => {
    const old = String(Math.floor(NOW / 1000) - 3600);
    expect((await handler()(signed('{"type":1}', old))).status).toBe(401);
    const future = String(Math.floor(NOW / 1000) + 3600);
    expect((await handler()(signed('{"type":1}', future))).status).toBe(401);
  });

  it("falha fechado quando a chave pública não está configurada ou é inválida", async () => {
    expect((await handler({ publicKey: undefined })(signed('{"type":1}'))).status).toBe(503);
    expect((await handler({ publicKey: "curta" })(signed('{"type":1}'))).status).toBe(503);
  });

  it("aceita só POST", async () => {
    const response = await handler()(new Request("https://exemplo.test/", { method: "GET" }));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("recusa corpo acima do limite, pelo cabeçalho e pelo conteúdo", async () => {
    const big = JSON.stringify({ type: 2, pad: "x".repeat(20_000) });
    expect((await handler()(signed(big))).status).toBe(413);
    const declared = new Request("https://exemplo.test/", {
      method: "POST",
      headers: { "content-length": "99999" },
      body: "{}",
    });
    expect((await handler()(declared)).status).toBe(413);
  });

  it("recusa JSON inválido e formatos inesperados depois de validar a assinatura", async () => {
    expect((await handler()(signed("não é json"))).status).toBe(400);
    expect((await handler()(signed("[1,2]"))).status).toBe(400);
    expect((await handler()(signed('{"type":"texto"}'))).status).toBe(400);
  });

  it("recusa interações de servidores fora da lista, sem expor dados", async () => {
    const other = JSON.stringify({ type: 2, guild_id: "999999999999999999", data: { name: "x" } });
    const response = await handler()(signed(other));
    const body = (await response.json()) as {
      type: number;
      data: { content: string; flags: number };
    };
    expect(response.status).toBe(200);
    expect(body.type).toBe(4);
    expect(body.data.flags).toBe(64);
    expect(body.data.content).toBe("Este bot não atende este servidor.");
  });

  it("recusa interação sem servidor (mensagem direta) e sem lista configurada", async () => {
    const dm = JSON.stringify({ type: 2, data: { name: "x" } });
    expect(
      ((await (await handler()(signed(dm))).json()) as { data: { content: string } }).data.content,
    ).toBe("Este bot não atende este servidor.");
    const inGuild = JSON.stringify({ type: 2, guild_id: GUILD });
    const empty = await handler({ allowedGuildIds: [] })(signed(inGuild));
    expect(((await empty.json()) as { data: { content: string } }).data.content).toBe(
      "Este bot não atende este servidor.",
    );
  });

  it("interação que não é comando, no servidor atendido, responde que o atendimento não está ativo", async () => {
    const body = JSON.stringify({ type: 3, guild_id: GUILD, data: { custom_id: "x" } });
    const parsed = (await (await handler()(signed(body))).json()) as {
      data: { content: string; flags: number };
    };
    expect(parsed.data.flags).toBe(64);
    expect(parsed.data.content).toBe("O atendimento por aqui ainda não está ativo.");
  });

  it.each(["ajuda", "status"])(
    "responde ao comando /%s só para quem chamou, sem menções",
    async (name) => {
      const body = JSON.stringify({ type: 2, guild_id: GUILD, data: { type: 1, name } });
      const response = await handler()(signed(body));
      const parsed = (await response.json()) as {
        type: number;
        data: { content: string; flags: number; allowed_mentions: { parse: string[] } };
      };
      expect(parsed.type).toBe(4);
      expect(parsed.data.flags).toBe(64);
      expect(parsed.data.allowed_mentions).toEqual({ parse: [] });
      expect(parsed.data.content).toBe(DISCORD_COMMAND_REPLIES[name]);
      expect(parsed.data.content).toContain("ainda não está ativo");
    },
  );

  it("recusa comando desconhecido e nomes que imitam propriedades do objeto", async () => {
    for (const name of ["inexistente", "constructor", "__proto__", "toString", ""]) {
      const body = JSON.stringify({ type: 2, guild_id: GUILD, data: { type: 1, name } });
      const parsed = (await (await handler()(signed(body))).json()) as {
        data: { content: string };
      };
      expect(parsed.data.content).toBe("Comando desconhecido.");
    }
    const user = JSON.stringify({ type: 2, guild_id: GUILD, data: { type: 2, name: "ajuda" } });
    expect(
      ((await (await handler()(signed(user))).json()) as { data: { content: string } }).data
        .content,
    ).toBe("Comando desconhecido.");
  });

  it("comando de servidor fora da lista continua recusado, mesmo sendo conhecido", async () => {
    const body = JSON.stringify({
      type: 2,
      guild_id: "999999999999999999",
      data: { type: 1, name: "ajuda" },
    });
    expect(
      ((await (await handler()(signed(body))).json()) as { data: { content: string } }).data
        .content,
    ).toBe("Este bot não atende este servidor.");
  });

  it("os comandos registrados no Discord e as respostas do código andam juntos", () => {
    const registered = JSON.parse(readFileSync("scripts/discord-commands.json", "utf8")) as {
      name: string;
      description: string;
      type: number;
    }[];
    expect(registered.map((command) => command.name).sort()).toEqual(
      Object.keys(DISCORD_COMMAND_REPLIES).sort(),
    );
    for (const command of registered) {
      expect(command.type).toBe(1);
      expect(command.name).toMatch(/^[a-z0-9_-]{1,32}$/);
      expect(command.description.length).toBeGreaterThan(0);
      expect(command.description.length).toBeLessThanOrEqual(100);
    }
  });

  it("botões e formulários só vão ao atendimento em servidor atendido, e sem atendimento recebem o aviso", async () => {
    const calls: unknown[] = [];
    const support = {
      handleInteraction: async (interaction: unknown) => {
        calls.push(interaction);
        return { type: 4, data: { content: "do atendimento", flags: 64 } };
      },
    };
    const click = JSON.stringify({ type: 3, guild_id: GUILD, data: { custom_id: "sup:reply:x" } });
    const submit = JSON.stringify({ type: 5, guild_id: GUILD, data: { custom_id: "sup:send:x" } });
    for (const body of [click, submit]) {
      const response = await handler({ support })(signed(body));
      expect(((await response.json()) as { data: { content: string } }).data.content).toBe(
        "do atendimento",
      );
    }
    expect(calls).toHaveLength(2);
    // Servidor fora da lista nunca chega ao atendimento.
    const other = JSON.stringify({
      type: 3,
      guild_id: "999999999999999999",
      data: { custom_id: "sup:reply:x" },
    });
    const refused = await handler({ support })(signed(other));
    expect(((await refused.json()) as { data: { content: string } }).data.content).toBe(
      "Este bot não atende este servidor.",
    );
    expect(calls).toHaveLength(2);
    // Sem atendimento configurado, o botão recebe o aviso de sempre.
    const without = await handler()(signed(click));
    expect(((await without.json()) as { data: { content: string } }).data.content).toBe(
      "O atendimento por aqui ainda não está ativo.",
    );
  });
});
