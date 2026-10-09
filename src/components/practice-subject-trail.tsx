import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { isMotionReduced } from "../data/accessibility-preferences";
import {
  MOBILE_TRAIL_Y,
  MATH_SCENE_COUNT,
  SUBJECT_TRAILS,
  type PracticeIsland,
  type TrailIslandId,
} from "../data/practice-trails";
import type { StoredProfile } from "../hooks/use-stored-profile";
import { PaperArrow } from "./paper-arrow";
import { PracticeUserPortrait } from "./practice-user-portrait";
import "./practice-subject-trail.css";

function TrailEmblem({ id }: { id: TrailIslandId }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="practice-trail-emblem">
      {id === "portuguese" || id === "languages" ? (
        <>
          <path d="m4 13 17-4 3 3 3-3 17 4v27l-17-3-3 3-3-3-17 3Z" fill="#843222" />
          <path d="m5 10 16-4 3 4 3-4 16 4v25l-16-3-3 4-3-4-16 3Z" fill="#fff9ef" />
          <path d="m24 10 3-4v26l-3 4Z" fill="#e4c698" />
          <path
            d="m10 16 8-2v3l-8 2Zm0 7 8-2v3l-8 2Zm20-9 8 2v3l-8-2Zm0 7 8 2v3l-8-2Z"
            fill="#b9472c"
          />
        </>
      ) : id === "chemistry" ? (
        <>
          <path d="m10 12 17 13-3 4L7 16Zm18 13 12 10-3 4-12-10Z" fill="#fff9ef" />
          <path d="m10 4 8 5-1 10-9 4-7-7 1-9Z" fill="#facc15" />
          <path d="m25 16 11 5-1 12-11 5-9-8 1-10Z" fill="#8be2e8" />
          <path d="m25 16 11 5-1 12-11 5 3-13Z" fill="#087f95" />
          <path d="m38 30 8 4-1 9-8 4-7-7 2-8Z" fill="#ff9874" />
        </>
      ) : id === "biology" ? (
        <>
          <path d="M6 38 8 17 20 6l23-3-4 24-13 15Z" fill="#b8e784" />
          <path d="m6 38 20 4 13-15 4-24Z" fill="#287443" />
          <path d="m5 43 30-30 3 3L9 47Z" fill="#fff9ef" />
          <path d="m16 31-2-11 4 1 2 8 10 2-2 4Z" fill="#fff9ef" />
        </>
      ) : id === "mathematics" ? (
        <>
          <path d="m23 3 21 33-21 11L3 35Z" fill="#a4ccff" />
          <path d="m23 3 21 33-21 11Z" fill="#2456ba" />
          <path d="m3 35 20-8 21 9-21 11Z" fill="#193b7c" />
          <path d="M23 3v24L3 35Z" fill="#e4f0ff" />
          <path d="m8 40 30-16 3 6-30 16Z" fill="#facc15" />
        </>
      ) : (
        <>
          <path d="M3 7h42v29H3Z" fill="#114459" />
          <path d="M3 7h42l-5 5H8v19l-5 5Z" fill="#89d8e7" />
          <path d="M8 12h32v19H8Z" fill="#fff9ef" />
          <path d="m18 16-7 6 7 6 3-4-4-2 4-3Zm12 0 7 6-7 6-3-4 4-2-4-3Z" fill="#176784" />
          <path d="M20 36h8v6h8v4H12v-4h8Z" fill="#facc15" />
        </>
      )}
    </svg>
  );
}

function MathLevelArtifact({ level }: { level: number }) {
  level = ((level - 1) % 4) + 1;
  if (level === 1)
    return (
      <>
        <path className="number-piece-depth" d="M6 14h88v78H6Z" />
        <path className="number-piece-face" d="M6 7h88v78H6Z" />
        <path className="number-piece-fold" d="M6 7h88l-8 8H14v62l-8 8Z" />
        <path className="math-tool-gold" d="M16 20h68v3H16Zm0 49h68v3H16Z" />
        <path
          className="math-tool-gold"
          d="m24 14 5 4v8l-5 4-5-4v-8Zm17 0 5 4v8l-5 4-5-4v-8Zm22 49 5 4v8l-5 4-5-4v-8Zm17 0 5 4v8l-5 4-5-4v-8Z"
        />
      </>
    );
  if (level === 2)
    return (
      <>
        <path className="math-tool-gold" d="M47 2h6v80h23v7H24v-7h23ZM11 13h78v6H11Z" />
        <path className="number-piece-fold" d="M14 19h3v18h-3Zm69 0h3v18h-3Z" />
        <path className="number-piece-depth" d="m2 37 13 6 13-6-6 16H8Zm70 0 13 6 13-6-6 16H78Z" />
        <path className="math-tool-gold" d="M2 34h26l-6 12H8Zm70 0h26l-6 12H78Z" />
        <path className="number-piece-depth" d="M35 28h30l15 49H20Z" />
        <path className="number-piece-face" d="M35 22h30l15 49H20Z" />
        <path className="number-piece-fold" d="M35 22h30l3 10H32Z" />
      </>
    );
  if (level === 3)
    return (
      <>
        <path className="number-piece-depth" d="M4 83V47l14-23L38 10h24l20 14 14 23v36Z" />
        <path className="math-tool-gold" d="M4 76V40l14-23L38 3h24l20 14 14 23v36Z" />
        <path className="number-piece-face" d="M17 66V43l12-17 14-9h14l14 9 12 17v23Z" />
        <path className="number-piece-edge" d="M17 66h66v7H17Z" />
        <path
          className="math-tool-ticks"
          d="M11 43h8M21 22l7 7M50 6v10M79 22l-7 7M89 43h-8M12 70h8M88 70h-8"
        />
      </>
    );
  return (
    <>
      <path
        className="math-tool-gold"
        d="M12 15h14v24H12Zm21-7h14v31H33Zm21-6h14v37H54Zm21 18h14v19H75Z"
      />
      <path className="number-piece-depth" d="M7 30h86v50L80 91H20L7 80Z" />
      <path className="number-piece-face" d="M7 24h86v50L80 85H20L7 74Z" />
      <path className="number-piece-fold" d="M7 24h86l-8 8H15Z" />
      <path className="number-piece-edge" d="m7 74 13 11h60l13-11H7Z" />
      <path className="math-tool-gold" d="M20 69h60v3H20Z" />
    </>
  );
}

function TrailNumberPiece({ id, level }: { id: TrailIslandId; level: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="practice-trail-number-piece"
      data-piece={id}
    >
      {id === "languages" ? (
        <>
          <path className="number-piece-depth" d="M6 16h88v63H51L30 96V79H6Z" />
          <path className="number-piece-face" d="M6 8h88v63H51L30 88V71H6Z" />
          <path className="number-piece-fold" d="M6 8h88l-8 8H14v47l-8 8Z" />
          <path className="math-tool-gold" d="M22 20h16v3H22Zm40 0h16v3H62ZM22 59h56v3H22Z" />
        </>
      ) : id === "portuguese" ? (
        <>
          <path className="number-piece-depth" d="M13 12h65l10 11v68H13L6 83V20Z" />
          <path className="number-piece-paper" d="M17 17h65v65H17Z" />
          <path className="number-piece-fold" d="M17 82h65v5H17Zm0 7h65v3H17Z" />
          <path className="number-piece-face" d="M13 6h65l10 11v61H13L6 70V14Z" />
          <path className="number-piece-edge" d="M6 14 13 6v72l-7-8Z" />
          <path className="number-piece-fold" d="M25 18h30v3H25Zm0 49h30v3H25Z" />
          <path className="number-piece-fold" d="M67 18h8v14l-4-3-4 3ZM17 14h3v57h-3Z" />
        </>
      ) : id === "chemistry" ? (
        <>
          <path
            className="number-piece-fold"
            d="m13 18 24 17-4 7L9 24Zm50 19 25-13 4 7-25 13ZM60 66l20 20-6 6-20-20Z"
          />
          <path className="number-piece-depth" d="m50 16 31 18v36L50 88 19 70V34Z" />
          <path className="number-piece-face" d="m50 8 31 18v36L50 80 19 62V26Z" />
          <path className="number-piece-fold" d="m50 8 31 18-9 5-22-13-22 13-9-5Z" />
          <path className="number-piece-edge" d="m72 31 9-5v36L50 80v-9l22-14Z" />
          <path
            className="number-piece-face"
            d="m12 6 11 7v13l-11 7-11-7V13Zm77 9 10 6v13l-10 6-10-6V21ZM79 78l11 6v12l-11 4-10-6V84Z"
          />
          <path
            className="number-piece-fold"
            d="m12 6 11 7-11 6-11-6Zm77 9 10 6-10 6-10-6ZM79 78l11 6-11 5-10-5Z"
          />
        </>
      ) : id === "biology" ? (
        <>
          <path className="number-piece-depth" d="m48 7 23 11 22 24-6 28-25 22-32-6L8 66l3-28Z" />
          <path className="number-piece-face" d="m48 1 23 11 22 24-6 28-25 22-32-6L8 60l3-28Z" />
          <path
            className="number-piece-fold"
            d="m48 1 23 11-15 14-26 7-19-1Zm-37 31 19 1-6 17L8 60Z"
          />
          <path className="number-piece-edge" d="m56 26 15-14 22 24-6 28-25 22-7-16 21-17Z" />
          <path
            className="number-piece-fold"
            d="m35 20 13-19 8 25-6-6-5 6ZM24 50l6 7-6 6-6-8Zm38 14 10-5 5 4-15 9Z"
          />
          <path
            className="number-piece-fold"
            d="m53 80 9 6-18 14-7-6Zm21-55 9 7-10 7-4-7ZM18 59l12 9-6 5-11-9Z"
          />
        </>
      ) : id === "mathematics" ? (
        <MathLevelArtifact level={level} />
      ) : (
        <>
          <path className="number-piece-depth" d="M12 12h76l10 15v63l-10 7H12L2 90V27Z" />
          <path className="number-piece-face" d="M12 5h76l10 15v63l-10 7H12L2 83V20Z" />
          <path className="number-piece-fold" d="M12 5h76l10 15-12 8-8-12H22l-8 12-12-8Z" />
          <path className="number-piece-edge" d="m86 28 12-8v63l-10 7H12L2 83l12-10h72Z" />
          <path className="number-piece-fold" d="M24 23h52v3H24Z" />
          <path
            className="number-piece-fold"
            d="m16 37-8 9 8 9 3-4-5-5 5-5Zm68 0 8 9-8 9-3-4 5-5-5-5ZM33 77h34v4H33Z"
          />
        </>
      )}
    </svg>
  );
}

export function PracticeSubjectTrail({
  island,
  profile,
  entering,
  onBack,
  unlockedLevel = Infinity,
  onOpenLevel,
}: {
  island: PracticeIsland;
  profile: StoredProfile;
  entering: boolean;
  onBack: () => void;
  unlockedLevel?: number;
  onOpenLevel?: (level: number) => void;
}) {
  const [journey, setJourney] = useState({
    target: onOpenLevel ? Math.max(0, Math.min(unlockedLevel, 4) - 1) : 0,
    visit: 0,
    direction: "up",
    phase: "open",
  });
  const selected = journey.target;
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    root.current
      ?.querySelector(".is-selected")
      ?.scrollIntoView?.({ block: "center", behavior: "instant" });
  }, []);
  useEffect(() => {
    if (journey.phase === "open") return;
    const timer = window.setTimeout(
      () => {
        setJourney((current) => ({
          ...current,
          phase: current.phase === "travel" ? "arrive" : "open",
        }));
      },
      journey.phase === "travel" ? 850 : 260,
    );
    return () => window.clearTimeout(timer);
  }, [journey.target, journey.visit, journey.phase]);
  useEffect(() => {
    if (journey.phase === "open" && journey.visit > 0) onOpenLevel?.(journey.target + 1);
  }, [journey.phase, journey.visit, journey.target, onOpenLevel]);
  const trail = SUBJECT_TRAILS[island.id];
  const position = trail.points[selected]!;
  return createPortal(
    <section
      ref={root}
      className={`practice-hub solo-world-enter practice-avatar-journey practice-subject-trail practice-subject-trail--${island.id}`}
      aria-label={`Trilha de ${island.subject}`}
      style={
        {
          "--trail-color": trail.color,
          "--trail-shade": trail.shade,
          "--trail-light": trail.light,
        } as CSSProperties
      }
    >
      <header className="practice-trail-heading" aria-label="Navegação da trilha">
        <button className="secondary-button" type="button" onClick={onBack}>
          <PaperArrow back /> Voltar aos mundos
        </button>
        <div>
          <TrailEmblem id={island.id} />
          <h2>{island.id === "mathematics" ? "Matemática básica" : island.subject}</h2>
        </div>
      </header>
      <div
        className="solo-level-path practice-trail-map"
        aria-label={`Caminho de ${island.subject}`}
        style={
          { "--scene-count": island.id === "mathematics" ? MATH_SCENE_COUNT : 1 } as CSSProperties
        }
      >
        {Array.from({ length: island.id === "mathematics" ? MATH_SCENE_COUNT : 1 }, (_, scene) => (
          <div
            key={scene}
            className="practice-trail-scene"
            data-edge={scene === 0 ? "top" : scene === MATH_SCENE_COUNT - 1 ? "bottom" : undefined}
            style={{ "--scene-index": scene } as CSSProperties}
          >
            <picture className="solo-level-scenery" aria-hidden="true">
              <source
                media="(min-width: 900px)"
                srcSet={
                  island.id === "languages"
                    ? "/practice-trails/languages-fast-desktop.webp"
                    : `/practice-trails/${island.id}-fast-desktop.webp`
                }
              />
              <img
                className="solo-level-scenery__art"
                src={
                  island.id === "languages"
                    ? "/practice-trails/languages-fast-mobile.webp"
                    : `/practice-trails/${island.id}-fast-mobile.webp`
                }
                alt=""
                decoding="async"
                loading={
                  scene === (island.id === "mathematics" ? MATH_SCENE_COUNT - 1 : 0)
                    ? "eager"
                    : "lazy"
                }
                fetchPriority={
                  scene === (island.id === "mathematics" ? MATH_SCENE_COUNT - 1 : 0)
                    ? "high"
                    : "auto"
                }
              />
            </picture>
          </div>
        ))}
        <div className="solo-level-track">
          {island.id === "languages" && (
            <svg
              className="practice-language-path"
              viewBox="0 0 100 1000"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M12 970V30h76v940Z" fill="#9f8f75" />
              <path d="M12 958V18h76v940Z" fill="#f2dbac" />
              <path d="M12 18h12v940H12Z" fill="#fff9ef" />
              {Array.from({ length: 31 }, (_, index) => (
                <path key={index} d={`M24 ${35 + index * 30}h64v3H24Z`} fill="#c9ae7f" />
              ))}
            </svg>
          )}
          {trail.stops.map((item, index) => (
            <button
              key={index}
              type="button"
              className={`solo-path-level solo-path-level--${index + 1} practice-trail-stop${selected === index ? " is-selected" : ""}${selected === index && journey.phase !== "travel" ? " is-arrived" : ""}`}
              style={
                {
                  left: `${trail.points[index]!.x}%`,
                  "--trail-desktop-y": `${trail.points[index]!.y}%`,
                  "--trail-mobile-y": `${MOBILE_TRAIL_Y[island.id][index]}%`,
                } as CSSProperties
              }
              aria-pressed={selected === index}
              disabled={index + 1 > unlockedLevel}
              aria-label={`${island.id === "languages" ? "Nível" : "Etapa"} ${index + 1}: ${item.title}. ${index + 1 > unlockedLevel ? "Bloqueado. Complete o nível anterior para desbloquear." : item.description}`}
              onClick={(event) => {
                setJourney((current) => ({
                  target: index,
                  visit: current.visit + 1,
                  direction: index >= current.target ? "up" : "down",
                  phase: isMotionReduced() ? "open" : "travel",
                }));
                event.currentTarget.scrollIntoView?.({
                  block: "center",
                  behavior: isMotionReduced() ? "instant" : "smooth",
                });
              }}
            >
              <span className="solo-path-level__badge">
                <TrailNumberPiece id={island.id} level={index + 1} />
                <b>{index + 1}</b>
              </span>
              <span>
                <small>{item.topic}</small>
                <strong>{item.title}</strong>
              </span>
            </button>
          ))}
          <div
            className={`practice-trail-traveler${journey.phase === "travel" ? ` is-moving is-moving--${journey.direction}` : ""}`}
            style={
              {
                left: `${position.x}%`,
                "--trail-mobile-y": `${MOBILE_TRAIL_Y[island.id][selected]}%`,
                "--trail-desktop-y": `calc(${position.y}% - 62px)`,
              } as CSSProperties
            }
          >
            <PracticeUserPortrait
              profile={profile}
              className={`solo-path-avatar${entering ? " is-entering" : ""}`}
              level={selected + 1}
            />
          </div>
        </div>
      </div>
      <span className="practice-trail-status" role="status">
        {journey.phase === "travel"
          ? `Indo para a etapa ${selected + 1}`
          : journey.phase === "open" && journey.visit > 0 && !onOpenLevel
            ? `Etapa ${selected + 1} selecionada. Exercícios em preparação.`
            : ""}
      </span>
    </section>,
    document.body,
  );
}
