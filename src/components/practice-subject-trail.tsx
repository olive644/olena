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
                <svg
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                  className="practice-trail-number-piece"
                >
                  <path className="number-piece-depth" d="M22 12h56l16 16v52L78 96H22L6 80V28Z" />
                  <path className="number-piece-face" d="M22 4h56l16 16v52L78 88H22L6 72V20Z" />
                  <path className="number-piece-fold" d="M22 4h56l16 16-9 5-12-12H27L15 25l-9-5Z" />
                  <path
                    className="number-piece-edge"
                    d="m85 25 9-5v52L78 88H22L6 72l9-5 12 12h46l12-12Z"
                  />
                  <path className="number-piece-paper" d="M28 16h44l10 10v40L72 76H28L18 66V26Z" />
                </svg>
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
