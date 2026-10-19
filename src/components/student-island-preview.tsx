import { useState } from "react";
import { AnimatedPlace } from "./animated-place";
import type { MathCourseId } from "../data/math-courses";

export default function StudentIslandPreview({ course }: { course: MathCourseId }) {
  const [ready, setReady] = useState(false);
  return (
    <span className="student-island-art" data-ready={ready} aria-hidden="true">
      <img
        src={`/math-islands/places/${course}-small.webp`}
        alt=""
        width="180"
        height="180"
        decoding="async"
      />
      <AnimatedPlace course={course} active onReadyChange={setReady} />
    </span>
  );
}
