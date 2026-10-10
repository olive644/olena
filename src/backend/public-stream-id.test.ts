import { describe, expect, it } from "vitest";
import { createPublicStreamId, isPublicStreamId, publicStreamIdOf } from "./public-stream-id";

describe("identificador do caminho público", () => {
  it("tem 128 bits em hexadecimal e não se repete", () => {
    const ids = new Set(Array.from({ length: 200 }, () => createPublicStreamId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[a-f0-9]{32}$/);
  });

  it("aceita o identificador novo e o código antigo, e nada que mude o caminho", () => {
    expect(isPublicStreamId(createPublicStreamId())).toBe(true);
    expect(isPublicStreamId("ABCDE")).toBe(true);
    expect(isPublicStreamId("../private-rooms/ABCDE")).toBe(false);
    expect(isPublicStreamId("abcde/cursors")).toBe(false);
    expect(isPublicStreamId("")).toBe(false);
    expect(isPublicStreamId("a".repeat(31))).toBe(false);
  });

  it("usa o identificador da sala e, sem ele, o código (salas antigas)", () => {
    expect(publicStreamIdOf({ code: "ABCDE", publicId: "f".repeat(32) })).toBe("f".repeat(32));
    expect(publicStreamIdOf({ code: "ABCDE" })).toBe("ABCDE");
  });
});
