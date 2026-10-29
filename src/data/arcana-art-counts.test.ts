import { existsSync } from "node:fs";
import { expect, it } from "vitest";
import active from "../../public/arcana/catalog.json";
import preview from "../../previews/arcana-catalog.json";

it("serve as variantes de contagem revisadas tanto na coleção quanto no estudo", () => {
  for (const rank of ["05", "06", "08", "09", "10"]) {
    const id = `wands-${rank}`;
    const asset = `/arcana/ink/${id}-count-v3.webp`;
    expect(active.find((card) => card.id === id)?.asset, id).toBe(asset);
    expect(preview.find((card) => card.id === id)?.asset, id).toBe(asset);
    expect(existsSync(`public${asset}`), id).toBe(true);
    expect(existsSync(`public${asset.replace(".webp", "-small.webp")}`), id).toBe(true);
  }
});
