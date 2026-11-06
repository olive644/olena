import { englishBankSize } from "./english-difficulty";
import { englishSkill, englishContext, englishSkillCoverage } from "./english-skills";

/** Confirmation samples skills and contexts, never consecutive formats of one sentence. */
export function englishConfirmation(part: number, seed: number) {
  const scenes = Array.from({ length: englishBankSize(part) / 4 }, (_, scene) => scene);
  const rotated = scenes.slice(seed % scenes.length).concat(scenes.slice(0, seed % scenes.length));
  const usedSkills = new Set<number>();
  const selected: number[] = [];
  for (const distinctSkill of [true, false]) {
    for (const scene of rotated) {
      const skill = englishSkill(part, scene);
      if (
        selected.some(
          (id) => englishContext(part, Math.floor(id / 4)) === englishContext(part, scene),
        )
      )
        continue;
      if (distinctSkill && usedSkills.has(skill)) continue;
      const format = (seed + selected.length) % 4;
      selected.push(scene * 4 + format);
      usedSkills.add(skill);
      if (selected.length === 5) return selected;
    }
  }
  return selected;
}

/** Existing confirmed records remain valid; this is readiness for new confirmations. */
export function englishLearningReady(part: number, solved: Iterable<number>) {
  const ids = [...new Set(solved)];
  const coverage = englishSkillCoverage(part, ids);
  const families = new Map<number, Set<number>>();
  for (let scene = 0; scene < englishBankSize(part) / 4; scene++) {
    const skill = englishSkill(part, scene);
    const contexts = families.get(skill) ?? new Set<number>();
    contexts.add(englishContext(part, scene));
    families.set(skill, contexts);
  }
  return [...families].every(([skill, available]) => {
    const evidence = ids.filter((id) => englishSkill(part, Math.floor(id / 4)) === skill);
    return (
      (coverage.get(skill)?.size ?? 0) >= Math.min(2, available.size) &&
      evidence.some((id) => id % 4 === 0 || id % 4 === 2) &&
      evidence.some((id) => id % 4 === 1 || id % 4 === 3)
    );
  });
}
