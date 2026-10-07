import { describe, expect, it } from "vitest";
import { recordRoomXp, ROOM_XP_KEY } from "./room-xp";
const reward = { id: "room:round:player", place: 1, xp: 100, completedAt: 1000 };
function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
describe("recompensas de salas neste dispositivo", () => {
  it("credita uma vez mesmo ao reabrir o resultado", () => {
    const storage = memory();
    expect(recordRoomXp(reward, storage)).toEqual({ added: true, total: 100 });
    expect(recordRoomXp(reward, storage)).toEqual({ added: false, total: 100 });
    expect(recordRoomXp({ ...reward, id: "room:another-round:player", xp: 75 }, storage)).toEqual({
      added: true,
      total: 175,
    });
  });
  it("não apaga um histórico inválido nem credita valores inválidos", () => {
    const storage = memory();
    storage.setItem(ROOM_XP_KEY, "corrompido");
    expect(() => recordRoomXp(reward, storage)).toThrow();
    expect(storage.getItem(ROOM_XP_KEY)).toBe("corrompido");
    expect(() => recordRoomXp({ ...reward, xp: 10001 }, memory())).toThrow();
    expect(recordRoomXp({ ...reward, xp: 250 }, memory()).total).toBe(250);
  });
  it("falha de armazenamento não confirma o crédito", () => {
    expect(() =>
      recordRoomXp(reward, {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      }),
    ).toThrow("quota");
  });
});
