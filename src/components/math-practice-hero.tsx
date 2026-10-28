import { uiText, useLanguage } from "../i18n/runtime";
import type { WorkspaceState } from "../domain/workspace";
import { mathematicsStreak } from "../domain/profile-streaks";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { useWallClock } from "../hooks/use-wall-clock";
import { OliverHeroArt } from "./oliver-hero-art";
import { PaperArrow } from "./paper-arrow";
import { PaperDigits } from "./paper-digits";
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
      <article className="math-hero-slide math-hero-slide--peek" aria-label={uiText(620)}>
        <div className="math-hero-math-decoration" aria-hidden="true">
          <svg viewBox="0 0 280 200" fill="none">
            <path
              d="M0 40H280M0 80H280M0 120H280M0 160H280M40 0V200M80 0V200M120 0V200M160 0V200M200 0V200M240 0V200"
              stroke="currentColor"
              opacity=".15"
            />
            <path
              d="m32 164 54-96 55 96H32Zm147-29 47-64 33 85-80-21Z"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle cx="86" cy="68" r="6" fill="currentColor" />
            <g transform="translate(178 20)">
              <circle cx="28" cy="28" r="26" stroke="currentColor" strokeWidth="3" />
              <path d="M28 2v26h26A26 26 0 0 0 28 2Z" fill="#facc15" />
              <path d="M28 28 10 47M28 28 46 47" stroke="currentColor" strokeWidth="2" />
            </g>
            <path d="m12 35 14-8 14 8v18l-14 8-14-8V35Z" fill="#2563d9" />
            <path d="m12 35 14 8 14-8m-14 8v18" stroke="#a8dbea" strokeWidth="2" />
          </svg>
        </div>
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
