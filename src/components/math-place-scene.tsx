import type { MathCourseId } from "../data/math-courses";

export function MathPlaceScene({
  course,
  active = true,
}: {
  course: MathCourseId;
  active?: boolean;
}) {
  return (
    <img
      className="math-place-scene"
      src={`/math-islands/places/${course}.webp`}
      srcSet={`/math-islands/places/${course}-small.webp 480w, /math-islands/places/${course}.webp 800w`}
      sizes={active ? "(max-width: 600px) 75vw, 440px" : "(max-width: 600px) 38vw, 240px"}
      width="800"
      height="800"
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      fetchPriority={active ? "high" : "low"}
    />
  );
}
