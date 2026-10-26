import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SUPPORT_NOTICE_VERSION, createDiscordSupport } from "./discord-support";
import { fakeRest, memoryStore } from "./discord-support-test-kit";
import { createSupportHandler, deleteSupportAccount } from "./support-handler";
import { ticketKey, type StoredSupportTicket } from "./support-keys";

const hash = (uid: string) => createHash("sha256").update(uid).digest("hex");
const CHANNEL = "1562664412530085999";

function setup(relay = true) {
  const { store, data } = memoryStore();
  const rest = fakeRest();
  const support = createDiscordSupport({
    store,
    rest,
    channelId: CHANNEL,
    staffRoleIds: ["1562665632481284097"],
    now: () => 1_000_000,
  });
  const handle = createSupportHandler({
    store,
    allowedOrigins: ["https://app.test"],
    staffHashes: [hash("staff")],
    identify: async (request) => {
      const uid = request.headers.get("authorization");
      return uid ? { uid, anonymous: false, emailVerified: true } : undefined;
    },
    consume: async () => true,
    ...(relay ? { relay: support } : {}),
    now: () => 1_000_000,
  });
  const request = (uid: string, query = "", body?: unknown) =>
    handle(
      new Request(`https://app.test/api/olena?action=support${query}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          authorization: uid,
          origin: "https://app.test",
          "content-type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    );
  const stored = (uid: string) =>
    JSON.parse(data.get(ticketKey(hash(uid)))!) as StoredSupportTicket;
  return { request, store, data, rest, support, stored };
}

describe("atendimento com a ponte do Discord ligada", () => {
  it("sem o aviso confirmado a mensagem é recusada e nada é gravado nem enviado", async () => {
    const { request, rest, data } = setup();
    const response = await request("alice", "", { text: "Oi", requestId: randomUUID() });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "relay-consent-required",
      noticeVersion: SUPPORT_NOTICE_VERSION,
    });
    expect(rest.posted).toEqual([]);
    expect(data.size).toBe(0);
  });

  it("aviso de outra versão também é recusado", async () => {
    const { request, rest } = setup();
    const response = await request("alice", "", {
      text: "Oi",
      requestId: randomUUID(),
      relayConsent: "2020-01-01",
    });
    expect(response.status).toBe(409);
    expect(rest.posted).toEqual([]);
  });

  it("com o aviso, grava, envia ao canal e responde sem expor a ponte", async () => {
    const { request, rest, stored } = setup();
    const response = await request("alice", "", {
      text: "Preciso de ajuda",
      requestId: randomUUID(),
      relayConsent: SUPPORT_NOTICE_VERSION,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ticket: Record<string, unknown> };
    expect(body.ticket["delivery"]).toBe("delivered");
    expect(JSON.stringify(body)).not.toContain("relay");
    expect(JSON.stringify(body)).not.toContain(rest.posted[0]!.id);
    expect(rest.posted).toHaveLength(1);
    expect(stored("alice").relay!.pending).toEqual([]);
  });

  it("se o Discord falhar a mensagem fica salva e pendente, e a consulta seguinte reenvia", async () => {
    const { request, rest, stored } = setup();
    rest.failCreate = true;
    const sent = await request("alice", "", {
      text: "Oi",
      requestId: randomUUID(),
      relayConsent: SUPPORT_NOTICE_VERSION,
    });
    expect(sent.status).toBe(200);
    expect(((await sent.json()) as { ticket: { delivery: string } }).ticket.delivery).toBe(
      "pending",
    );
    expect(stored("alice").relay!.pending).toHaveLength(1);
    rest.failCreate = false;
    const polled = await request("alice");
    expect(((await polled.json()) as { ticket: { delivery: string } }).ticket.delivery).toBe(
      "delivered",
    );
    expect(rest.posted).toHaveLength(1);
  });

  it("repetir a mesma mensagem não envia duas vezes ao canal", async () => {
    const { request, rest } = setup();
    const body = { text: "Uma vez", requestId: randomUUID(), relayConsent: SUPPORT_NOTICE_VERSION };
    await request("alice", "", body);
    await request("alice", "", body);
    expect(rest.posted).toHaveLength(1);
  });

  it("respostas da equipe pelo aplicativo não voltam ao Discord, e a equipe não precisa do aviso", async () => {
    const { request, rest } = setup();
    await request("alice", "", {
      text: "Oi",
      requestId: randomUUID(),
      relayConsent: SUPPORT_NOTICE_VERSION,
    });
    const reply = await request("staff", `&ticket=${hash("alice")}`, {
      text: "Olá!",
      requestId: randomUUID(),
    });
    expect(reply.status).toBe(200);
    expect(rest.posted).toHaveLength(1);
  });

  it("a pessoa vê a resposta da equipe com o nome de quem respondeu", async () => {
    const { request, support, data } = setup();
    await request("alice", "", {
      text: "Oi",
      requestId: randomUUID(),
      relayConsent: SUPPORT_NOTICE_VERSION,
    });
    const id = hash("alice");
    await support.handleInteraction({
      id: "800000000000000009",
      type: 5,
      channel_id: CHANNEL,
      member: { roles: ["1562665632481284097"], nick: "Léo", user: { username: "leo" } },
      data: {
        custom_id: `sup:send:${id}`,
        components: [
          { type: 1, components: [{ type: 4, custom_id: "text", value: "Oi, sou o Léo" }] },
        ],
      },
    });
    expect(data.size).toBeGreaterThan(0);
    const feed = (await (await request("alice")).json()) as {
      ticket: {
        messages: { from: string; by?: string; text: string }[];
        assignee?: { name: string };
      };
    };
    expect(feed.ticket.assignee?.name).toBe("Léo");
    expect(feed.ticket.messages.at(-1)).toMatchObject({
      from: "team",
      by: "Léo",
      text: "Oi, sou o Léo",
    });
  });

  it("depois de encerrada, uma mensagem nova reabre a conversa e vai ao canal de novo", async () => {
    const { request, support, rest, stored } = setup();
    await request("alice", "", {
      text: "Oi",
      requestId: randomUUID(),
      relayConsent: SUPPORT_NOTICE_VERSION,
    });
    await support.handleInteraction({
      id: "800000000000000010",
      type: 3,
      channel_id: CHANNEL,
      member: { roles: ["1562665632481284097"], nick: "Léo", user: { username: "leo" } },
      data: { custom_id: `sup:close:${hash("alice")}` },
    });
    expect(stored("alice").closedAt).toBeDefined();
    expect(rest.deleted).toHaveLength(1);
    await request("alice", "", {
      text: "Voltei",
      requestId: randomUUID(),
      relayConsent: SUPPORT_NOTICE_VERSION,
    });
    expect(stored("alice").closedAt).toBeUndefined();
    expect(rest.posted).toHaveLength(2);
  });

  it("excluir a conta apaga as mensagens do canal e o ticket", async () => {
    const { request, store, support, rest, data } = setup();
    await request("alice", "", {
      text: "Oi",
      requestId: randomUUID(),
      relayConsent: SUPPORT_NOTICE_VERSION,
    });
    await deleteSupportAccount(store, "alice", support);
    expect(rest.deleted).toHaveLength(1);
    expect(data.has(ticketKey(hash("alice")))).toBe(false);
  });

  it("excluir a conta apaga o ticket mesmo se o Discord não deixar apagar a mensagem", async () => {
    const { request, store, rest, data } = setup();
    await request("alice", "", {
      text: "Oi",
      requestId: randomUUID(),
      relayConsent: SUPPORT_NOTICE_VERSION,
    });
    const failing = { purge: async () => Promise.reject(new Error("Discord fora do ar")) };
    await deleteSupportAccount(store, "alice", failing);
    expect(data.has(ticketKey(hash("alice")))).toBe(false);
    expect(rest.posted).toHaveLength(1);
  });

  it("campo relayConsent que não é texto é recusado", async () => {
    const { request } = setup();
    const response = await request("alice", "", {
      text: "Oi",
      requestId: randomUUID(),
      relayConsent: 1,
    });
    expect(response.status).toBe(400);
  });
});

describe("atendimento sem a ponte (como antes)", () => {
  it("não exige aviso, não envia nada e continua funcionando só no aplicativo", async () => {
    const { request, rest } = setup(false);
    const response = await request("alice", "", { text: "Oi", requestId: randomUUID() });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ticket: Record<string, unknown> };
    expect(body.ticket["delivery"]).toBeUndefined();
    expect(rest.posted).toEqual([]);
  });
});
