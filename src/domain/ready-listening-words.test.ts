import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  READY_LISTENING_DECK,
  readyListeningAudioUrl,
  searchReadyListeningWords,
  validReadyListeningWordIds,
} from "./ready-listening-words";

describe("palavras prontas da Escuta Coletiva", () => {
  it("inclui 100 palavras distintas com tradução e áudio Kokoro no aplicativo", () => {
    expect(READY_LISTENING_DECK).toHaveLength(100);
    expect(new Set(READY_LISTENING_DECK.map((card) => card.id)).size).toBe(100);
    expect(new Set(READY_LISTENING_DECK.map((card) => card.front)).size).toBe(100);
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

  it("pesquisa em inglês e português sem exigir acentos", () => {
    expect(searchReadyListeningWords("bus").map((card) => card.id)).toContain("ready-bus");
    expect(searchReadyListeningWords("onibus").map((card) => card.id)).toContain("ready-bus");
    expect(searchReadyListeningWords("autocarro").map((card) => card.id)).toContain("ready-bus");
  });

  it("aceita apenas IDs únicos do catálogo", () => {
    expect(validReadyListeningWordIds(["ready-bus", "ready-book"])).toBe(true);
    expect(validReadyListeningWordIds(["ready-bus", "ready-bus"])).toBe(false);
    expect(validReadyListeningWordIds(["ready-hidden"])).toBe(false);
  });
});
