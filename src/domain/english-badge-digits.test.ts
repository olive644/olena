import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { achievementArtPath } from "./achievement-presentation";
import { ENGLISH_ACHIEVEMENTS } from "./english-achievement-catalog";
import { ENGLISH_BADGE_TABLET, englishBadgeDigits } from "./english-badge-digits";

const artName = (path: string) => path.split("/").pop()!.replace(".webp", "");

function webpSize(path: string) {
  const bytes = readFileSync(path);
  const kind = bytes.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
  if (kind === "VP8 ") return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  const bits = bytes.readUInt32LE(21);
  return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
}

describe("número nas badges de Inglês", () => {
  it("toda arte usada tem a placa medida, e toda placa medida tem arte e miniatura", () => {
    for (const item of ENGLISH_ACHIEVEMENTS)
      expect(ENGLISH_BADGE_TABLET[artName(achievementArtPath(item))], item.id).toBeDefined();
    for (const key of Object.keys(ENGLISH_BADGE_TABLET)) {
      expect(existsSync(`public/achievement-badges/english/${key}.webp`), key).toBe(true);
      expect(existsSync(`public/achievement-badges/english/thumb/${key}.webp`), key).toBe(true);
    }
  });

  it("o número cabe na largura da placa e fica centrado nela, de 1 a 4 dígitos", () => {
    for (const [key, [cx, , width]] of Object.entries(ENGLISH_BADGE_TABLET)) {
      for (const count of [1, 2, 3, 4]) {
        const { x, scale } = englishBadgeDigits(key, count);
        const total = count * 14 * scale;
        expect(x, `${key} ${count}`).toBeGreaterThan(cx - width / 2);
        expect(x + total, `${key} ${count}`).toBeLessThan(cx + width / 2);
        expect(x + total / 2).toBeCloseTo(cx + 0.2, 5);
      }
    }
  });

  it("segue a posição de cada arte: a placa mais baixa leva o número mais para baixo", () => {
    const high = englishBadgeDigits("days", 3).y;
    const low = englishBadgeDigits("english-part-3-correct-100", 3).y;
    expect(low - high).toBeGreaterThan(4);
  });

  it("encolhe o número que não caberia e usa a placa de Matemática se a arte for desconhecida", () => {
    expect(englishBadgeDigits("sem-arte", 3).scale).toBe(1);
    expect(englishBadgeDigits("english-part-6-variety-50", 9).scale).toBeLessThan(1);
  });
});

describe("resolução das miniaturas", () => {
  it("Inglês, Matemática e gerais usam miniaturas do mesmo tamanho", () => {
    const sizes = new Set<string>();
    for (const folder of ["english", "math", "general"])
      for (const file of readdirSync(`public/achievement-badges/${folder}/thumb`))
        if (file.endsWith(".webp"))
          sizes.add(webpSize(`public/achievement-badges/${folder}/thumb/${file}`).join("x"));
    expect([...sizes]).toEqual(["256x256"]);
  });
});
