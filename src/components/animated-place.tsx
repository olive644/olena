import { PLACE_RIGS } from "../data/place-rigs";
import type { MathCourseId } from "../data/math-courses";
import { AnimatedIsland } from "./animated-island";

/** Anima um dos seis lugares da ilha de Matemática: só as partes recortadas da arte se mexem. */
export function AnimatedPlace({
  course,
  active,
  onReadyChange,
}: {
  course: MathCourseId;
  active: boolean;
  onReadyChange: (ready: boolean) => void;
}) {
  return (
    <AnimatedIsland
      source={`/math-islands/places/${course}.webp`}
      rig={PLACE_RIGS[course]}
      active={active}
      className="math-place-canvas"
      onReadyChange={onReadyChange}
    />
  );
}
