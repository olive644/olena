import { describe, expect, it } from "vitest";
import { mergeSyncedItems } from "./sync-conflict";

describe("mergeSyncedItems", () => {
  it("combina alterações independentes dos dispositivos", () => {
    expect(
      mergeSyncedItems(
        { profile: "old", theme: "light" },
        { profile: "new-local", theme: "light" },
        { profile: "old", theme: "dark" },
      ),
    ).toEqual({
      items: { profile: "new-local", theme: "dark" },
      conflicts: [],
    });
  });

  it("preserva a versão local e marca conflito na mesma chave", () => {
    expect(
      mergeSyncedItems({ workspace: "old" }, { workspace: "local" }, { workspace: "remote" }),
    ).toEqual({ items: { workspace: "local" }, conflicts: ["workspace"] });
  });

  it("mantém exclusões locais sem reintroduzir o valor antigo", () => {
    expect(mergeSyncedItems({ note: "old" }, {}, { note: "old" })).toEqual({
      items: {},
      conflicts: [],
    });
  });
});
