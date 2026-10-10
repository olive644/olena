import type { MathCourseId } from "../data/math-courses";

export function MathPlaceScene({ course }: { course: MathCourseId }) {
  return (
    <img
      className="math-place-scene"
      src={`/math-islands/places/${course}.webp`}
      srcSet={`/math-islands/places/${course}-small.webp 480w, /math-islands/places/${course}.webp 800w`}
      sizes="(max-width: 600px) 75vw, 550px"
      width="800"
      height="800"
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}
