import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { READY_LISTENING_DECK } from "../domain/ready-listening-words";

describe("alfabeto inglês de papel", () => {
  it("inclui A a Z uma única vez e cobre todas as palavras do banco em um arquivo leve", () => {
    const sprite = readFileSync(
      resolve(process.cwd(), "public/paper-monochrome-alphabet.svg"),
      "utf8",
    );
    const letters = [...sprite.matchAll(/id="letter-([A-Z])"/g)].map((match) => match[1]);
    expect(letters.join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    for (const card of READY_LISTENING_DECK) {
      for (const letter of card.front.toUpperCase()) expect(letters).toContain(letter);
    }
    expect(Buffer.byteLength(sprite)).toBeLessThan(12_000);
    expect(sprite).not.toContain("<image");
    expect(sprite).toContain("var(--digit-face");
    expect(sprite).not.toContain("us-paper");
  });
});
