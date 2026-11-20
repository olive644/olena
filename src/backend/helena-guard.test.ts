import { describe, expect, it } from "vitest";
import { acquireLock, claimRequest, looksLikeText, sanitizeSourceText } from "./helena-guard";
import { createMemoryRoomStore } from "./room-transaction";

describe("entrada da Olena", () => {
  it("tira caracteres de controle e de direção de texto, que escondem instruções", () => {
    const dirty = "Aula‮invertida​‍ com\u0000 controle\u0007 e ﻿marca";
    expect(sanitizeSourceText(dirty)).toBe("Aulainvertida com controle e marca");
    expect(sanitizeSourceText("linha\ncom\tabas")).toBe("linha\ncom\tabas");
  });

  it("corta sequências enormes do mesmo caractere e espaços repetidos", () => {
    const cleaned = sanitizeSourceText(
      `início ${"a".repeat(5000)} fim${" ".repeat(40)}depois\n\n\n\n\n\nfim`,
    );
    expect(cleaned.length).toBeLessThan(80);
    expect(cleaned).toContain("início");
    expect(cleaned).toContain("depois");
    expect(cleaned).not.toMatch(/ {3,}/);
    expect(cleaned).not.toMatch(/\n{4,}/);
    // sequência curta, como reticências ou linha de tabela, não é mexida
    expect(sanitizeSourceText("e então......... acabou")).toBe("e então......... acabou");
    // emoji repetido não quebra no meio de um par de substituição
    expect(sanitizeSourceText("🙂".repeat(60))).toBe("🙂".repeat(20));
  });

  it("não muda texto comum, com acento e cifrão", () => {
    const text = "A fotossíntese ocorre nos cloroplastos. Custa R$ 12,50 (50%).";
    expect(sanitizeSourceText(text)).toBe(text);
  });

  it("reconhece texto e recusa lixo de PDF", () => {
    expect(looksLikeText("A fotossíntese ocorre nos cloroplastos das plantas verdes.")).toBe(true);
    expect(looksLikeText("curto")).toBe(true);
    expect(looksLikeText("❘❙❚❯❱❙❲❳❘❱❨❱❳❩❙❳❬❬❨❘❳❩❭❪❳❱❙❲❳❘❱❨❱")).toBe(false);
    expect(looksLikeText("1) 2) 3) A) B) C) 45% 12,5 x/y")).toBe(true);
  });
});

describe("pedido repetido e pedido por vez", () => {
  it("aceita um pedido uma vez só por pessoa e por chave", async () => {
    const store = createMemoryRoomStore();
    expect(await claimRequest(store, "ana", "k1")).toBe(true);
    expect(await claimRequest(store, "ana", "k1")).toBe(false);
    expect(await claimRequest(store, "ana", "k2")).toBe(true);
    // a mesma chave de outra pessoa é outro pedido
    expect(await claimRequest(store, "bia", "k1")).toBe(true);
  });

  it("repetição em paralelo passa uma vez só", async () => {
    const store = createMemoryRoomStore();
    const results = await Promise.all(
      Array.from({ length: 20 }, () => claimRequest(store, "ana", "mesma")),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("só um pedido por vez, e soltar libera o próximo", async () => {
    const store = createMemoryRoomStore();
    const first = await acquireLock(store, "ana");
    expect(first).toBeDefined();
    expect(await acquireLock(store, "ana")).toBeUndefined();
    // outra pessoa não é afetada
    expect(await acquireLock(store, "bia")).toBeDefined();
    await first!();
    expect(await acquireLock(store, "ana")).toBeDefined();
  });

  it("a trava expira sozinha, para um pedido que morreu não prender a pessoa", async () => {
    const store = createMemoryRoomStore();
    const start = Date.now();
    expect(await acquireLock(store, "ana", start)).toBeDefined();
    expect(await acquireLock(store, "ana", start + 30_000)).toBeUndefined();
    expect(await acquireLock(store, "ana", start + 76_000)).toBeDefined();
  });

  it("pedidos em paralelo: só um pega a trava", async () => {
    const store = createMemoryRoomStore();
    const results = await Promise.all(Array.from({ length: 15 }, () => acquireLock(store, "ana")));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
