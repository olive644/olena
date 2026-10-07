import { describe, expect, it } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";
import {
  ROOM_PRESENCE_GRACE_MS,
  ROOM_START_COUNTDOWN_MS,
  type PublicLocalRoomState,
} from "../domain/local-room";

function harness() {
  let now = 1000;
  let counter = 0;
  const store = createMemoryRoomStore(() => now);
  const handler = createLocalRoomHandler({
    store,
    now: () => now,
    randomId: () => `id-${counter++}`,
    publish: async () => {},
    streamUrl: (code) => `/rooms/${code}`,
    // Fake de teste: o token é o próprio UID (a verificação real mora em firebase-account-identity).
    authenticate: async (request) => {
      const uid = request.headers.get("authorization")?.replace("Bearer ", "");
      return uid ? { uid, name: uid } : undefined;
    },
  });
  const post = (action: string, body: object, uid?: string) =>
    handler(
      new Request(`https://helena.example/api/local-room?action=${action}`, {
        method: "POST",
        headers: uid ? { Authorization: `Bearer ${uid}` } : {},
        body: JSON.stringify(body),
      }),
    );
  return { post, time: (value: number) => void (now = value) };
}

type Joined = {
  participantId: string;
  participantToken: string;
  state: PublicLocalRoomState;
};

async function startedRoomWithAna(settings: object = {}) {
  const h = harness();
  const room = await (await h.post("create", { settings })).json();
  const ana = (await (
    await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana")
  ).json()) as Joined;
  const bia = (await (
    await h.post("join", { code: room.code, displayName: "Bia" }, "conta-bia")
  ).json()) as Joined;
  await h.post("start", { code: room.code, hostToken: room.hostToken });
  return { h, room, ana, bia };
}

const away = ROOM_PRESENCE_GRACE_MS + 5000;

// O tempo passa em passos de 30 s com o anfitrião e a Bia batendo, como numa aula de verdade; a
// Ana é quem some. Sem o anfitrião batendo, o batimento de um participante encerraria a sala.
async function stayPresentUntil(
  h: ReturnType<typeof harness>,
  room: { code: string; hostToken: string },
  participant: Joined,
  until: number,
) {
  for (let at = 30_000; at <= until + 30_000; at += 30_000) {
    h.time(Math.min(at, until));
    await h.post("heartbeat", { code: room.code, role: "host", credential: room.hostToken });
    await h.post("heartbeat", {
      code: room.code,
      role: "participant",
      credential: participant.participantToken,
    });
    if (at >= until) break;
  }
}

describe("reentrada da mesma conta na sala", () => {
  it.each([false, true])(
    "recupera cartela, marcas, pontos e conferência no bingo presencial=%s",
    async (physical) => {
      const { h, room, ana, bia } = await startedRoomWithAna({
        activity: "bingo",
        bingoMode: "corners",
        bingoPhysical: physical,
      });
      h.time(10_000);
      for (let i = 0; i < 75; i++)
        await h.post("next", { code: room.code, hostToken: room.hostToken });
      const snapshot = await (
        await h.post("heartbeat", { code: room.code, role: "host", credential: room.hostToken })
      ).json();
      const card: string[] = snapshot.state.participants.find(
        (p: { id: string }) => p.id === ana.participantId,
      ).bingoCard;
      if (!physical) {
        for (const id of card.filter((n) => n !== "bingo-free"))
          await h.post("answer", {
            code: room.code,
            participantId: ana.participantId,
            participantToken: ana.participantToken,
            questionIndex: snapshot.state.questionIndex,
            answer: id,
          });
      }
      const before = await (
        await h.post("answer", {
          code: room.code,
          participantId: ana.participantId,
          participantToken: ana.participantToken,
          questionIndex: snapshot.state.questionIndex,
          answer: "bingo",
        })
      ).json();
      expect(before.correct).toBe(true);
      await stayPresentUntil(h, room, bia, away + 20_000);
      const response = await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana");
      const back = (await response.json()) as Joined;
      expect(response.status).toBe(200);
      const own = (state: PublicLocalRoomState) =>
        state.participants.find((p) => p.id === ana.participantId)!;
      expect(own(back.state).bingoCard).toEqual(own(before.state).bingoCard);
      expect(own(back.state).bingoMarks).toEqual(own(before.state).bingoMarks);
      expect(own(back.state).score).toBe(own(before.state).score);
      expect(back.state.bingoClaim).toEqual(before.state.bingoClaim);
      expect(back.state.drawnIds).toEqual(before.state.drawnIds);
    },
  );
  it("quem perdeu a sessão e já passou da tolerância volta no meio da atividade, com a mesma identidade", async () => {
    const { h, room, ana, bia } = await startedRoomWithAna();
    // A Ana sumiu e o servidor percebe pelo batimento dos outros.
    await stayPresentUntil(h, room, bia, ROOM_START_COUNTDOWN_MS + away);

    const response = await h.post(
      "join",
      { code: room.code, displayName: "Ana de novo" },
      "conta-ana",
    );
    const back = (await response.json()) as Joined;

    expect(response.status).toBe(200);
    expect(back.participantId).toBe(ana.participantId);
    expect(back.participantToken).not.toBe(ana.participantToken);
    const names = back.state.participants.map((p) => p.displayName);
    expect(names).toEqual(["Ana", "Bia"]);
    expect(back.state.participants.find((p) => p.id === ana.participantId)?.online).toBe(true);
  });

  it("o token antigo deixa de valer e o novo vale", async () => {
    const { h, room, ana, bia } = await startedRoomWithAna();
    await stayPresentUntil(h, room, bia, ROOM_START_COUNTDOWN_MS + away);
    const back = (await (
      await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana")
    ).json()) as Joined;

    const old = await h.post("heartbeat", {
      code: room.code,
      role: "participant",
      credential: ana.participantToken,
    });
    const fresh = await h.post("heartbeat", {
      code: room.code,
      role: "participant",
      credential: back.participantToken,
    });
    expect(old.status).toBe(403);
    expect(fresh.status).toBe(200);
  });

  it("enquanto o primeiro dispositivo ainda está presente, a mesma conta continua barrada", async () => {
    const { h, room } = await startedRoomWithAna();
    h.time(ROOM_START_COUNTDOWN_MS + 5000);
    const response = await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana");
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "already_in_room" });
  });

  it("no lobby, o mesmo nome da própria conta não conta como nome já em uso", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: {} })).json();
    const ana = (await (
      await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana")
    ).json()) as Joined;
    h.time(away);
    const response = await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana");
    const back = (await response.json()) as Joined;
    expect(response.status).toBe(200);
    expect(back.participantId).toBe(ana.participantId);
    expect(back.state.participants).toHaveLength(1);
  });

  it("repetir o mesmo pedido de entrada devolve o mesmo token", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: {} })).json();
    await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana");
    h.time(away);
    const requestId = "11111111-1111-4111-8111-111111111111";
    const first = (await (
      await h.post("join", { code: room.code, displayName: "Ana", requestId }, "conta-ana")
    ).json()) as Joined;
    const second = (await (
      await h.post("join", { code: room.code, displayName: "Ana", requestId }, "conta-ana")
    ).json()) as Joined;
    expect(second.participantToken).toBe(first.participantToken);
  });

  it("depois que a sala encerra, ninguém volta", async () => {
    const { h, room } = await startedRoomWithAna();
    await h.post("end", { code: room.code, hostToken: room.hostToken });
    h.time(ROOM_START_COUNTDOWN_MS + away);
    const response = await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana");
    expect(response.status).toBe(409);
  });

  it("convidado sem conta continua sem entrar depois que a atividade começou", async () => {
    const { h, room } = await startedRoomWithAna();
    const response = await h.post("join", { code: room.code, displayName: "Convidado" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "Esta sala já começou a atividade." });
  });
});
