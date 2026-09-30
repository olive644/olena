import { beforeEach, describe, expect, it } from "vitest";
import { createRoom, localRoomStorageKey, type LocalRoomState } from "../domain/local-room";
import { createMemoryRoomStore } from "./room-transaction";
import { createRoomRecordingHandler } from "./room-recording-handler";

const code = "ABCDE";
const header = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x86, 0x81, 0x01]);
let now = 1000;
let store = createMemoryRoomStore(() => now);
let handler = createRoomRecordingHandler({
  store,
  now: () => now,
  randomId: () => "recording-1234",
});

function post(action: string, body: unknown): Request {
  return new Request(`https://olena.example/api/room-recording?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  now = 1000;
  store = createMemoryRoomStore(() => now);
  handler = createRoomRecordingHandler({ store, now: () => now, randomId: () => "recording-1234" });
  const room = createRoom(
    { difficulty: "mixed", questionCount: "all", roundSeconds: 30, recordedAudioRequired: true },
    { code, hostToken: "host-token", now },
  );
  room.participants = [{ id: "student", token: "student-token", displayName: "Ana", score: 0 }];
  await store.set(localRoomStorageKey(code), JSON.stringify(room), 3600);
});

describe("gravações da Escuta coletiva", () => {
  it("guarda só para o professor e entrega ao participante a pergunta ativa", async () => {
    const audio = header.toString("base64");
    expect(
      (
        await handler(
          post("upload", { code, credential: "student-token", contentType: "audio/webm", audio }),
        )
      ).status,
    ).toBe(403);
    const uploaded = await handler(
      post("upload", { code, credential: "host-token", contentType: "audio/webm", audio }),
    );
    expect(uploaded.status).toBe(201);
    const { audioId } = (await uploaded.json()) as { audioId: string };
    const room = JSON.parse((await store.get(localRoomStorageKey(code)))!) as LocalRoomState;
    expect(room.recordingIds).toEqual([audioId]);
    room.phase = "playing";
    room.deck = [{ id: "word", front: "school", back: "escola", audioId }];
    room.questionStartedAt = now + 3000;
    await store.set(localRoomStorageKey(code), JSON.stringify(room), 3600);
    expect(
      (await handler(post("play", { code, credential: "student-token", questionIndex: 0 }))).status,
    ).toBe(409);
    now += 3000;
    const played = await handler(
      post("play", { code, credential: "student-token", questionIndex: 0 }),
    );
    expect(played.status).toBe(200);
    expect(played.headers.get("Content-Type")).toBe("audio/webm");
    expect(Buffer.from(await played.arrayBuffer())).toEqual(header);
    expect(
      (await handler(post("play", { code, credential: "wrong", questionIndex: 0 }))).status,
    ).toBe(403);
    expect(
      (await handler(post("play", { code, credential: "student-token", questionIndex: 1 }))).status,
    ).toBe(409);
  });

  it("recusa formato falso, dados grandes e áudio antes da rodada", async () => {
    expect(
      (
        await handler(
          post("upload", {
            code,
            credential: "host-token",
            contentType: "audio/webm",
            audio: Buffer.from("not audio").toString("base64"),
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handler(
          post("upload", {
            code,
            credential: "host-token",
            contentType: "audio/webm",
            audio: Buffer.concat([header, Buffer.alloc(256_001)]).toString("base64"),
          }),
        )
      ).status,
    ).toBe(413);
    expect(
      (await handler(post("play", { code, credential: "student-token", questionIndex: 0 }))).status,
    ).toBe(409);
  });

  it("expira junto da sala", async () => {
    const uploaded = await handler(
      post("upload", {
        code,
        credential: "host-token",
        contentType: "audio/webm",
        audio: header.toString("base64"),
      }),
    );
    expect(uploaded.status).toBe(201);
    now += 4 * 60 * 60 * 1000 + 1;
    expect(
      (await handler(post("play", { code, credential: "student-token", questionIndex: 0 }))).status,
    ).toBe(404);
  });
});
