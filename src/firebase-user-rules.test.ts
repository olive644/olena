import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SYNCED_STORAGE_KEYS } from "./data/synced-storage";

type Rule = Record<string, unknown>;
const rules = JSON.parse(readFileSync("firebase-room.rules.json", "utf8")) as {
  rules: { users: { $uid: Rule } };
};
const user = rules.rules.users.$uid as {
  ".read": string;
  ".write": string;
  state: { ".validate": string; items: { $key: { ".validate": string } } } & Rule;
  $other: { ".validate": boolean };
};

describe("regras de /users/<uid>", () => {
  it("continuam limitando leitura e escrita ao próprio usuário autenticado", () => {
    expect(user[".read"]).toBe("auth != null && auth.uid === $uid");
    expect(user[".write"]).toBe("auth != null && auth.uid === $uid");
  });

  it("só aceitam o nó state, com version e updatedAt (items é opcional: o Firebase descarta objeto vazio)", () => {
    expect(user.$other[".validate"]).toBe(false);
    expect(user.state[".validate"]).toContain("['version', 'updatedAt']");
    expect(user.state[".validate"]).not.toContain("items");
    expect((user.state["version"] as Rule)[".validate"]).toBe("newData.isNumber()");
    expect((user.state["updatedAt"] as Rule)[".validate"]).toBe("newData.isNumber()");
    expect((user.state["$other"] as Rule)[".validate"]).toBe(false);
  });

  it("cada item é um texto limitado, com nome de chave comum", () => {
    const rule = user.state.items.$key[".validate"];
    expect(rule).toContain("newData.isString()");
    expect(rule).toMatch(/newData\.val\(\)\.length <= \d+/);
  });

  it("aceitam o nome de toda chave que o aplicativo sincroniza hoje", () => {
    const literal = /matches\(\/(.+)\/\)/.exec(user.state.items.$key[".validate"])?.[1];
    expect(literal).toBeDefined();
    const pattern = new RegExp(literal ?? "");
    for (const key of SYNCED_STORAGE_KEYS) expect(pattern.test(key)).toBe(true);
    expect(pattern.test("a".repeat(101))).toBe(false);
    expect(pattern.test("com/barra")).toBe(false);
    expect(pattern.test("")).toBe(false);
  });
});
