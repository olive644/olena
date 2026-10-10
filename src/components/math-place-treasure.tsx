import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MathCourseId } from "../data/math-courses";
import {
  isChestCollected,
  MATH_PLACE_REWARDS_KEY,
  mathPlaceRewards,
  openMathChest,
  revealMathCard,
  unlockMathChest,
  type MathChest,
} from "../data/math-place-rewards";
import { isMotionReduced } from "../data/accessibility-preferences";
import { createMathSound } from "../data/math-sound";
import { SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";
import { RoomClockIcon, RoomPointsIcon } from "./room-paper-icons";
import { MathNumber } from "./math-paper-art";
import { OliverCardBooster } from "./oliver-card-booster";
import { OliverCardCollection } from "./oliver-card-collection";
import "./math-place-treasure.css";
import "./oliver-card.css";

export function CommonMathChest({ open = false }: { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 140 120"
      className={`math-common-chest${open ? " is-open" : ""}`}
      aria-hidden="true"
    >
      <ellipse cx="70" cy="107" rx="54" ry="8" fill="#292432" opacity=".15" />
      <path fill="#211d29" d="m13 55 101-5 15 13v37l-22 14-94-12Z" />
      <path fill="#494152" d="M17 60h90v47l-90-9Z" />
      <path fill="#302a3a" d="m107 60 18-9v48l-18 8Z" />
      <path fill="#645b70" d="m17 60 90 47-90-9Z" />
      <path fill="#efbd3d" d="m20 62 15 1v37l-15-2Zm66 1h15v43l-15-2Z" />
      <path fill="#ffe88d" d="m20 62 5 0v36l-5-1Zm66 1h5v40l-5-1Z" />
      <path fill="#292432" d="m38 75 44 2v6l-44-2Zm0 17 44 2v5l-44-2Z" />
      <g className="math-chest-lid">
        <path fill="#211d29" d="m13 57 7-24 13-11 69 0 20 11 8 24-22 10-95-4Z" />
        <path fill="#494152" d="m25 35 13-8h61l11 9 7 20H19Z" />
        <path fill="#70647e" d="m25 35 13-8h61l-24 29H19Z" />
        <path fill="#f2cf86" d="m38 27 12 0-2 29H34Zm49 0h12l6 29H89Z" />
        <path fill="#efbd3d" d="m13 57 95 0 22-10v10l-22 10-95-4Z" />
        <path fill="#fff1b7" d="m59 24 8-7 8 7-8 8Z" />
      </g>
      <path fill="#facc15" d="m55 57 17-3 14 9-3 24-14 7-17-9Z" />
      <path fill="#ffe88d" d="m55 57 17-3-3 40-17-9Z" />
      <path fill="#59413a" d="m67 64 8 3 2 7-6 5-1 8-6-1 1-9-4-6Z" />
      <path fill="#fff1b7" d="m23 72 5 2-1 5-5-2Zm72 2 5 2-1 5-5-2Z" />
      {open && (
        <path
          className="math-chest-glow"
          fill="#facc15"
          d="m70 10 7 17 18-1-14 12 5 18-16-10-16 10 5-18-14-12 18 1Z"
        />
      )}
    </svg>
  );
}
export function MathPlaceTreasure({ course }: { course: MathCourseId }) {
  const [value, setValue] = useState(() => mathPlaceRewards(course));
  const [now, setNow] = useState(Date.now);
  const [points, setPoints] = useState(0);
  const [warning, setWarning] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [booster, setBooster] = useState<MathChest | null>(null);
  const [collection, setCollection] = useState(false);
  const audio = useRef<ReturnType<typeof createMathSound> | null>(null);
  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storedRewards = useRef(localStorage.getItem(MATH_PLACE_REWARDS_KEY));
  function acceptValue(next: ReturnType<typeof mathPlaceRewards>) {
    storedRewards.current = localStorage.getItem(MATH_PLACE_REWARDS_KEY);
    setValue(next);
  }
  useEffect(() => {
    function refresh() {
      const incoming = localStorage.getItem(MATH_PLACE_REWARDS_KEY);
      if (incoming === storedRewards.current) return;
      storedRewards.current = incoming;
      if (openingTimer.current) clearTimeout(openingTimer.current);
      setValue(mathPlaceRewards(course));
      setNow(Date.now());
      setOpening(null);
      setBooster(null);
      setCollection(false);
    }
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [course]);
  useEffect(
    () => () => {
      audio.current?.dispose();
      if (openingTimer.current) clearTimeout(openingTimer.current);
    },
    [],
  );
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    function animate() {
      const ratio = isMotionReduced() ? 1 : Math.min(1, (performance.now() - start) / 900);
      setPoints(Math.round(value.points * (1 - (1 - ratio) ** 3)));
      if (ratio < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value.points]);
  const waiting = value.chests.some(
    (chest) => !isChestCollected(chest) && chest.unlockAt !== null && chest.unlockAt > now,
  );
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [waiting]);
  const chests = value.chests.filter((chest) => !isChestCollected(chest)).slice(0, 3);
  function play(cue: "chestUnlock" | "chestOpen" | "cardReveal") {
    audio.current ??= createMathSound();
    audio.current.unlock();
    audio.current.play(cue);
  }
  function action(chest: MathChest, actionTime: number) {
    if (opening) return;
    try {
      if (chest.opened && chest.cards) {
        setBooster(chest);
        return;
      }
      if (chest.unlockAt === null) {
        play("chestUnlock");
        acceptValue(unlockMathChest(course, chest.id, actionTime));
        setNow(actionTime);
      } else if (chest.unlockAt <= actionTime) {
        const saved = openMathChest(course, chest.id, actionTime);
        acceptValue(saved);
        setOpening(chest.id);
        play("chestOpen");
        const received = saved.chests.find((item) => item.id === chest.id)!;
        openingTimer.current = setTimeout(
          () => {
            setOpening(null);
            setBooster(received);
          },
          isMotionReduced() ? 0 : 900,
        );
      }
      setWarning("");
    } catch {
      setWarning("Não foi possível salvar o baú neste dispositivo.");
    }
  }
  return (
    <div className="math-place-treasure">
      <div className="math-place-total" aria-label={`${value.points} pontos neste lugar`}>
        <RoomPointsIcon />
        <MathNumber value={points} />
      </div>
      <div className="math-chest-dock" aria-label="Três espaços de baús">
        {Array.from({ length: 3 }, (_, index) => {
          const chest = chests[index];
          if (!chest)
            return (
              <div
                className="math-chest-empty"
                key={`empty-${index}`}
                aria-label="Espaço de baú vazio"
              >
                <img src="/room-icons/add.svg" width="28" height="28" alt="" aria-hidden="true" />
              </div>
            );
          const remaining =
            chest.unlockAt === null ? 0 : Math.max(0, Math.ceil((chest.unlockAt - now) / 1000));
          return (
            <button
              key={chest.id}
              className={`math-chest-slot${remaining > 0 ? " is-unlocking" : ""}${opening === chest.id ? " is-opening" : ""}`}
              disabled={remaining > 0 || opening !== null}
              aria-label={
                chest.opened
                  ? "Revelar cartas do baú"
                  : chest.unlockAt === null
                    ? "Destrancar baú comum"
                    : remaining > 0
                      ? `Baú comum, ${remaining} segundos restantes`
                      : "Abrir baú comum"
              }
              onClick={() => action(chest, Date.now())}
            >
              <CommonMathChest open={chest.opened || opening === chest.id} />
              <span className="math-chest-label">
                {chest.opened ? (
                  "Cartas"
                ) : chest.unlockAt === null ? (
                  "Destrancar"
                ) : remaining > 0 ? (
                  <>
                    <RoomClockIcon /> {remaining}s
                  </>
                ) : (
                  "Abrir"
                )}
              </span>
              {chest.unlockAt !== null && !chest.opened && (
                <progress
                  aria-label="Destrancando baú"
                  max={60}
                  value={Math.max(0, 60 - remaining)}
                />
              )}
            </button>
          );
        })}
      </div>
      <button
        className="math-card-library"
        onClick={() => setCollection(true)}
        aria-label="Cartas do Oliver"
      >
        <img src="/olena-favicon-32.png" alt="" width="24" height="24" />
        <span>Cartas</span>
      </button>
      {warning && (
        <p className="math-treasure-warning" role="alert">
          {warning}
        </p>
      )}
      {booster &&
        createPortal(
          <OliverCardBooster
            chest={booster}
            onClose={() => setBooster(null)}
            sound={() => play("cardReveal")}
            onReveal={() => {
              try {
                const saved = revealMathCard(course, booster.id);
                acceptValue(saved);
                return true;
              } catch {
                setWarning("Não foi possível guardar a carta. Tente novamente.");
                return false;
              }
            }}
          />,
          document.body,
        )}
      {collection &&
        createPortal(<OliverCardCollection onClose={() => setCollection(false)} />, document.body)}
    </div>
  );
}
