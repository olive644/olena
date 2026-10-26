import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createDiscordInteractionsHandler, verifyDiscordSignature } from "./discord-interactions";

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

  it("no servidor atendido responde, de forma honesta, que o atendimento ainda não está ativo", async () => {
    const body = JSON.stringify({ type: 2, guild_id: GUILD, data: { name: "ajuda" } });
    const response = await handler()(signed(body));
    const parsed = (await response.json()) as {
      type: number;
      data: { content: string; flags: number };
    };
    expect(parsed.data.flags).toBe(64);
    expect(parsed.data.content).toBe("O atendimento por aqui ainda não está ativo.");
  });
});
