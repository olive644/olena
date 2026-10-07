import { describe, expect, it, vi } from "vitest";
import { createLocalRoomHandler } from "./local-room-handler";
import { createMemoryRoomStore } from "./room-transaction";
import {
  ROOM_PRESENCE_GRACE_MS,
  toPublicRoomState,
  type LocalRoomState,
  type PublicLocalRoomState,
} from "../domain/local-room";

function harness() {
  let now = 1000;
  const store = createMemoryRoomStore(() => now);
  const publish = vi.fn<(code: string, state: PublicLocalRoomState) => Promise<void>>(
    async () => {},
  );
  const handler = createLocalRoomHandler({
    store,
    now: () => now,
    publish,
    streamUrl: (code) => `/rooms/${code}`,
  });
  const post = (action: string, body: object) =>
    handler(
      new Request(`https://helena.example/api/local-room?action=${action}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  return {
    post,
    publish,
    store,
    time: (value: number) => {
      now = value;
    },
    privateState: async (code: string) =>
      JSON.parse((await store.get(`private-rooms/${code}`))!) as LocalRoomState,
  };
}

async function roomWithOneStudent() {
  const h = harness();
  const room = await (await h.post("create", { settings: {} })).json();
  const student = await (await h.post("join", { code: room.code, displayName: "Ana" })).json();
  return { h, room, student };
}

const beat = (
  h: ReturnType<typeof harness>,
  code: string,
  credential: string,
  role: "host" | "participant" = "participant",
) => h.post("heartbeat", { code, role, credential });

describe("presença sem republicar a sala inteira", () => {
  it("um batimento que não muda nada visível não sobe a revisão nem gera novo estado público", async () => {
    const { h, room, student } = await roomWithOneStudent();
    const revisionBefore = (await h.privateState(room.code)).revision;
    h.publish.mockClear();

    h.time(16_000);
    const response = await beat(h, room.code, student.participantToken);
    const body = (await response.json()) as { state: PublicLocalRoomState };

    expect(response.status).toBe(200);
    expect(body.state.revision).toBe(revisionBefore);
    expect((await h.privateState(room.code)).revision).toBe(revisionBefore);
    // O publicador só é consultado: com a mesma revisão ele não regrava nada (ver
    // createFirebasePublicRoomPublisher), então ninguém recebe um evento novo.
    for (const call of h.publish.mock.calls) expect(call[1].revision).toBe(revisionBefore);
  });

  it("ainda registra a presença no estado privado, para a tolerância continuar valendo", async () => {
    const { h, room, student } = await roomWithOneStudent();
    h.time(16_000);
    await beat(h, room.code, student.participantToken);
    const stored = await h.privateState(room.code);
    expect(stored.participants[0]?.lastSeenAt).toBe(16_000);
  });

  it("o estado público nunca expõe o horário de presença de ninguém", async () => {
    const { h, room, student } = await roomWithOneStudent();
    h.time(16_000);
    const response = await beat(h, room.code, student.participantToken);
    expect(JSON.stringify(await response.json())).not.toContain("lastSeenAt");
    const stored = await h.privateState(room.code);
    expect(JSON.stringify(toPublicRoomState(stored))).not.toContain("lastSeenAt");
  });

  it("um batimento que muda algo visível (alguém caiu) sobe a revisão e publica", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: {} })).json();
    const ana = await (await h.post("join", { code: room.code, displayName: "Ana" })).json();
    const bia = await (await h.post("join", { code: room.code, displayName: "Bia" })).json();
    const revisionBefore = (await h.privateState(room.code)).revision!;
    h.publish.mockClear();

    // A Bia some; o batimento da Ana depois da tolerância percebe que ela caiu.
    h.time(ROOM_PRESENCE_GRACE_MS - 1000);
    await h.post("heartbeat", {
      code: room.code,
      role: "host",
      credential: room.hostToken,
    });
    h.time(ROOM_PRESENCE_GRACE_MS + 5000);
    await beat(h, room.code, ana.participantToken);
    await h.post("heartbeat", { code: room.code, role: "host", credential: room.hostToken });

    const revisionAfter = (await h.privateState(room.code)).revision!;
    expect(revisionAfter).toBeGreaterThan(revisionBefore);
    const published = h.publish.mock.calls.at(-1)![1];
    expect(published.revision).toBe(revisionAfter);
    expect(bia.participantToken).toBeTruthy();
  });

  it("repara a publicação que falhou depois de gravar, no próximo batimento", async () => {
    const h = harness();
    const room = await (await h.post("create", { settings: {} })).json();
    // A entrada grava o estado privado, mas a publicação cai.
    h.publish.mockRejectedValueOnce(new Error("Firebase fora do ar"));
    const failed = await h.post("join", { code: room.code, displayName: "Ana" });
    expect(failed.status).toBe(503);
    const stored = await h.privateState(room.code);
    const revision = stored.revision!;
    const participant = stored.participants[0]!;
    h.publish.mockClear();

    h.time(16_000);
    const response = await beat(h, room.code, participant.token!);

    expect(response.status).toBe(200);
    expect(h.publish).toHaveBeenCalled();
    const republished = h.publish.mock.calls.at(-1)![1];
    expect(republished.revision).toBe(revision);
    expect(republished.participants.map((p) => p.displayName)).toEqual(["Ana"]);
  });
});
