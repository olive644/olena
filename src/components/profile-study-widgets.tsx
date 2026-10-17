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
  const stats = useProfileStudy();
  return (
    <div
      className="profile-xp"
      title="Nível baseado no XP recebido nas atividades. Primeiro nível: 500 XP; cada próximo nível exige mais 250 XP."
    >
      <div>
        <strong>
          <RoomPointsIcon xp /> Nível {stats.level}
        </strong>
        <span>
          {stats.current} / {stats.next} XP
        </span>
      </div>
      <progress aria-label="XP para o próximo nível" value={stats.current} max={stats.next} />
    </div>
  );
}
export function ProfileLevelBadge() {
  const { level } = useProfileStudy();
  return (
    <span className="profile-level-badge" aria-label={`Nível ${level}`}>
      <small>NV</small>
      <PaperDigits value={String(level)} />
    </span>
  );
}
export function ProfileStudyWidgets({
  dispatch,
}: {
  dispatch?: Dispatch<WorkspaceAction> | undefined;
}) {
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
      setError("Não foi possível salvar sua ilha favorita.");
    }
  }
  return (
    <>
      <section
        className="profile-card profile-islands practice-hub"
        aria-labelledby="profile-islands-title"
      >
        <header className="profile-widget-heading">
          <h2 id="profile-islands-title">Minhas ilhas</h2>
          <span className="profile-points-total">
            <PaperDigits value={String(stats.totalPoints)} />
            <small>pontos no total</small>
          </span>
        </header>
        {parts ? (
          <>
            <button className="secondary-button" type="button" onClick={() => setParts(false)}>
              <PaperArrow back />
              Voltar às ilhas
            </button>
            <div className="profile-island-parts">
              {stats.courses.map((course) => (
                <button
                  type="button"
                  key={course.id}
                  className="profile-island-part"
                  onClick={() => setJourney(course.id)}
                  disabled={!course.unlocked}
                  aria-label={`${course.title}, ${course.percent}%, ${course.points} pontos${course.unlocked ? "" : ", bloqueada"}`}
                >
                  <span className="profile-part-score">
                    {course.percent}% · {course.points} pontos
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
                    aria-label={`Progresso em ${course.title}`}
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
                  <span>{stats.totalPoints} pontos</span>
                </>
              ) : (
                <span>Em breve</span>
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
                Explorar ilha
              </button>
              <button
                type="button"
                className="secondary-button"
                aria-pressed={favorite?.id === world.id}
                onClick={favoriteWorld}
              >
                <PaperCheckIcon size={18} />
                {favorite?.id === world.id ? "Favorita" : "Favoritar"}
              </button>
            </div>
          </>
        )}
        <p className="profile-favorite-label">
          Ilha favorita: <strong>{favorite?.title ?? "Escolha a sua"}</strong>
        </p>
        {error && <p role="alert">{error}</p>}
      </section>
      {journey && (
        <Suspense fallback={<HelenaLoading label="Abrindo sua ilha" />}>
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
