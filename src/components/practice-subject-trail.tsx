import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { SUBJECT_TRAILS, type PracticeIsland, type SubjectIslandId } from "../data/practice-trails";
import type { StoredProfile } from "../hooks/use-stored-profile";
import { HelenaRoomIcon } from "./helena-room-icon";
import { PracticeUserPortrait } from "./practice-user-portrait";
import "./practice-subject-trail.css";

function TrailEmblem({ id }: { id: SubjectIslandId }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="practice-trail-emblem">
      {id === "portuguese" ? (
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

function TrailNumberPiece({ id }: { id: SubjectIslandId }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="practice-trail-number-piece"
      data-piece={id}
    >
      {id === "portuguese" ? (
        <>
          <path className="number-piece-depth" d="M13 12h65l10 11v68H13L6 83V20Z" />
          <path className="number-piece-paper" d="M17 17h65v65H17Z" />
          <path className="number-piece-fold" d="M17 82h65v5H17Zm0 7h65v3H17Z" />
          <path className="number-piece-face" d="M13 6h65l10 11v61H13L6 70V14Z" />
          <path className="number-piece-edge" d="M6 14 13 6v72l-7-8Z" />
          <path className="number-piece-paper" d="M25 18h50v56H25Z" />
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
          <path className="number-piece-paper" d="m50 22 22 13v22L50 70 28 57V35Z" />
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
          <path className="number-piece-paper" d="m48 20 19 13 6 20-17 19-24-6-9-23 12-17Z" />
          <path
            className="number-piece-fold"
            d="m53 80 9 6-18 14-7-6Zm21-55 9 7-10 7-4-7ZM18 59l12 9-6 5-11-9Z"
          />
        </>
      ) : id === "mathematics" ? (
        <>
          <path className="number-piece-depth" d="M13 26 50 8l43 18v54L78 94H13Z" />
          <path className="number-piece-face" d="M13 20h65v66H13Z" />
          <path className="number-piece-fold" d="M13 20 50 2l43 18-15 9H22Z" />
          <path className="number-piece-edge" d="m78 29 15-9v54L78 86Z" />
          <path className="number-piece-paper" d="M23 28h54v36H23Z" />
          <path className="number-piece-fold" d="m19 71 11 9H19ZM67 9l11 5-10 5-10-5Z" />
        </>
      ) : (
        <>
          <path className="number-piece-depth" d="M12 12h76l10 15v63l-10 7H12L2 90V27Z" />
          <path className="number-piece-face" d="M12 5h76l10 15v63l-10 7H12L2 83V20Z" />
          <path className="number-piece-fold" d="M12 5h76l10 15-12 8-8-12H22l-8 12-12-8Z" />
          <path className="number-piece-edge" d="m86 28 12-8v63l-10 7H12L2 83l12-10h72Z" />
          <path className="number-piece-paper" d="M24 23h52v46H24Z" />
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
}: {
  island: PracticeIsland & { id: SubjectIslandId };
  profile: StoredProfile;
  entering: boolean;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const trail = SUBJECT_TRAILS[island.id];
  const stop = trail.stops[selected]!;
  const position = trail.points[selected]!;
  return createPortal(
    <section
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
      <header className="practice-trail-heading">
        <button className="secondary-button" type="button" onClick={onBack}>
          <HelenaRoomIcon name="back" size={18} /> Voltar aos mundos
        </button>
        <div>
          <span className="section-label">{island.subject}</span>
          <h2>{island.title}</h2>
        </div>
      </header>
      <div
        className="solo-level-path practice-trail-map"
        aria-label={`Caminho de ${island.subject}`}
      >
        <picture className="solo-level-scenery" aria-hidden="true">
          <source media="(min-width: 900px)" srcSet={`/practice-trails/${island.id}.webp`} />
          <img
            className="solo-level-scenery__art"
            src={`/practice-trails/${island.id}-small.webp`}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <div className="solo-level-track">
          <svg
            className="solo-level-path__route"
            viewBox="0 0 360 720"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className="solo-level-path__road-shadow" d={trail.route} />
            <path className="solo-level-path__road" d={trail.route} />
            <path className="solo-level-path__trail" d={trail.route} />
          </svg>
          {trail.stops.map((item, index) => (
            <button
              key={item.topic}
              type="button"
              className={`solo-path-level solo-path-level--${index + 1} practice-trail-stop${selected === index ? " is-selected" : ""}`}
              style={{ left: `${trail.points[index]!.x}%`, top: `${trail.points[index]!.y}%` }}
              aria-pressed={selected === index}
              aria-controls="practice-trail-detail"
              aria-label={`Etapa ${index + 1}: ${item.title}, ${item.topic}`}
              onClick={() => setSelected(index)}
            >
              <span className="solo-path-level__badge">
                <TrailNumberPiece id={island.id} />
                <b>{index + 1}</b>
              </span>
              <span>
                <small>{item.topic}</small>
                <strong>{item.title}</strong>
              </span>
            </button>
          ))}
          <div
            className="practice-trail-traveler"
            style={{ left: `calc(${position.x}% - 76px)`, top: `calc(${position.y}% + 25px)` }}
          >
            <PracticeUserPortrait
              profile={profile}
              className={`solo-path-avatar${entering ? " is-entering" : ""}`}
              level={selected + 1}
            />
          </div>
        </div>
      </div>
      <aside id="practice-trail-detail" className="practice-trail-detail" aria-live="polite">
        <TrailEmblem id={island.id} />
        <div>
          <span className="section-label">
            Etapa {selected + 1} · {stop.topic}
          </span>
          <h3>{stop.title}</h3>
          <p>{stop.description}</p>
          <small>Exercícios em preparação</small>
        </div>
      </aside>
    </section>,
    document.body,
  );
}
