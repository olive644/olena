import { describe, expect, it } from "vitest";
import { fold, searchNotebooks } from "./notebook-search";
import type { StudyNote, StudyNotebook } from "./workspace";

const notebook = (id: string, title: string, pageIds: string[], kind?: "folder"): StudyNotebook =>
  ({
    id,
    title,
    subjectId: "",
    createdAt: "2026-01-01",
    pageIds,
    ...(kind ? { kind } : {}),
  }) as StudyNotebook;

const note = (id: string, title: string, extra: Partial<StudyNote> = {}): StudyNote => ({
  id,
  title,
  content: "",
  subjectId: "",
  updatedAt: "2026-01-01",
  assets: [],
  ...extra,
});

const workspace = {
  notebooks: [notebook("n1", "Física", ["p1", "p2"]), notebook("n2", "Inglês", ["p3"])],
  notes: [
    note("p1", "Cinemática", { content: "A aceleração é a variação da velocidade no tempo." }),
    note("p2", "Óptica", {
      assets: [
        {
          id: "a1",
          kind: "drawing",
          name: "Espelho côncavo",
          dataUrl: "data:,",
          createdAt: "2026-01-01",
          handwriting: {
            version: 1,
            paper: "ruled",
            strokes: [],
            pageText: "Lentes convergentes formam imagem real",
            stickies: [
              {
                id: "s1",
                x: 0,
                y: 0,
                color: "yellow",
                text: "Revisar refração",
                checklist: [{ id: "c1", text: "Refazer exercício 4", done: false }],
              },
            ],
          },
        },
      ],
    }),
    note("p3", "Verbs", { content: "Present perfect: have + participle" }),
  ],
};

describe("busca nos cadernos", () => {
  it("ignora acento e maiúsculas, mantendo o trecho original", () => {
    const hits = searchNotebooks(workspace, "ACELERACAO");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      notebookId: "n1",
      pageId: "p1",
      source: "texto",
      match: "aceleração",
    });
    expect(fold("Óptica Ação")).toBe("optica acao");
  });

  it("acha títulos de caderno e de folha", () => {
    expect(searchNotebooks(workspace, "ingles")[0]).toMatchObject({
      source: "caderno",
      pageId: null,
    });
    expect(searchNotebooks(workspace, "cinematica")[0]).toMatchObject({
      source: "folha",
      pageId: "p1",
    });
  });

  it("acha texto digitado na folha manuscrita, post-its, listas e nomes de anexo", () => {
    expect(searchNotebooks(workspace, "lentes")[0]).toMatchObject({
      source: "texto",
      pageId: "p2",
    });
    expect(searchNotebooks(workspace, "refração")[0]).toMatchObject({ source: "post-it" });
    expect(searchNotebooks(workspace, "exercicio")[0]).toMatchObject({ source: "lista" });
    expect(searchNotebooks(workspace, "concavo")[0]).toMatchObject({ source: "anexo" });
  });

  it("consulta muito curta ou sem resultado devolve vazio", () => {
    expect(searchNotebooks(workspace, "a")).toEqual([]);
    expect(searchNotebooks(workspace, "   ")).toEqual([]);
    expect(searchNotebooks(workspace, "xyzabc")).toEqual([]);
  });

  it("o trecho vem com contexto e reticências nas pontas", () => {
    const [hit] = searchNotebooks(workspace, "velocidade");
    expect(hit!.before.startsWith("…")).toBe(false);
    expect(hit!.match).toBe("velocidade");
    expect(hit!.after).toContain("tempo");
  });

  it("limita a quantidade de resultados", () => {
    const many = {
      notebooks: [
        notebook(
          "n",
          "Muitos",
          Array.from({ length: 80 }, (_, index) => `p${index}`),
        ),
      ],
      notes: Array.from({ length: 80 }, (_, index) => note(`p${index}`, `Folha ${index}`)),
    };
    expect(searchNotebooks(many, "folha").length).toBe(40);
  });
});

describe("busca em bibliotecas grandes", () => {
  it("varre seis mil folhas em poucas dezenas de milissegundos", () => {
    const notebooks = Array.from({ length: 200 }, (_, index) =>
      notebook(
        `n${index}`,
        `Caderno ${index}`,
        Array.from({ length: 30 }, (_, page) => `p${index}-${page}`),
      ),
    );
    const notes = notebooks.flatMap((item) =>
      item.pageIds.map((id) =>
        note(id, `Folha ${id}`, {
          content: "A aceleração é a variação da velocidade no tempo, e a variação da posição.",
        }),
      ),
    );
    const start = performance.now();
    searchNotebooks({ notebooks, notes }, "zzzz");
    const elapsed = performance.now() - start;
    // Antes da normalização rápida isso levava mais de 160 ms; o limite deixa folga para CI lento.
    expect(elapsed).toBeLessThan(120);
  });
});
