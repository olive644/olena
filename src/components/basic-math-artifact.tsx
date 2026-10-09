import { BASIC_MATH_LEVELS } from "../data/practice-trails";

export function BasicMathArtifact({ level }: { level: number }) {
  const lesson = BASIC_MATH_LEVELS[level - 1]!;
  return (
    <g data-math-chapter={lesson.chapter} data-math-step={lesson.step}>
      <use href={`/practice-trails/basic-math-markers.svg#math-level-${level}`} />
    </g>
  );
}
