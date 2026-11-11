import { describe, expect, it } from "vitest";
import { accountHasProgress } from "./account-progress";

function storage(values: Record<string, string>) {
  return { getItem: (key: string) => values[key] ?? null };
}

describe("accountHasProgress", () => {
  it("reconhece pontos de Matemática e de Inglês", () => {
    expect(
      accountHasProgress(
        storage({ "helena.mathPlaceRewards.v1": '{"foundations":{"points":3644,"receipts":[]}}' }),
      ),
    ).toBe(true);
    expect(
      accountHasProgress(
        storage({ "helena.englishRewards.v1": '{"english-english":{"points":3020}}' }),
      ),
    ).toBe(true);
  });

  it("não conta chaves vazias, zeradas, ilegíveis ou ausentes", () => {
    expect(accountHasProgress(storage({}))).toBe(false);
    expect(
      accountHasProgress(
        storage({
          "helena.mathPlaceRewards.v1": '{"foundations":{"points":0,"receipts":[]}}',
          "helena.englishRewards.v1": "isso não é JSON",
        }),
      ),
    ).toBe(false);
  });

  it("ignora chaves que não são de progresso", () => {
    expect(accountHasProgress(storage({ "helena.profile.v1": '{"points":999}' }))).toBe(false);
  });
});
