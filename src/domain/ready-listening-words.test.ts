import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { READY_LISTENING_DECK, readyListeningAudioUrl } from "./ready-listening-words";

describe("palavras prontas da Escuta Coletiva", () => {
  it("inclui 50 palavras distintas com tradução e áudio Kokoro no aplicativo", () => {
    expect(READY_LISTENING_DECK).toHaveLength(50);
    expect(new Set(READY_LISTENING_DECK.map((card) => card.id)).size).toBe(50);
    expect(new Set(READY_LISTENING_DECK.map((card) => card.front)).size).toBe(50);
    for (const card of READY_LISTENING_DECK) {
      expect(card.front).toBeTruthy();
      expect(card.back).toBeTruthy();
      const url = readyListeningAudioUrl(card.id);
      expect(url).toBe(`/audio/kokoro/${card.id}.mp3`);
      const bytes = readFileSync(resolve(process.cwd(), "public", url!.slice(1)));
      expect(bytes.length).toBeGreaterThan(1_000);
      expect(bytes.toString("ascii", 0, 3)).toBe("ID3");
    }
  });

  it("não constrói URL de áudio para identificadores externos", () => {
    expect(readyListeningAudioUrl("../../private")).toBeUndefined();
    expect(readyListeningAudioUrl("material-0")).toBeUndefined();
  });
});
