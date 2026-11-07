import { useRef, useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import type { WorkspaceState } from "../domain/workspace";
import { englishProgress } from "../domain/language-progress";
import { englishStreak, mathematicsStreak } from "../domain/profile-streaks";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { useWallClock } from "../hooks/use-wall-clock";
import { OliverHeroArt } from "./oliver-hero-art";
import { PaperArrow } from "./paper-arrow";
import { PaperDigits } from "./paper-digits";
export function MathPracticeHero({
  workspace,
  onPractice,
  onEnglishPractice,
}: {
  workspace: WorkspaceState;
  onPractice(): void;
  onEnglishPractice(): void;
}) {
  useLanguage();
  const now = useWallClock();
  const [english, setEnglish] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const streak = (english ? englishStreak : mathematicsStreak)(
    workspace,
    new Date(now),
    agendaTimeZone(),
  );
  const activities = english
    ? englishProgress(workspace.practiceActivities).accepted
    : (workspace.practiceActivities ?? []).filter((item) =>
        /^(math|mathematics)(:|$)/.test(item.islandId),
      );
  const latest = Math.max(
    0,
    ...activities
      .filter((item) => item.answers > 0 && Date.parse(item.completedAt) <= now)
      .map((item) => Date.parse(item.completedAt)),
  );
  const minutesLeft = Math.max(0, Math.ceil((latest + 86400000 - now) / 60000));
  return (
    <section
      className="math-hero-carousel"
      aria-label={uiText("Descobertas com Oliver e Olena")}
      aria-roledescription={uiText(2718)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          setEnglish((current) => !current);
        }
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches[0];
        const start = touchStart.current;
        touchStart.current = null;
        if (!touch || !start) return;
        const dx = touch.clientX - start.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(touch.clientY - start.y)) {
          setEnglish(dx < 0);
        }
      }}
      onTouchCancel={() => {
        touchStart.current = null;
      }}
    >
      <article
        className={`math-hero-slide math-hero-slide--peek${english ? " english-hero-slide" : ""}`}
        aria-label={uiText(english ? "Inglês" : 620)}
      >
        {!english && (
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
        )}
        <div className="math-hero-copy" aria-live="polite" aria-atomic="true">
          <h1>
            {uiText(
              english
                ? streak > 0
                  ? "Seu inglês está ganhando ritmo!"
                  : "Uma nova conversa começa aqui."
                : streak > 0
                  ? "Seu fogo matemático está aceso!"
                  : "A próxima descoberta é sua.",
            )}
          </h1>
          {streak === 0 ? (
            <p>
              {uiText(
                english
                  ? "Explore o Inglês com a Olena. Cada descoberta aproxima você de novas conversas."
                  : 2724,
              )}
            </p>
          ) : (
            minutesLeft <= 60 && (
              <p className="math-hero-warning" role="status">
                {uiText(
                  english ? "Sua ofensiva de Inglês termina em {0} min. Vamos praticar?" : 2732,
                  [minutesLeft],
                )}
              </p>
            )
          )}
          {streak > 0 && (
            <div className="math-hero-streak">
              <img
                src={english ? "/languages/english-streak-flame.svg" : "/math-islands/flame.svg"}
                width="32"
                height="40"
                alt=""
              />
              <PaperDigits value={String(streak)} />
              <span>{uiText(streak === 1 ? "dia de ofensiva" : "dias de ofensiva")}</span>
            </div>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={english ? onEnglishPractice : onPractice}
          >
            {uiText(
              streak > 0
                ? "Continuar minha ofensiva"
                : english
                  ? "Explorar Inglês"
                  : "Explorar Matemática",
            )}{" "}
            <PaperArrow />
          </button>
        </div>
        {english ? (
          <span className="math-hero-peek english-hero-art">
            <img
              src="/languages/olena-english-widget.webp"
              width="900"
              height="600"
              alt={uiText("Olena convida você a praticar Inglês")}
              draggable={false}
              decoding="async"
            />
          </span>
        ) : (
          <OliverHeroArt />
        )}
      </article>
      <div className="math-hero-pagination" aria-label={uiText("Escolher modalidade de prática")}>
        <button
          type="button"
          aria-label={uiText("Mostrar Matemática")}
          aria-pressed={!english}
          onClick={() => setEnglish(false)}
        >
          <span />
        </button>
        <button
          type="button"
          aria-label={uiText("Mostrar Inglês")}
          aria-pressed={english}
          onClick={() => setEnglish(true)}
        >
          <span />
        </button>
      </div>
    </section>
  );
}
