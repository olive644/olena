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
    expect(user[".write"]).toBe(
      "auth != null && auth.uid === $uid && auth.token.firebase.sign_in_provider != 'anonymous'",
    );
  });

  it("o nó legado state fica congelado: o aplicativo só lê dele para migrar e nunca grava", () => {
    // Antes ele permitia até 100 milhões de caracteres por conta além do stateV2. A leitura
    // (migração) e a exclusão (null não passa por validate) continuam funcionando.
    expect(user.state[".validate"]).toBe(false);
    expect(user.$other[".validate"]).toBe(false);
    expect((user.state["version"] as Rule)[".validate"]).toBe("newData.isNumber()");
    expect((user.state["updatedAt"] as Rule)[".validate"]).toBe("newData.isNumber()");
    expect((user.state["$other"] as Rule)[".validate"]).toBe(false);
  });

  it("cada item é um texto limitado, com nome de chave comum", () => {
    const rule = user.state.items.$key[".validate"];
    expect(rule).toContain("newData.isString()");
    expect(rule).toMatch(/newData\.val\(\)\.length <= /);
  });

  it("só aceitam as chaves sincronizadas conhecidas, nas duas versões, e rejeitam o resto", () => {
    const modern = rules.rules.users.$uid["stateV2"] as {
      items: { $key: { ".validate": string } };
    };
    const keyPattern = (rule: string) => new RegExp(/matches\(\/(.+?)\/\)/.exec(rule)![1]!);
    const legacyPattern = keyPattern(user.state.items.$key[".validate"]);
    const modernPattern = keyPattern(modern.items.$key[".validate"]);
    for (const name of SYNCED_STORAGE_KEYS) expect(legacyPattern.test(name)).toBe(true);
    const wires = Object.keys(
      encodeCloudItems(Object.fromEntries(SYNCED_STORAGE_KEYS.map((name) => [name, "v"]))),
    );
    expect(wires).toHaveLength(SYNCED_STORAGE_KEYS.length);
    for (const wire of wires) expect(modernPattern.test(wire)).toBe(true);
    for (const intruso of ["k_aaaa", "k_" + "A".repeat(98), "lixo", "x.y.z"]) {
      expect(modernPattern.test(intruso)).toBe(false);
      expect(legacyPattern.test(intruso)).toBe(false);
    }
  });

  it("o teto somado dos itens que não são a folha de trabalho vale no stateV2", () => {
    const modern = rules.rules.users.$uid["stateV2"] as { items: { ".validate": string } };
    const workspaceWire = Object.keys(encodeCloudItems({ [SYNCED_STORAGE_KEYS[0]]: "v" }))[0]!;
    const expression = modern.items[".validate"];
    // A folha de trabalho tem teto próprio e não entra na soma.
    expect(expression).not.toContain(workspaceWire);
    const others = Object.keys(
      encodeCloudItems(Object.fromEntries(SYNCED_STORAGE_KEYS.slice(1).map((name) => [name, "v"]))),
    );
    expect(others).toHaveLength(16);
    for (const wire of others) expect(expression).toContain(`'${wire}'`);
    // Expressão estática do repositório, nunca entrada de usuário.
    const evaluate = new Function("newData", `return (${expression});`) as (
      newData: unknown,
    ) => boolean;
    const withLengths = (lengths: Record<string, number>) => ({
      child: (key: string) => ({
        exists: () => key in lengths,
        val: () => ({ length: lengths[key] }),
      }),
    });
    const each = (length: number) => Object.fromEntries(others.map((wire) => [wire, length]));
    expect(evaluate(withLengths({}))).toBe(true);
    expect(evaluate(withLengths(each(500_000)))).toBe(true); // 8 milhões somados
    expect(evaluate(withLengths(each(500_001)))).toBe(false);
    expect(evaluate(withLengths({ [others[0]!]: 8_000_000 }))).toBe(true);
    expect(evaluate(withLengths({ [others[0]!]: 8_000_001 }))).toBe(false);
    // Uma conta com a folha de trabalho no teto (20 milhões) e o resto no limite do navegador
    // (cerca de 5 milhões de caracteres) continua cabendo.
    expect(evaluate(withLengths({ [workspaceWire]: 20_000_000, [others[3]!]: 5_000_000 }))).toBe(
      true,
    );
  });

  it("limita cada item (só a folha de trabalho passa de 5 milhões) e bloqueia contas anônimas", () => {
    const modern = rules.rules.users.$uid["stateV2"] as {
      items: { $key: { ".validate": string } };
    };
    const workspaceWire = Object.keys(encodeCloudItems({ [SYNCED_STORAGE_KEYS[0]]: "v" }))[0]!;
    expect(modern.items.$key[".validate"]).toContain(`'${workspaceWire}') ? 20000000 : 5000000`);
    expect(user[".write"]).toContain("auth.token.firebase.sign_in_provider != 'anonymous'");
  });

  it("aceitam o nome de toda chave que o aplicativo sincroniza hoje", () => {
    const literal = /matches\(\/(.+)\/\)/.exec(user.state.items.$key[".validate"])?.[1];
    expect(literal).toBeDefined();
    const pattern = new RegExp(literal ?? "");
    for (const key of SYNCED_STORAGE_KEYS) expect(pattern.test(key)).toBe(true);
    for (const key of Object.keys(
      encodeCloudItems(Object.fromEntries(SYNCED_STORAGE_KEYS.map((name) => [name, "value"]))),
    ))
      expect(key).not.toMatch(/[.$#[\]/]/);
    expect(pattern.test("a".repeat(101))).toBe(false);
    expect(pattern.test("com/barra")).toBe(false);
    expect(pattern.test("")).toBe(false);
  });
});
