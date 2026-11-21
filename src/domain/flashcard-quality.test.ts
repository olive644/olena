import { beforeEach, describe, expect, it } from "vitest";
import {
  cardFeatures,
  emptyModel,
  FEATURE_COUNT,
  learn,
  learnFromSignal,
  loadModel,
  MIN_SAMPLES,
  predictReject,
  resetModel,
  saveModel,
  shouldHide,
} from "./flashcard-quality";

beforeEach(() => localStorage.clear());

const bad = cardFeatures(
  "Pascal Jobs Wozniak Gates Intel Apple Microsoft IBM Altair (1975), 1976; 1981: 1984, 1985.",
  "Falso. O texto diz: x",
  "number",
);
const good = cardFeatures(
  "A planta usa gás carbônico, água e luz para produzir glicose.",
  "Verdadeiro. A planta usa gás carbônico, água e luz para produzir glicose.",
  "true",
);

describe("filtro de qualidade aprendido no aparelho", () => {
  it("tem o tamanho certo e não usa o texto", () => {
    expect(bad).toHaveLength(FEATURE_COUNT);
    expect(bad.every(Number.isFinite)).toBe(true);
    expect(bad.every((value) => value >= 0 && value <= 1)).toBe(true);
  });

  it("começa neutro e não esconde nada antes de avaliações suficientes", () => {
    const model = emptyModel();
    expect(predictReject(model, bad)).toBe(0.5);
    expect(shouldHide(model, bad)).toBe(false);
    let trained = model;
    for (let i = 0; i < MIN_SAMPLES - 1; i++) trained = learn(trained, bad, 1);
    expect(shouldHide(trained, bad)).toBe(false);
  });

  it("aprende a esconder o que o usuário descarta e a manter o que ele aceita", () => {
    let model = emptyModel();
    for (let i = 0; i < 40; i++) {
      model = learn(model, bad, 1);
      model = learn(model, good, 0);
    }
    expect(model.samples).toBe(80);
    expect(predictReject(model, bad)).toBeGreaterThan(0.8);
    expect(predictReject(model, good)).toBeLessThan(0.4);
    expect(shouldHide(model, bad)).toBe(true);
    expect(shouldHide(model, good)).toBe(false);
  });

  it("não explode com muita repetição", () => {
    let model = emptyModel();
    for (let i = 0; i < 2000; i++) model = learn(model, bad, 1);
    expect(model.weights.every((weight) => Math.abs(weight) <= 8)).toBe(true);
    expect(Number.isFinite(predictReject(model, bad))).toBe(true);
  });

  it("salva, lê, ignora dado estragado e zera", () => {
    learnFromSignal(
      { front: "Texto um dois três quatro cinco seis.", back: "Falso. x", origin: "negation" },
      true,
    );
    learnFromSignal({ front: "Sem origem.", back: "x", origin: undefined }, true);
    expect(loadModel().samples).toBe(1);
    saveModel({ weights: [1, 2], samples: 3 });
    expect(loadModel()).toEqual(emptyModel());
    localStorage.setItem("helena.flashcardQuality.v1", "{x");
    expect(loadModel()).toEqual(emptyModel());
    learnFromSignal(
      { front: "Texto um dois três quatro cinco seis.", back: "Falso. x", origin: "number" },
      false,
    );
    resetModel();
    expect(loadModel()).toEqual(emptyModel());
  });
});
