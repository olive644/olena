import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { expect, it } from "vitest";
import { ENGLISH_ACHIEVEMENTS } from "../domain/english-achievement-catalog";
import { achievementArtPath, achievementNumberY } from "../domain/achievement-presentation";

type ArtCell = {
  id: string | null;
  nativeSize: number[];
  sourceRect: number[];
  numberY: number;
  outputSha256: string;
  thumbnailSha256: string;
};
const manifest = JSON.parse(readFileSync("docs/achievement-english-art-sources.json", "utf8")) as {
  groups: { sourceSha256: string; sourceSize: number[]; cells: ArtCell[] }[];
};
const cells = new Map(
  manifest.groups.flatMap((group) =>
    group.cells.filter((cell) => cell.id).map((cell) => [cell.id, cell] as const),
  ),
);

function webpSize(bytes: Buffer) {
  expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
  expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  expect(bytes.toString("ascii", 12, 16)).toBe("VP8X");
  return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
}

it("provides native source evidence and exact output hashes for every English achievement", () => {
  expect(cells.size).toBe(ENGLISH_ACHIEVEMENTS.length);
  for (const group of manifest.groups) {
    expect(group.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Math.min(...group.sourceSize)).toBeGreaterThanOrEqual(1024);
  }
  for (const goal of ENGLISH_ACHIEVEMENTS) {
    const path = achievementArtPath(goal).split("?")[0]!;
    const cell = cells.get(basename(path, ".webp"))!;
    expect(cell).toBeDefined();
    expect(cell.numberY).toBeGreaterThan(105);
    expect(cell.numberY).toBeLessThan(130);
    expect(achievementNumberY(goal)).toBe(cell.numberY);
    expect(Math.min(...cell.nativeSize)).toBeGreaterThanOrEqual(512);
    expect(cell.sourceRect[2]! - cell.sourceRect[0]!).toBe(cell.nativeSize[0]);
    expect(cell.sourceRect[3]! - cell.sourceRect[1]!).toBe(cell.nativeSize[1]);
    const full = readFileSync(`public${path}`);
    const thumb = readFileSync(`public${achievementArtPath(goal, true).split("?")[0]}`);
    expect(webpSize(full)).toEqual([512, 512]);
    expect(webpSize(thumb)).toEqual([256, 256]);
    expect(createHash("sha256").update(full).digest("hex")).toBe(cell.outputSha256);
    expect(createHash("sha256").update(thumb).digest("hex")).toBe(cell.thumbnailSha256);
  }
});

it("keeps thumbnail resolution equal across English, Mathematics and general achievements", () => {
  for (const folder of ["english", "math", "general"]) {
    for (const file of readdirSync(`public/achievement-badges/${folder}/thumb`)) {
      if (file.endsWith(".webp")) {
        const bytes = readFileSync(`public/achievement-badges/${folder}/thumb/${file}`);
        const kind = bytes.toString("ascii", 12, 16);
        const size =
          kind === "VP8X"
            ? webpSize(bytes)
            : kind === "VP8 "
              ? [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff]
              : [
                  (bytes.readUInt32LE(21) & 0x3fff) + 1,
                  ((bytes.readUInt32LE(21) >> 14) & 0x3fff) + 1,
                ];
        expect(size).toEqual([256, 256]);
      }
    }
  }
});
