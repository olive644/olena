import { uiText, useLanguage } from "../i18n/runtime";
import type { WorkspaceState } from "../domain/workspace";
import { mathematicsStreak } from "../domain/profile-streaks";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { useWallClock } from "../hooks/use-wall-clock";
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
  return (
    <section
      className="math-hero-carousel"
      aria-label={uiText("Descobertas com Oliver")}
      aria-roledescription={uiText("Carrossel")}
    >
      <article className="math-hero-slide" aria-label={uiText("Ilhas de Matemática")}>
        <div className="math-hero-copy">
          <span className="section-label">{uiText("Uma aventura com Oliver")}</span>
          <h1>
            {uiText(streak > 0 ? "Seu fogo matemático está aceso!" : "A próxima descoberta é sua.")}
          </h1>
          <p>
            {streak > 0
              ? uiText(
                  "Continue sua ofensiva e mantenha o fogo azul vivo. Uma nova prática faz a diferença.",
                )
              : uiText(
                  "Explore as ilhas de Matemática comigo. Cada resposta abre um novo caminho!",
                )}
          </p>
          {streak > 0 && (
            <div className="math-hero-streak">
              <img src="/math-islands/flame.svg" width="32" height="40" alt="" />
              <PaperDigits value={String(streak)} />
              <span>{uiText("dias de ofensiva")}</span>
            </div>
          )}
          <button type="button" className="primary-button" onClick={onPractice}>
            {uiText(streak > 0 ? "Continuar minha ofensiva" : "Explorar Matemática")} <PaperArrow />
          </button>
        </div>
        <img
          className="math-hero-oliver"
          src="/oliver-math-islands.png"
          width="720"
          height="791"
          fetchPriority="high"
          alt={uiText("Oliver convidando você para explorar as ilhas de Matemática")}
          draggable={false}
        />
      </article>
      <div className="math-hero-pagination" aria-label={uiText("Página 1 de 1")}>
        <span aria-current="true" />
      </div>
    </section>
  );
}
