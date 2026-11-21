import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ESSAY_PROPOSALS } from "../data/essay-catalog";
import {
  assessEssayTopic,
  essayTopicChunks,
  topicInputWarning,
  type EssayTopicProfile,
} from "./essay-topic";
const vector = (a: number, b: number) => [a, b, ...Array<number>(382).fill(0)];
const profiles: EssayTopicProfile[] = [
  {
    id: "digital",
    title: "Cidadania digital",
    category: "technology",
    vector: vector(1, 0),
    focus: vector(1, 0),
  },
  {
    id: "waste",
    title: "Resíduos",
    category: "environment",
    vector: vector(0, 1),
    focus: vector(0, 1),
  },
];
const paragraphs = [
  "O atendimento exclusivamente virtual pode excluir pessoas que não possuem aparelhos ou conexão estável. Garantir alternativas presenciais ajuda a preservar o acesso aos serviços públicos e permite que cidadãos exerçam seus direitos sem depender de intermediários.",
  "Além da infraestrutura, a formação para utilizar os serviços deve integrar as políticas públicas. Escolas e centros comunitários podem oferecer orientação para uso seguro dos aplicativos, com acompanhamento das dificuldades encontradas pelas pessoas durante o atendimento.",
];
const text = paragraphs.join("\n\n");
it("preserves all paragraphs and UTF-16 offsets without truncating long essays", () => {
  const input =
    "📚 " + text + "\n" + Array.from({ length: 160 }, (_, i) => `palavra${i}`).join(" ");
  const chunks = essayTopicChunks(input);
  expect(chunks.length).toBeGreaterThan(4);
  for (const chunk of chunks) {
    expect(input.slice(chunk.start, chunk.end)).toBe(chunk.text);
    expect(chunk.text.split(/\s+/u).length).toBeLessThanOrEqual(40);
  }
  expect(chunks.at(-1)?.text).toContain("palavra159");
  expect(() => essayTopicChunks("a".repeat(6001))).toThrow();
});
it("abstains on short text and keyword stuffing regardless of semantic similarity", () => {
  expect(topicInputWarning("teste")).toBe("insufficient");
  const repeated = "Internet cidadania exclusão digital. ".repeat(30);
  expect(topicInputWarning(repeated)).toBe("repetition");
  const result = assessEssayTopic(
    repeated,
    "digital",
    profiles,
    essayTopicChunks(repeated).map((chunk) => ({ ...chunk, vector: vector(1, 0) })),
  );
  expect(result.status).toBe("inconclusive");
});
it("distinguishes consistent alignment, partial alignment, different topics and ambiguity", () => {
  const chunks = essayTopicChunks(text);
  const analyze = (values: number[][]) =>
    assessEssayTopic(
      text,
      "digital",
      profiles,
      chunks.map((chunk, i) => ({ ...chunk, vector: values[i % values.length]! })),
    );
  expect(analyze([vector(1, 0)]).status).toBe("aligned");
  expect(analyze([vector(0, 1)]).status).toBe("off-topic");
  expect(analyze([vector(1, 1)]).status).toBe("inconclusive");
  expect(analyze([vector(1, 0), vector(0, 1)]).status).toBe("inconclusive");
  const broadProfile = [{ ...profiles[0]!, focus: vector(0, 1) }, profiles[1]!];
  expect(
    assessEssayTopic(
      text,
      "digital",
      broadProfile,
      chunks.map((chunk) => ({ ...chunk, vector: vector(1, 0) })),
    ).status,
  ).toBe("tangential");
});
it("rejects stale offsets and malformed embeddings", () => {
  const chunks = essayTopicChunks(text).map((chunk) => ({ ...chunk, vector: vector(1, 0) }));
  expect(() => assessEssayTopic("Novo texto", "digital", profiles, chunks)).toThrow();
  expect(() =>
    assessEssayTopic(
      text,
      "digital",
      profiles,
      chunks.map((chunk) => ({ ...chunk, vector: [1] })),
    ),
  ).toThrow();
});
it("ships a complete, versioned profile for every proposal with valid unit embeddings", () => {
  const data = JSON.parse(readFileSync("public/essay-topics/profiles.json", "utf8")) as {
    model: { revision: string };
    profiles: EssayTopicProfile[];
  };
  expect(data.model.revision).toBe("2c4055b12046f11709e9df2c122e59ffbdc2f900");
  expect(data.profiles.map((profile) => profile.id).sort()).toEqual(
    ESSAY_PROPOSALS.map((proposal) => proposal.id).sort(),
  );
  for (const profile of data.profiles) {
    const proposal = ESSAY_PROPOSALS.find((item) => item.id === profile.id)!;
    expect(profile.title).toBe(proposal.title);
    expect(profile.category).toBe(proposal.categoryId);
    for (const embedding of [profile.vector, profile.focus]) {
      expect(embedding).toHaveLength(384);
      expect(embedding.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...embedding)).toBeCloseTo(1, 4);
    }
  }
});

it("shows the strongest and weakest full paragraphs instead of hiding digressions", () => {
  const third =
    "A coleta seletiva de resíduos precisa de planejamento municipal e de participação comunitária. A reciclagem pode reduzir a quantidade de materiais enviados aos aterros, mas exige infraestrutura e continuidade nas políticas ambientais.";
  const input = [...paragraphs, third].join("\n\n");
  const result = assessEssayTopic(
    input,
    "digital",
    profiles,
    essayTopicChunks(input).map((chunk) => ({
      ...chunk,
      vector: chunk.start < input.indexOf(third) ? vector(1, 0) : vector(0, 1),
    })),
  );
  expect(result.evidence).toHaveLength(2);
  expect(result.evidence[0]?.relation).toBe("related");
  expect(result.evidence[1]?.text).toBe(third);
  expect(result.evidence[1]?.relation).toBe("uncertain");
});
