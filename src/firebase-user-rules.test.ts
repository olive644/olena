import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SYNCED_STORAGE_KEYS } from "./data/synced-storage";
import { encodeCloudItems } from "./data/cloud-state-codec";

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
  it("registro de @ não aceita leitura nem escrita direta pelo navegador", () => {
    const all = JSON.parse(readFileSync("firebase-room.rules.json", "utf8")) as {
      rules: Record<string, unknown>;
    };
    expect(all.rules["privateProfileHandles"]).toEqual({ ".read": false, ".write": false });
    expect(all.rules["privateProfileSocial"]).toEqual({ ".read": false, ".write": false });
  });
  it("rejects stale stateV2 replacements that omit published math v5, while permitting first writes and updates", () => {
    const modern = rules.rules.users.$uid["stateV2"] as { ".validate": string };
    const wire = Object.keys(encodeCloudItems({ "helena.mathGame.v5": "progress" }))[0]!;
    expect(modern[".validate"]).toContain(`data.child('items/${wire}').exists()`);
    expect(modern[".validate"]).toContain(`newData.child('items/${wire}').exists()`);
    // Expressão estática do repositório, nunca entrada de usuário. A publicação
    // no Firebase também valida a sintaxe; este modelo exercita as quatro combinações.
    const evaluate = new Function("data", "newData", `return (${modern[".validate"]});`) as (
      data: unknown,
      newData: unknown,
    ) => boolean;
    const snapshot = (exists: boolean) => ({
      hasChildren: () => true,
      child: (path: string) => ({ exists: () => path === `items/${wire}` && exists, val: () => 2 }),
    });
    expect(evaluate(snapshot(false), snapshot(false))).toBe(true);
    expect(evaluate(snapshot(false), snapshot(true))).toBe(true);
    expect(evaluate(snapshot(true), snapshot(true))).toBe(true);
    expect(evaluate(snapshot(true), snapshot(false))).toBe(false);
  });
  it("accepts safe v2 wire names without changing the owner-only access or legacy node", () => {
    const modern = rules.rules.users.$uid["stateV2"] as {
      ".validate": string;
      items: { $key: { ".validate": string } };
      $other: { ".validate": boolean };
    };
    expect(modern[".validate"]).toContain("=== 2");
    expect(modern.$other[".validate"]).toBe(false);
    const literal = /matches\(\/(.+)\/\)/.exec(modern.items.$key[".validate"])?.[1];
    const pattern = new RegExp(literal!);
    for (const key of Object.keys(
      encodeCloudItems(Object.fromEntries(SYNCED_STORAGE_KEYS.map((name) => [name, "value"]))),
    ))
      expect(pattern.test(key)).toBe(true);
    expect(pattern.test("helenastudy.workspace.v1")).toBe(false);
  });
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
    for (const key of Object.keys(
      encodeCloudItems(Object.fromEntries(SYNCED_STORAGE_KEYS.map((name) => [name, "value"]))),
    )) {
      expect(pattern.test(key)).toBe(true);
      expect(key).not.toMatch(/[.$#[\]/]/);
    }
    expect(pattern.test("a".repeat(101))).toBe(false);
    expect(pattern.test("com/barra")).toBe(false);
    expect(pattern.test("")).toBe(false);
  });
});
