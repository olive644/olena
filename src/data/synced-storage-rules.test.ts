import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { SYNCED_STORAGE_KEYS } from "./synced-storage";

const rules = readFileSync("firebase-room.rules.json", "utf8");
const sorted = (values: readonly string[]) => [...values].sort();

function patterns(): { legacy: string[]; encoded: string[] } {
  const found = [...rules.matchAll(/\$key\.matches\(\/\^\(([^)]*)\)\$\/\)/g)].map((match) =>
    match[1]!.split("|"),
  );
  const legacy = found.find((list) => !list[0]!.startsWith("k_"));
  const encoded = found.find((list) => list[0]!.startsWith("k_"));
  if (!legacy || !encoded) throw new Error("padrões de chaves não encontrados nas regras");
  return { legacy: legacy.map((key) => key.split("\\\\.").join(".")), encoded };
}

it("as regras do banco aceitam exatamente as chaves sincronizadas, no formato antigo e no v2", () => {
  const { legacy, encoded } = patterns();
  const decoded = encoded.map((key) => Buffer.from(key.slice(2), "base64").toString("utf8"));
  expect(sorted(legacy)).toEqual(sorted(SYNCED_STORAGE_KEYS));
  expect(sorted(decoded)).toEqual(sorted(SYNCED_STORAGE_KEYS));
});

it("o teto de tamanho do v2 soma todas as chaves, menos a do caderno, que tem limite próprio", () => {
  const counted = [
    ...new Set(
      [
        ...rules.matchAll(/newData\.child\('(k_[A-Za-z0-9]+)'\)\.exists\(\) \? newData\.child/g),
      ].map((match) => Buffer.from(match[1]!.slice(2), "base64").toString("utf8")),
    ),
  ];
  expect(sorted(counted)).toEqual(
    sorted(SYNCED_STORAGE_KEYS.filter((key) => key !== "helenastudy.workspace.v1")),
  );
});
