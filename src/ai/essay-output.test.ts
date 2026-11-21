import { describe, expect, it } from "vitest";
import { ESSAY_COMPETENCY_IDS, normalizeEssayText, parseEssayReview } from "./essay-output";

const essay =
  "A educação é um direito de todos. No entanto, muitos jovens abandonam a escola cedo.\n\nPortanto, o governo deve ampliar o acesso ao ensino.";

const competency = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  level: "good",
  summary: "Bom desempenho nesta competência.",
  notes: [{ quote: "muitos jovens abandonam a escola", comment: "Boa constatação." }],
  ...extra,
});
const review = (
  overrides: Record<string, unknown> = {},
  list = ESSAY_COMPETENCY_IDS.map((id) => competency(id)),
) =>
  JSON.stringify({
    overall: "Texto claro, com pontos a melhorar.",
    competencies: list,
    ...overrides,
  });

describe("parseEssayReview", () => {
  it("aceita as cinco competências com nível, resumo e observações", () => {
    const parsed = parseEssayReview(review(), essay, { allowScore: false });
    expect(parsed?.competencies.map((item) => item.id)).toEqual([...ESSAY_COMPETENCY_IDS]);
    expect(parsed?.competencies[0]?.notes[0]?.quote).toBe("muitos jovens abandonam a escola");
  });

  it("aceita JSON com cerca de código e texto em volta", () => {
    const parsed = parseEssayReview("Aqui:\n```json\n" + review() + "\n```", essay, {
      allowScore: false,
    });
    expect(parsed).toBeDefined();
  });

  it("descarta observação cujo trecho não existe na redação", () => {
    const list = ESSAY_COMPETENCY_IDS.map((id) =>
      competency(id, {
        notes: [
          { quote: "frase que a redação não tem", comment: "Inventada." },
          { quote: "o governo deve ampliar o acesso", comment: "Proposta presente." },
        ],
      }),
    );
    const parsed = parseEssayReview(review({}, list), essay, { allowScore: false });
    expect(parsed?.competencies[0]?.notes).toEqual([
      { quote: "o governo deve ampliar o acesso", comment: "Proposta presente." },
    ]);
  });

  it("compara o trecho sem diferença de caixa, acento ou espaços", () => {
    const list = ESSAY_COMPETENCY_IDS.map((id) =>
      competency(id, {
        notes: [{ quote: "A EDUCACAO   é um\ndireito de todos", comment: "Abertura." }],
      }),
    );
    const parsed = parseEssayReview(review({}, list), essay, { allowScore: false });
    expect(parsed?.competencies[0]?.notes).toHaveLength(1);
    expect(normalizeEssayText("Ação  ")).toBe("acao");
  });

  it("mantém observação sem trecho e recusa trecho curto demais", () => {
    const list = ESSAY_COMPETENCY_IDS.map((id) =>
      competency(id, {
        notes: [{ comment: "Observação geral." }, { quote: "de", comment: "Trecho trivial." }],
      }),
    );
    const parsed = parseEssayReview(review({}, list), essay, { allowScore: false });
    expect(parsed?.competencies[0]?.notes).toEqual([{ comment: "Observação geral." }]);
  });

  it("recusa nível fora dos três valores e competência repetida ou faltando", () => {
    const bad = ESSAY_COMPETENCY_IDS.map((id) =>
      competency(id, id === "C3" ? { level: "ótimo" } : {}),
    );
    expect(parseEssayReview(review({}, bad), essay, { allowScore: false })).toBeUndefined();
    const missing = ESSAY_COMPETENCY_IDS.slice(0, 4).map((id) => competency(id));
    expect(parseEssayReview(review({}, missing), essay, { allowScore: false })).toBeUndefined();
    const repeated = [...ESSAY_COMPETENCY_IDS.slice(0, 4), "C1"].map((id) => competency(id));
    expect(parseEssayReview(review({}, repeated), essay, { allowScore: false })).toBeUndefined();
  });

  it("recusa resposta sem o resumo geral", () => {
    expect(parseEssayReview(review({ overall: "" }), essay, { allowScore: false })).toBeUndefined();
  });

  it("descarta a nota quando a chave está desligada", () => {
    const list = ESSAY_COMPETENCY_IDS.map((id) => competency(id, { score: 160 }));
    const parsed = parseEssayReview(review({}, list), essay, { allowScore: false });
    expect(parsed?.competencies.every((item) => item.score === undefined)).toBe(true);
  });

  it("com a chave ligada só aceita nota da escala de 0 a 200 em passos de 40", () => {
    const list = ESSAY_COMPETENCY_IDS.map((id, index) =>
      competency(id, { score: [160, 1000, 130, "200", 0][index] }),
    );
    const parsed = parseEssayReview(review({}, list), essay, { allowScore: true });
    expect(parsed?.competencies.map((item) => item.score)).toEqual([
      160,
      undefined,
      undefined,
      undefined,
      0,
    ]);
  });

  it("limita quantidade e tamanho de observações", () => {
    const notes = Array.from({ length: 9 }, (_, index) => ({ comment: `Nota ${index}.` }));
    const list = ESSAY_COMPETENCY_IDS.map((id) =>
      competency(id, { notes: [...notes, { comment: "x".repeat(900) }] }),
    );
    const parsed = parseEssayReview(review({}, list), essay, { allowScore: false });
    expect(parsed?.competencies[0]?.notes).toHaveLength(4);
  });

  it("sem detalhe (o pedido de hoje) basta id e nível, e ignora resumo e observações", () => {
    const only = JSON.stringify({
      competencies: ESSAY_COMPETENCY_IDS.map((id) => ({
        id,
        level: "good",
        notes: [{ comment: "ignorada" }],
      })),
    });
    const parsed = parseEssayReview(only, essay, { allowScore: false, detail: false });
    expect(parsed?.overall).toBe("");
    expect(parsed?.competencies.every((item) => item.notes.length === 0)).toBe(true);
    expect(parseEssayReview(only, essay, { allowScore: false })).toBeUndefined();
  });

  it("sem detalhe e com a nota obrigatória, falta de nota refaz a resposta", () => {
    const semNota = JSON.stringify({
      competencies: ESSAY_COMPETENCY_IDS.map((id) => ({ id, level: "good" })),
    });
    const options = { allowScore: true, detail: false };
    expect(parseEssayReview(semNota, essay, { ...options, requireScore: true })).toBeUndefined();
    expect(parseEssayReview(semNota, essay, options)).toBeDefined();
  });
});
