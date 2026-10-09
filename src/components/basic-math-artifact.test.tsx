import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BASIC_MATH_CHAPTERS, BASIC_MATH_LEVELS } from "../data/practice-trails";
import { BasicMathArtifact } from "./basic-math-artifact";
import { readFileSync } from "node:fs";

afterEach(cleanup);

it("organiza 50 objetivos únicos, só de matemática básica", () => {
  expect(BASIC_MATH_LEVELS).toHaveLength(50);
  expect(new Set(BASIC_MATH_LEVELS.map((level) => level.title)).size).toBe(50);
  expect(BASIC_MATH_LEVELS[0]!.title).toBe("Contar até 10");
  expect(BASIC_MATH_LEVELS[49]!.title).toBe("Desafio final de matemática básica");
  expect(BASIC_MATH_CHAPTERS.map((chapter) => chapter.topic)).toEqual([
    "Contagem",
    "Adição",
    "Subtração",
    "Multiplicação",
    "Divisão",
    "Contas mistas",
    "Frações",
    "Decimais",
    "Porcentagens",
    "Dia a dia",
  ]);
});

it("cada posição tem arte vinculada ao conteúdo, sem ciclo de quatro desenhos", () => {
  const designs = new Set<string>();
  for (const [index, lesson] of BASIC_MATH_LEVELS.entries()) {
    const view = render(
      <svg>
        <BasicMathArtifact level={index + 1} />
      </svg>,
    );
    const group = view.container.querySelector("g")!;
    expect(group.getAttribute("data-math-chapter")).toBe(String(lesson.chapter));
    expect(group.getAttribute("data-math-step")).toBe(String(lesson.step));
    // Inner geometry and labels, not the metadata attributes, must differ.
    designs.add(group.innerHTML);
    expect(group.querySelector("use")?.getAttribute("href")).toBe(
      `/practice-trails/basic-math-markers.svg#math-level-${index + 1}`,
    );
    view.unmount();
  }
  expect(designs.size).toBe(50);
  const sprite = new DOMParser().parseFromString(
    readFileSync("public/practice-trails/basic-math-markers.svg", "utf8"),
    "image/svg+xml",
  );
  const symbols = [...sprite.querySelectorAll("symbol")];
  expect(symbols).toHaveLength(50);
  expect(new Set(symbols.map((symbol) => symbol.querySelector("g")!.innerHTML)).size).toBe(50);
  for (const symbol of symbols) {
    expect(symbol.querySelector(".number-piece-face")).not.toBeNull();
    expect(symbol.querySelector(".number-piece-depth")).not.toBeNull();
  }
});
