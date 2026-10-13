import { lazy, Suspense, useState } from "react";
import type { MathCourseId } from "../data/math-courses";

const AnimatedPlace = lazy(() =>
  import("./animated-place").then((module) => ({ default: module.AnimatedPlace })),
);

export function MathPlaceScene({
  course,
  active = true,
  animate = false,
}: {
  course: MathCourseId;
  active?: boolean;
  /** Anima as partes do lugar por cima da arte. A imagem parada continua como alternativa. */
  animate?: boolean;
}) {
  const [animated, setAnimated] = useState(false);
  return (
    <>
      <img
        className={animated ? "math-place-scene is-animated" : "math-place-scene"}
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
      {animate ? (
        <Suspense fallback={null}>
          <AnimatedPlace course={course} active={active} onReadyChange={setAnimated} />
        </Suspense>
      ) : null}
    </>
  );
}
