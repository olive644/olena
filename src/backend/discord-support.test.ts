import { describe, expect, it } from "vitest";
import {
  SUPPORT_NOTICE_VERSION,
  createDiscordSupport,
  escapeMarkdown,
  ticketMessage,
} from "./discord-support";
import { fakeRest, memoryStore } from "./discord-support-test-kit";
import { publicTicket, ticketKey, type StoredSupportTicket } from "./support-keys";

const TICKET = "a".repeat(64);
const CHANNEL = "1562664412530085999";
const STAFF_ROLE = "1562665632481284097";
let clock = 1_800_000_000_000;

function setup(options: { consume?: () => Promise<boolean> } = {}) {
  const { store, data } = memoryStore();
  const rest = fakeRest();
  const support = createDiscordSupport({
    store,
    rest,
    channelId: CHANNEL,
    staffRoleIds: [STAFF_ROLE],
    now: () => clock,
    ...options,
  });
  const seed = async (ticket: Partial<StoredSupportTicket> = {}) => {
    const full: StoredSupportTicket = {
      id: TICKET,
      updatedAt: clock,
      messages: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          text: "Preciso de ajuda",
          at: clock,
          from: "user",
        },
      ],
      ...ticket,
    };
    await store.set(ticketKey(TICKET), JSON.stringify(full), 86400);
  };
  const read = () => JSON.parse(data.get(ticketKey(TICKET))!) as StoredSupportTicket;
  return { store, data, rest, support, seed, read };
}

const click = (action: string, overrides: Record<string, unknown> = {}) => ({
  id: "800000000000000001",
  type: 3,
  channel_id: CHANNEL,
  member: { roles: [STAFF_ROLE], nick: "Léo", user: { username: "leo" } },
  data: { custom_id: `sup:${action}:${TICKET}` },
  ...overrides,
});
const submit = (
  text: string,
  id = "800000000000000002",
  overrides: Record<string, unknown> = {},
) => ({
  id,
  type: 5,
  channel_id: CHANNEL,
  member: { roles: [STAFF_ROLE], nick: "Léo", user: { username: "leo" } },
  data: {
    custom_id: `sup:send:${TICKET}`,
    components: [{ type: 1, components: [{ type: 4, custom_id: "text", value: text }] }],
  },
  ...overrides,
});
type Reply = { type: number; data: { content?: string; flags?: number; custom_id?: string } };

async function queue(ctx: ReturnType<typeof setup>, text = "Preciso de ajuda") {
  await ctx.seed();
  const ticket = ctx.read();
  ticket.messages[0]!.text = text;
  ctx.support.enqueue(ticket, ticket.messages[0]!.id, SUPPORT_NOTICE_VERSION);
  await ctx.store.set(ticketKey(TICKET), JSON.stringify(ticket), 86400);
}

describe("envio da conversa ao Discord", () => {
  it("posta a mensagem escapada, com botões e sem menções, e limpa a pendência", async () => {
    const ctx = setup();
    await queue(ctx, "oi @everyone **negrito** [link](https://x.test)");
    await ctx.support.flush(TICKET);
    expect(ctx.rest.posted).toHaveLength(1);
    const post = ctx.rest.posted[0]!;
    expect(post.channelId).toBe(CHANNEL);
    const embed = (post.body.embeds as { title: string; description: string }[])[0]!;
    expect(embed.title).toBe("Ticket aaaaaaaa");
    expect(embed.description).toBe(
      "oi @everyone \\*\\*negrito\\*\\* \\[link\\]\\(https://x.test\\)",
    );
    const labels = (
      post.body.components as { components: { label: string; custom_id: string }[] }[]
    )[0]!.components;
    expect(labels.map((b) => b.label)).toEqual(["Responder", "Assumir", "Encerrar"]);
    expect(labels.every((b) => b.custom_id.endsWith(TICKET))).toBe(true);
    const relay = ctx.read().relay!;
    expect(relay.pending).toEqual([]);
    expect(relay.posted).toEqual([post.id]);
    expect(relay.lease).toBeUndefined();
    expect(relay.consent?.version).toBe(SUPPORT_NOTICE_VERSION);
  });

  it("não envia nada enquanto o canal for visível a todos e envia quando ele ficar privado", async () => {
    const ctx = setup();
    await queue(ctx);
    ctx.rest.privateChannel = false;
    await ctx.support.flush(TICKET);
    expect(ctx.rest.posted).toEqual([]);
    expect(ctx.read().relay!.pending).toHaveLength(1);
    expect(ctx.read().relay!.failures).toBe(1);
    // Corrigido o canal, a conferência é refeita depois da janela curta e a mensagem segue.
    ctx.rest.privateChannel = true;
    clock += 31_000;
    await ctx.support.flush(TICKET);
    expect(ctx.rest.posted).toHaveLength(1);
    expect(ctx.read().relay!.pending).toEqual([]);
    clock -= 31_000;
  });

  it("falha fechado quando não consegue ler o canal", async () => {
    const ctx = setup();
    await queue(ctx);
    ctx.rest.channelError = true;
    await ctx.support.flush(TICKET);
    expect(ctx.rest.posted).toEqual([]);
    expect(ctx.read().relay!.pending).toHaveLength(1);
  });

  it("mantém pendente quando o Discord falha e tenta de novo depois", async () => {
    const ctx = setup();
    await queue(ctx);
    ctx.rest.failCreate = true;
    await ctx.support.flush(TICKET);
    expect(ctx.read().relay!.pending).toHaveLength(1);
    expect(ctx.read().relay!.failures).toBe(1);
    expect(publicTicket(ctx.read()).delivery).toBe("pending");
    ctx.rest.failCreate = false;
    await ctx.support.flush(TICKET);
    expect(ctx.read().relay!.pending).toEqual([]);
    expect(ctx.read().relay!.failures).toBe(0);
    expect(publicTicket(ctx.read()).delivery).toBe("delivered");
  });

  it("depois de falhas repetidas a entrega aparece como falha", async () => {
    const ctx = setup();
    await queue(ctx);
    ctx.rest.failCreate = true;
    for (let i = 0; i < 3; i++) await ctx.support.flush(TICKET);
    expect(publicTicket(ctx.read()).delivery).toBe("failed");
  });

  it("dois envios ao mesmo tempo não duplicam a mensagem no canal", async () => {
    const ctx = setup();
    await queue(ctx);
    ctx.rest.createDelay = 20;
    await Promise.all([ctx.support.flush(TICKET), ctx.support.flush(TICKET)]);
    expect(ctx.rest.posted).toHaveLength(1);
    expect(ctx.read().relay!.pending).toEqual([]);
  });

  it("não vaza o estado da ponte nem IDs do Discord para a pessoa", async () => {
    const ctx = setup();
    await queue(ctx);
    await ctx.support.flush(TICKET);
    const visible = JSON.stringify(publicTicket(ctx.read()));
    expect(visible).not.toContain(ctx.rest.posted[0]!.id);
    expect(visible).not.toContain("relay");
    expect(visible).not.toContain("posted");
  });

  it("mensagem nova de conversa encerrada reabre e tira o atendente anterior", async () => {
    const ctx = setup();
    await ctx.seed({ closedAt: clock, assignee: { name: "Léo", at: clock } });
    const ticket = ctx.read();
    ctx.support.enqueue(ticket, "22222222-2222-2222-2222-222222222222", SUPPORT_NOTICE_VERSION);
    expect(ticket.closedAt).toBeUndefined();
    expect(ticket.assignee).toBeUndefined();
  });

  it("ticketMessage corta textos enormes dentro do limite do Discord", () => {
    const body = ticketMessage(
      TICKET,
      { id: "x", text: "a".repeat(5000), at: clock, from: "user" },
      1,
    );
    expect((body.embeds as { description: string }[])[0]!.description.length).toBeLessThanOrEqual(
      3900,
    );
  });

  it("escapeMarkdown neutraliza os caracteres de formatação", () => {
    expect(escapeMarkdown("a*b_c~d`e|f>g#h[i]j(k)l\\m")).toBe(
      "a\\*b\\_c\\~d\\`e\\|f\\>g\\#h\\[i\\]j\\(k\\)l\\\\m",
    );
  });
});

describe("botões e formulários da equipe", () => {
  it("recusa quem não tem o cargo, ou age em outro canal, ou não tem papéis", async () => {
    const ctx = setup();
    await ctx.seed();
    for (const bad of [
      click("reply", { member: { roles: ["999999999999999999"] } }),
      click("reply", { channel_id: "999999999999999999" }),
      click("reply", { member: {} }),
      click("reply", { member: undefined }),
      click("close", { member: { roles: "cargo" } }),
    ]) {
      const reply = (await ctx.support.handleInteraction(bad)) as Reply;
      expect(reply.data.content).toBe("Você não tem permissão para atender tickets.");
      expect(reply.data.flags).toBe(64);
    }
    expect(ctx.read().closedAt).toBeUndefined();
    expect(ctx.rest.deleted).toEqual([]);
  });

  it("aceita o ID do canal em channel.id e recusa ações desconhecidas ou ID de ticket inválido", async () => {
    const ctx = setup();
    await ctx.seed();
    const viaChannel = (await ctx.support.handleInteraction(
      click("reply", { channel_id: undefined, channel: { id: CHANNEL } }),
    )) as Reply;
    expect(viaChannel.type).toBe(9);
    for (const id of [
      "sup:outra:" + TICKET,
      "sup:reply:abc",
      "reply",
      "sup:reply:" + "A".repeat(64),
    ]) {
      const reply = (await ctx.support.handleInteraction(
        click("x", { data: { custom_id: id } }),
      )) as Reply;
      expect(reply.data.content).toBe("Ação desconhecida.");
    }
  });

  it("recusa quando o teto de ações da equipe estourou", async () => {
    const ctx = setup({ consume: async () => false });
    await ctx.seed();
    const reply = (await ctx.support.handleInteraction(click("reply"))) as Reply;
    expect(reply.data.content).toBe("Muitas ações em pouco tempo. Aguarde um instante.");
  });

  it("Responder abre o formulário, e conversa encerrada ou inexistente não abre", async () => {
    const ctx = setup();
    await ctx.seed();
    const modal = (await ctx.support.handleInteraction(click("reply"))) as Reply;
    expect(modal.type).toBe(9);
    expect(modal.data.custom_id).toBe(`sup:send:${TICKET}`);
    await ctx.seed({ closedAt: clock });
    expect(((await ctx.support.handleInteraction(click("reply"))) as Reply).data.content).toBe(
      "Esta conversa já foi encerrada.",
    );
    ctx.data.clear();
    expect(((await ctx.support.handleInteraction(click("reply"))) as Reply).data.content).toBe(
      "Esta conversa não existe mais.",
    );
  });

  it("Assumir mostra o nome de quem assumiu, e o último a assumir vale", async () => {
    const ctx = setup();
    await ctx.seed();
    await ctx.support.handleInteraction(click("claim"));
    expect(ctx.read().assignee?.name).toBe("Léo");
    await ctx.support.handleInteraction(
      click("claim", {
        member: { roles: [STAFF_ROLE], user: { global_name: "Ana", username: "ana" } },
      }),
    );
    expect(ctx.read().assignee?.name).toBe("Ana");
  });

  it("limpa o nome da equipe: sem controle, com tamanho limite e com padrão Equipe", async () => {
    const ctx = setup();
    await ctx.seed();
    await ctx.support.handleInteraction(
      click("claim", {
        member: { roles: [STAFF_ROLE], nick: "  Le\u0000o\n  Silva  ".padEnd(80, "x") },
      }),
    );
    const name = ctx.read().assignee!.name;
    expect(name.length).toBeLessThanOrEqual(40);
    expect(name).not.toMatch(/\p{Cc}/u);
    expect(name.startsWith("Leo Silva")).toBe(true);
    await ctx.support.handleInteraction(click("claim", { member: { roles: [STAFF_ROLE] } }));
    expect(ctx.read().assignee!.name).toBe("Equipe");
  });

  it("a resposta enviada pelo formulário chega ao ticket com o nome e vira o atendente", async () => {
    const ctx = setup();
    await ctx.seed();
    const reply = (await ctx.support.handleInteraction(submit("Oi, já vou ver isso"))) as Reply;
    expect(reply.data.content).toBe("Resposta enviada. A pessoa vai vê-la no aplicativo.");
    const ticket = ctx.read();
    const last = ticket.messages.at(-1)!;
    expect(last).toMatchObject({ text: "Oi, já vou ver isso", from: "team", by: "Léo" });
    expect(ticket.assignee?.name).toBe("Léo");
    expect(ctx.rest.posted).toHaveLength(1);
    expect(ticket.relay!.posted).toEqual([ctx.rest.posted[0]!.id]);
  });

  it("repetir a mesma interação não duplica a resposta", async () => {
    const ctx = setup();
    await ctx.seed();
    await ctx.support.handleInteraction(submit("Uma vez"));
    await ctx.support.handleInteraction(submit("Uma vez"));
    expect(ctx.read().messages.filter((m) => m.from === "team")).toHaveLength(1);
    expect(ctx.rest.posted).toHaveLength(1);
  });

  it("recusa resposta vazia, longa demais, sem ID de interação, em conversa encerrada ou cheia", async () => {
    const ctx = setup();
    await ctx.seed();
    expect(((await ctx.support.handleInteraction(submit("   "))) as Reply).data.content).toBe(
      "Escreva uma resposta.",
    );
    expect(
      ((await ctx.support.handleInteraction(submit("x".repeat(1801)))) as Reply).data.content,
    ).toBe("Resposta muito longa.");
    expect(((await ctx.support.handleInteraction(submit("oi", "abc"))) as Reply).data.content).toBe(
      "Interação inválida.",
    );
    await ctx.seed({ closedAt: clock });
    expect(((await ctx.support.handleInteraction(submit("oi"))) as Reply).data.content).toBe(
      "Esta conversa já foi encerrada.",
    );
    await ctx.seed({
      messages: Array.from({ length: 100 }, (_, i) => ({
        id: `${String(i).padStart(8, "0")}-1111-1111-1111-111111111111`,
        text: "m",
        at: clock,
        from: "user" as const,
      })),
    });
    expect(((await ctx.support.handleInteraction(submit("oi"))) as Reply).data.content).toBe(
      "Esta conversa atingiu o limite de 100 mensagens.",
    );
    expect(ctx.read().messages).toHaveLength(100);
  });

  it("a resposta fica salva para a pessoa mesmo se o registro no canal falhar", async () => {
    const ctx = setup();
    await ctx.seed();
    ctx.rest.failCreate = true;
    const reply = (await ctx.support.handleInteraction(submit("Resposta importante"))) as Reply;
    expect(reply.data.content).toBe("Resposta enviada. A pessoa vai vê-la no aplicativo.");
    expect(ctx.read().messages.at(-1)!.text).toBe("Resposta importante");
  });

  it("Encerrar apaga todas as mensagens do canal, marca o fim e tira o atendente", async () => {
    const ctx = setup();
    await queue(ctx);
    await ctx.support.flush(TICKET);
    await ctx.support.handleInteraction(submit("Resposta"));
    const posted = ctx.rest.posted.map((post) => post.id);
    expect(posted).toHaveLength(2);
    const reply = (await ctx.support.handleInteraction(click("close"))) as Reply;
    expect(reply.data.content).toBe(
      "Conversa encerrada. As mensagens do ticket foram apagadas do canal.",
    );
    expect(ctx.rest.deleted.sort()).toEqual(posted.sort());
    const ticket = ctx.read();
    expect(ticket.closedAt).toBe(clock);
    expect(ticket.assignee).toBeUndefined();
    expect(ticket.relay!.posted).toEqual([]);
    expect(ticket.relay!.toDelete).toEqual([]);
    expect(ticket.messages).toHaveLength(2);
  });

  it("o que não foi apagado fica para uma próxima tentativa e o aviso diz a verdade", async () => {
    const ctx = setup();
    await queue(ctx);
    await ctx.support.flush(TICKET);
    const stuck = ctx.rest.posted[0]!.id;
    ctx.rest.failDelete.add(stuck);
    const reply = (await ctx.support.handleInteraction(click("close"))) as Reply;
    expect(reply.data.content).toBe(
      "Conversa encerrada. 1 mensagem(ns) ainda serão apagadas em breve.",
    );
    expect(ctx.read().relay!.toDelete).toEqual([stuck]);
  });

  it("encerrar de novo uma conversa já encerrada não apaga nada a mais", async () => {
    const ctx = setup();
    await queue(ctx);
    await ctx.support.flush(TICKET);
    await ctx.support.handleInteraction(click("close"));
    const before = ctx.rest.deleted.length;
    await ctx.support.handleInteraction(click("close"));
    expect(ctx.rest.deleted).toHaveLength(before);
  });

  it("mensagem entregue depois do encerramento vai para a fila de apagar, e não fica no canal", async () => {
    const ctx = setup();
    await queue(ctx);
    // A pessoa encerra no meio do envio: simulamos fechando logo depois de reservar a mensagem.
    ctx.rest.createDelay = 30;
    const sending = ctx.support.flush(TICKET);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const ticket = ctx.read();
    ticket.closedAt = clock;
    await ctx.store.set(ticketKey(TICKET), JSON.stringify(ticket), 86400);
    await sending;
    expect(ctx.read().relay!.posted).toEqual([]);
    expect(ctx.read().relay!.toDelete).toHaveLength(1);
  });

  it("purge apaga do canal tudo o que o bot postou para o ticket", async () => {
    const ctx = setup();
    await queue(ctx);
    await ctx.support.flush(TICKET);
    await ctx.support.handleInteraction(submit("Resposta"));
    await ctx.support.purge(TICKET);
    expect(ctx.rest.deleted).toHaveLength(2);
  });

  it("purge de ticket inexistente ou sem ponte não faz nada", async () => {
    const ctx = setup();
    await ctx.support.purge(TICKET);
    await ctx.seed();
    await ctx.support.purge(TICKET);
    expect(ctx.rest.deleted).toEqual([]);
  });
});
