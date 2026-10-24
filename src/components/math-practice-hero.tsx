import { uiText, useLanguage } from "../i18n/runtime";
import type { WorkspaceState } from "../domain/workspace";
import { mathematicsStreak } from "../domain/profile-streaks";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { useWallClock } from "../hooks/use-wall-clock";
import { PaperArrow } from "./paper-arrow";
import { PaperDigits } from "./paper-digits";
import { OliverHeroArt } from "./oliver-hero-art";
export function MathPracticeHero({
  workspace,
  onPractice,
}: {
  workspace: WorkspaceState;
  onPractice(): void;
}) {
  useLanguage();
  const now = useWallClock();
  const streak = mathematicsStreak(workspace, new Date(now), agendaTimeZone());
  const latest = Math.max(
    0,
    ...(workspace.practiceActivities ?? [])
      .filter(
        (item) =>
          /^(math|mathematics)(:|$)/.test(item.islandId) &&
          item.answers > 0 &&
          Date.parse(item.completedAt) <= now,
      )
      .map((item) => Date.parse(item.completedAt)),
  );
  const minutesLeft = Math.max(0, Math.ceil((latest + 86400000 - now) / 60000));
  return (
    <section
      className="math-hero-carousel"
      aria-label={uiText(2717)}
      aria-roledescription={uiText(2718)}
    >
      <article className="math-hero-slide" aria-label={uiText(620)}>
        <div className="math-hero-copy">
          <h1>
            {uiText(streak > 0 ? "Seu fogo matemático está aceso!" : "A próxima descoberta é sua.")}
          </h1>
          {streak === 0 ? (
            <p>{uiText(2724)}</p>
          ) : (
            minutesLeft <= 60 && (
              <p className="math-hero-warning" role="status">
                {uiText(2732, [minutesLeft])}
              </p>
            )
          )}
          {streak > 0 && (
            <div className="math-hero-streak">
              <img src="/math-islands/flame.svg" width="32" height="40" alt="" />
              <PaperDigits value={String(streak)} />
              <span>{uiText(streak === 1 ? "dia de ofensiva" : "dias de ofensiva")}</span>
            </div>
          )}
          <button type="button" className="primary-button" onClick={onPractice}>
            {uiText(streak > 0 ? "Continuar minha ofensiva" : "Explorar Matemática")} <PaperArrow />
          </button>
        </div>
        <OliverHeroArt />
      </article>
      <div className="math-hero-pagination" aria-label={uiText(2729)}>
        <span aria-current="true" />
      </div>
    </section>
  );
}
