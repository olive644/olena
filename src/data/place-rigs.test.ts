import { describe, expect, it } from "vitest";
import { PLACE_CYCLE_SECONDS, type PartMotion, type Wave } from "../domain/place-rig";
import { MATH_COURSES } from "./math-courses";
import { PLACE_RIGS } from "./place-rigs";

const reach = (wave: Wave | undefined) => Math.abs(wave?.amp ?? 0);

describe("partes móveis dos seis lugares", () => {
  it("todo lugar de Matemática tem o seu conjunto de partes, sem balançar o avatar", () => {
    for (const course of MATH_COURSES) {
      const rig = PLACE_RIGS[course.id];
      expect(rig.parts.length, course.id).toBeGreaterThan(8);
      expect(rig.group, course.id).toBe(false);
    }
  });

  it("cada parte tem nome único e sementes dentro da arte de 800 pixels", () => {
    for (const course of MATH_COURSES) {
      const ids = PLACE_RIGS[course.id].parts.map((part) => part.id);
      expect(new Set(ids).size, course.id).toBe(ids.length);
      for (const part of PLACE_RIGS[course.id].parts)
        for (const seed of part.seeds) {
          expect(seed.x).toBeGreaterThanOrEqual(0);
          expect(seed.x).toBeLessThan(800);
          expect(seed.y).toBeGreaterThanOrEqual(0);
          expect(seed.y).toBeLessThan(800);
        }
    }
  });

  it("todo movimento fecha dentro do ciclo de 6 s, então a animação não tem emenda", () => {
    for (const course of MATH_COURSES)
      for (const part of PLACE_RIGS[course.id].parts) {
        const motion: PartMotion = part.motion;
        const turns = PLACE_CYCLE_SECONDS / motion.period;
        expect(Math.abs(turns - Math.round(turns)), `${course.id}/${part.id}`).toBeLessThan(1e-9);
        expect(motion.phase).toBeGreaterThanOrEqual(0);
        expect(motion.phase).toBeLessThan(1);
      }
  });

  it("os movimentos são curtos: nenhuma parte sai voando nem se deforma", () => {
    for (const course of MATH_COURSES)
      for (const part of PLACE_RIGS[course.id].parts) {
        const motion: PartMotion = part.motion;
        const { dx, dy, rot, scaleX, scaleY } = motion;
        const name = `${course.id}/${part.id}`;
        expect(reach(dx), name).toBeLessThanOrEqual(8);
        expect(reach(dy), name).toBeLessThanOrEqual(8);
        expect(reach(rot), name).toBeLessThanOrEqual(0.06);
        expect(reach(scaleX), name).toBeLessThanOrEqual(0.45);
        expect(reach(scaleY), name).toBeLessThanOrEqual(0.2);
      }
  });

  it("só o Porto tem água, e as partes de ouro brilham", () => {
    for (const course of MATH_COURSES)
      expect(Boolean(PLACE_RIGS[course.id].water), course.id).toBe(course.id === "calculus2");
    const golden = MATH_COURSES.flatMap((course) =>
      PLACE_RIGS[course.id].parts.filter((part) =>
        part.seeds.some((seed) => seed.color === "gold"),
      ),
    );
    expect(golden.length).toBeGreaterThan(40);
    for (const part of golden) expect(part.glow, part.id).toBe(true);
  });
});
