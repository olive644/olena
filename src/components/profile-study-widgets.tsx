import { uiText, useLanguage } from "../i18n/runtime";
import { lazy, Suspense, useState, type Dispatch } from "react";
import type { WorkspaceAction } from "../domain/workspace";
import { useProfileStudy } from "../hooks/use-profile-study";
import { useStoredProfile, readStoredProfile } from "../hooks/use-stored-profile";
import { writeSyncedStorage } from "../data/synced-storage";
import { PRACTICE_ISLANDS } from "../data/practice-islands";
import type { MathCourseId } from "../data/math-courses";
import { PracticeIslandCarousel } from "./practice-island-carousel";
import { PaperDigits } from "./paper-digits";
import { PaperCheckIcon } from "./paper-check-icon";
import { HelenaLoading } from "./helena-loading";
import { PaperArrow } from "./paper-arrow";
import { RoomPointsIcon } from "./room-paper-icons";
import "../practice-islands.css";
import "../solo-journey.css";
import "./profile-study-widgets.css";

const MathJourney = lazy(() =>
  import("./math-island-journey").then((module) => ({ default: module.MathIslandJourney })),
);

export function ProfileXpBar() {
  useLanguage();

  const stats = useProfileStudy();
  return (
    <div className="profile-xp" title={uiText(950)}>
      <div>
        <strong>
          <RoomPointsIcon xp /> {uiText(449)} {stats.level}
        </strong>
        <span>
          {stats.current} / {stats.next} {uiText(468)}
        </span>
      </div>
      <progress aria-label={uiText(951)} value={stats.current} max={stats.next} />
    </div>
  );
}
export function ProfileLevelBadge({ level: publicLevel }: { level?: number } = {}) {
  useLanguage();

  const { level: ownLevel } = useProfileStudy();
  const level = publicLevel ?? ownLevel;
  return (
    <span className="profile-level-badge" aria-label={uiText(1733, [level])}>
      <small>{uiText(464)}</small>
      <PaperDigits value={String(level)} />
    </span>
  );
}
export function ProfileStudyWidgets({
  dispatch,
}: {
  dispatch?: Dispatch<WorkspaceAction> | undefined;
}) {
  useLanguage();

  const stats = useProfileStudy();
  const [profile] = useStoredProfile();
  const [island, setIsland] = useState(4);
  const [parts, setParts] = useState(false);
  const [journey, setJourney] = useState<MathCourseId>();
  const [error, setError] = useState("");
  const world = PRACTICE_ISLANDS[island]!;
  const chosenFavorite = "favoriteIsland" in profile ? profile.favoriteIsland : undefined;
  const favorite = PRACTICE_ISLANDS.find((item) => item.id === chosenFavorite);
  const percent =
    world.id === "mathematics"
      ? Math.floor(
          stats.courses.reduce((sum, course) => sum + course.percent, 0) / stats.courses.length,
        )
      : 0;
  function favoriteWorld() {
    try {
      writeSyncedStorage(
        "helena.profile.v1",
        JSON.stringify({ ...readStoredProfile(), favoriteIsland: world.id }),
      );
      setError("");
    } catch {
      setError(uiText(952));
    }
  }
  return (
    <>
      <section
        className="profile-card profile-islands practice-hub"
        aria-labelledby="profile-islands-title"
      >
        <header className="profile-widget-heading">
          <h2 id="profile-islands-title">{uiText(953)}</h2>
          <span className="profile-points-total">
            <PaperDigits value={String(stats.totalPoints)} />
            <small>{uiText(954)}</small>
          </span>
        </header>
        {parts ? (
          <>
            <button className="secondary-button" type="button" onClick={() => setParts(false)}>
              <PaperArrow back />
              {uiText(598)}
            </button>
            <div className="profile-island-parts">
              {stats.courses.map((course) => (
                <button
                  type="button"
                  key={course.id}
                  className="profile-island-part"
                  onClick={() => setJourney(course.id)}
                  disabled={!course.unlocked}
                  aria-label={uiText(1925, [
                    course.title,
                    course.percent,
                    course.points,
                    course.unlocked ? "" : uiText(1924),
                  ])}
                >
                  <span className="profile-part-score">
                    {course.percent}% · {course.points} {uiText(466)}
                  </span>
                  <img
                    src={`/math-islands/places/${course.id}-small.webp`}
                    alt=""
                    width="160"
                    height="160"
                    loading="lazy"
                  />
                  <strong>{course.title}</strong>
                  <small>{course.subject}</small>
                  <progress
                    value={course.percent}
                    max="100"
                    aria-label={uiText(1926, [course.title])}
                  />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="profile-island-score" aria-live="polite">
              {world.id === "mathematics" ? (
                <>
                  <strong>{percent}%</strong>
                  <span>
                    {stats.totalPoints} {uiText(466)}
                  </span>
                </>
              ) : (
                <span>{uiText(955)}</span>
              )}
            </div>
            <PracticeIslandCarousel
              index={island}
              onVisit={(index) => {
                if (index >= 0 && index < PRACTICE_ISLANDS.length) setIsland(index);
              }}
              profile={profile}
              onEnter={() => setParts(true)}
            />
            <div className="profile-island-caption" key={world.id}>
              <small>{world.subject}</small>
              <h3>{world.title}</h3>
            </div>
            <div className="profile-island-actions">
              <button
                type="button"
                className="primary-button"
                disabled={world.id !== "mathematics"}
                onClick={() => setParts(true)}
              >
                {uiText(956)}
              </button>
              <button
                type="button"
                className="secondary-button"
                aria-pressed={favorite?.id === world.id}
                onClick={favoriteWorld}
              >
                <PaperCheckIcon size={18} />
                {favorite?.id === world.id ? uiText(1927) : uiText(1928)}
              </button>
            </div>
          </>
        )}
        <p className="profile-favorite-label">
          {uiText(957)} <strong>{favorite?.title ?? uiText(2070)}</strong>
        </p>
        {error && <p role="alert">{uiText(error)}</p>}
      </section>
      {journey && (
        <Suspense fallback={<HelenaLoading label={uiText(958)} />}>
          <MathJourney
            initialCourse={journey}
            onBack={() => setJourney(undefined)}
            onPractice={(activity) => dispatch?.({ type: "practice/recorded", activity })}
          />
        </Suspense>
      )}
    </>
  );
}
