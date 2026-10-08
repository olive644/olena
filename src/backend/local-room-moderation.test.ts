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

type Joined = { participantId: string; participantToken: string; state: PublicLocalRoomState };

async function roomWithTwo() {
  const h = harness();
  const room = await (await h.post("create", { settings: {} })).json();
  const ana = (await (
    await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana")
  ).json()) as Joined;
  const bia = (await (
    await h.post("join", { code: room.code, displayName: "Bia" })
  ).json()) as Joined;
  return { h, room, ana, bia };
}

describe("remover participante", () => {
  it("o anfitrião tira alguém da sala, e o id aparece na lista pública de removidos", async () => {
    const { h, room, ana, bia } = await roomWithTwo();
    const response = await h.post("kick", {
      code: room.code,
      hostToken: room.hostToken,
      participantId: bia.participantId,
    });
    const body = (await response.json()) as { state: PublicLocalRoomState };
    expect(response.status).toBe(200);
    expect(body.state.participants.map((p) => p.id)).toEqual([ana.participantId]);
    expect(body.state.removedParticipantIds).toEqual([bia.participantId]);
  });

  it("o token de quem foi removido deixa de valer", async () => {
    const { h, room, bia } = await roomWithTwo();
    await h.post("kick", {
      code: room.code,
      hostToken: room.hostToken,
      participantId: bia.participantId,
    });
    const heartbeat = await h.post("heartbeat", {
      code: room.code,
      role: "participant",
      credential: bia.participantToken,
    });
    expect(heartbeat.status).toBe(403);
  });

  it("só o anfitrião remove, e só quem está na sala", async () => {
    const { h, room, ana, bia } = await roomWithTwo();
    const notHost = await h.post("kick", {
      code: room.code,
      hostToken: ana.participantToken,
      participantId: bia.participantId,
    });
    expect(notHost.status).toBe(403);
    const unknown = await h.post("kick", {
      code: room.code,
      hostToken: room.hostToken,
      participantId: "nao-existe",
    });
    expect(unknown.status).toBe(404);
  });

  it("o organizador que também joga não pode ser removido", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: { helenaWords: true } })).json();
    const own = (await (
      await h.post("host-player", {
        code: room.code,
        hostToken: room.hostToken,
        active: true,
        displayName: "Oli",
      })
    ).json()) as { participantId: string };
    expect(own.participantId).toBeTruthy();
    const response = await h.post("kick", {
      code: room.code,
      hostToken: room.hostToken,
      participantId: own.participantId,
    });
    expect(response.status).toBe(409);
  });

  it("quem foi removido pode entrar de novo se a sala não estiver fechada", async () => {
    const { h, room, bia } = await roomWithTwo();
    await h.post("kick", {
      code: room.code,
      hostToken: room.hostToken,
      participantId: bia.participantId,
    });
    const again = await h.post("join", { code: room.code, displayName: "Bia" });
    expect(again.status).toBe(200);
  });
});

describe("fechar e reabrir a entrada", () => {
  it("com a entrada fechada, ninguém novo entra e a mensagem explica por quê", async () => {
    const { h, room } = await roomWithTwo();
    const locked = await h.post("lock", {
      code: room.code,
      hostToken: room.hostToken,
      locked: true,
    });
    expect(((await locked.json()) as { state: PublicLocalRoomState }).state.locked).toBe(true);
    const response = await h.post("join", { code: room.code, displayName: "Carla" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "O anfitrião fechou a entrada desta sala.",
    });
  });

  it("reabrir volta a aceitar entradas e o estado público deixa de marcar a sala como fechada", async () => {
    const { h, room } = await roomWithTwo();
    await h.post("lock", { code: room.code, hostToken: room.hostToken, locked: true });
    const reopened = await h.post("lock", {
      code: room.code,
      hostToken: room.hostToken,
      locked: false,
    });
    expect(((await reopened.json()) as { state: PublicLocalRoomState }).state).not.toHaveProperty(
      "locked",
    );
    const response = await h.post("join", { code: room.code, displayName: "Carla" });
    expect(response.status).toBe(200);
  });

  it("quem já estava na sala, logado, volta mesmo com a entrada fechada", async () => {
    const { h, room, ana } = await roomWithTwo();
    await h.post("lock", { code: room.code, hostToken: room.hostToken, locked: true });
    h.time(ROOM_PRESENCE_GRACE_MS + 5000);
    const back = (await (
      await h.post("join", { code: room.code, displayName: "Ana" }, "conta-ana")
    ).json()) as Joined;
    expect(back.participantId).toBe(ana.participantId);
  });

  it("só o anfitrião fecha, e o pedido precisa dizer se é para fechar ou reabrir", async () => {
    const { h, room, ana } = await roomWithTwo();
    const notHost = await h.post("lock", {
      code: room.code,
      hostToken: ana.participantToken,
      locked: true,
    });
    expect(notHost.status).toBe(403);
    const invalid = await h.post("lock", { code: room.code, hostToken: room.hostToken });
    expect(invalid.status).toBe(400);
  });
});

describe("remover durante a atividade", () => {
  it("quem foi removido deixa de contar entre os que já responderam", async () => {
    const { h, room, ana, bia } = await roomWithTwo();
    await h.post("start", { code: room.code, hostToken: room.hostToken });
    h.time(ROOM_START_COUNTDOWN_MS + 1000);
    const answered = (await (
      await h.post("answer", {
        code: room.code,
        participantId: ana.participantId,
        participantToken: ana.participantToken,
        questionIndex: 0,
        answer: "qualquer coisa",
      })
    ).json()) as { state: PublicLocalRoomState };
    expect(answered.state.answeredParticipantIds).toContain(ana.participantId);

    const removed = (await (
      await h.post("kick", {
        code: room.code,
        hostToken: room.hostToken,
        participantId: ana.participantId,
      })
    ).json()) as { state: PublicLocalRoomState };

    expect(removed.state.answeredParticipantIds).not.toContain(ana.participantId);
    expect(removed.state.participants.map((p) => p.id)).toEqual([bia.participantId]);
  });
});
