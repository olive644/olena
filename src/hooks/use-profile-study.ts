import { useEffect, useState } from "react";
import { MATH_COURSES } from "../data/math-courses";
import { mathGameLearning, readMathGame } from "../data/math-game-learning";
import { mathPlaceRewards } from "../data/math-place-rewards";
import { masteryCompletion, unlockedMasteryCourse } from "../domain/math-mastery-progress";
import { profileLevel } from "../domain/profile-study";
import { SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";

function snapshot() {
  const progress = readMathGame();
  const courses = MATH_COURSES.map((course) => ({
    ...course,
    points: mathPlaceRewards(course.id).points,
    ...masteryCompletion(mathGameLearning(course.id)),
    unlocked: unlockedMasteryCourse(course.id, progress),
  }));
  const totalPoints = courses.reduce(
    (sum, course) => Math.min(Number.MAX_SAFE_INTEGER, sum + course.points),
    0,
  );
  return { courses, totalPoints, ...profileLevel(totalPoints) };
}
export function useProfileStudy() {
  const [value, setValue] = useState(snapshot);
  useEffect(() => {
    const refresh = () => setValue(snapshot());
    window.addEventListener(SYNCED_STORAGE_EVENT, refresh);
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SYNCED_STORAGE_EVENT, refresh);
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return value;
}
