import { describe, expect, it } from "vitest";
import { createRoom, localRoomStorageKey, type LocalRoomState } from "../domain/local-room";
import { createMemoryRoomStore } from "./room-transaction";
import { createRoomAudioAuthorizer } from "./room-audio-authorizer";

describe("autorização do áudio da sala", () => {
  it("aceita apenas host ou participante da sala ativa para a pergunta atual", async () => {
    const now = 10_000;
    const store = createMemoryRoomStore(() => now);
    const room: LocalRoomState = {
      ...createRoom(
        { difficulty: "mixed", questionCount: 5, roundSeconds: 30 },
        { code: "ABCDE", hostToken: "host-secret", now },
      ),
      phase: "playing",
      deck: [{ id: "one", front: "hello", back: "olá", difficulty: "easy" }],
      participants: [{ id: "p1", displayName: "Ana", score: 0, token: "participant-secret" }],
    };
    await store.set(localRoomStorageKey(room.code), JSON.stringify(room), 60);
    const authorize = createRoomAudioAuthorizer(store, () => now);

    expect(await authorize("ABCDE", "host-secret", "hello")).toBe(true);
    expect(await authorize("ABCDE", "participant-secret", "hello")).toBe(true);
    expect(await authorize("ABCDE", "wrong-secret", "hello")).toBe(false);
    expect(await authorize("ABCDE", "participant-secret", "different text")).toBe(false);
    expect(await authorize("ZZZZZ", "participant-secret", "hello")).toBe(false);

    await store.set(
      localRoomStorageKey(room.code),
      JSON.stringify({ ...room, phase: "finished" }),
      60,
    );
    expect(await authorize("ABCDE", "participant-secret", "hello")).toBe(false);
  });
});
