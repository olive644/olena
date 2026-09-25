import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyWordDifficulty, difficultyFromZipf } from "./word-difficulty";

describe("dificuldade de vocabulário", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("converte frequência Zipf em níveis claros", () => {
    expect(difficultyFromZipf(5)).toBe("easy");
    expect(difficultyFromZipf(4.5)).toBe("medium");
    expect(difficultyFromZipf(3.9)).toBe("hard");
  });

  it("consulta Datamuse e mantém o resultado em cache", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ word: "school", tags: ["n", "f:120.5"] }]), {
        status: 200,
      }),
    );
    const result = await classifyWordDifficulty("School", window.localStorage, true);
    expect(result.source).toBe("datamuse");
    expect(result.difficulty).toBe("easy");
    expect(window.localStorage.getItem("helena-study:word-frequency:v1")).toContain("school");
  });

  it("sem aceite nunca consulta a rede e estima a dificuldade no aparelho", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await classifyWordDifficulty("School");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.source).toBe("estimated");
    expect(window.localStorage.getItem("helena-study:word-frequency:v1")).toBeNull();
  });

  it("sem aceite ainda aproveita o que já estava em cache no aparelho", async () => {
    window.localStorage.setItem("helena-study:word-frequency:v1", JSON.stringify({ school: 5.1 }));
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await classifyWordDifficulty("school", window.localStorage, false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.frequency).toBe(5.1);
  });

  it("com aceite, uma falha da rede cai na estimativa local", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    const result = await classifyWordDifficulty("zebra", window.localStorage, true);
    expect(result.source).toBe("estimated");
  });
});
