import { useEffect, useState } from "react";
import type { MathCourseId } from "../data/math-courses";
import { mathPlaceRewards, openMathChest, unlockMathChest } from "../data/math-place-rewards";
import { isMotionReduced } from "../data/accessibility-preferences";
import { RoomPointsIcon } from "./room-paper-icons";
import { MathNumber } from "./math-paper-art";
import "./math-place-treasure.css";

export function CommonMathChest({ open = false }: { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 100"
      className={`math-common-chest${open ? " is-open" : ""}`}
      aria-hidden="true"
    >
      <path fill="#554037" d="M12 43 26 35 108 43 108 83 92 96 12 84Z" />
      <path fill="#bd783f" d="M12 48 94 48 94 89 12 80Z" />
      <path fill="#87512e" d="M94 48 108 43 108 83 94 89Z" />
      <path fill="#f5cf6b" d="m22 48 12 0 0 35-12-1Zm53 0 12 0 0 40-12-1Z" />
      <g className="math-chest-lid">
        <path fill="#f0b76b" d="M12 43 24 18 92 18 108 43 94 54 12 48Z" />
        <path fill="#cc8b49" d="M24 18 92 18 94 43 12 43Z" />
        <path fill="#fbe19a" d="m25 18 11 0-6 25H18Zm49 0h11l8 25H81Z" />
        <path fill="#87512e" d="m94 43 14 0-14 11Z" />
      </g>
      <path fill="#fff1b7" d="M49 43h20v23H49Z" />
      <path fill="#554037" d="m59 49 5 5-3 3v5h-5v-5l-3-3Z" />
      {open && (
        <path
          className="math-chest-glow"
          fill="#ffde42"
          d="m60 22 5 12 14-1-10 9 5 13-14-7-13 7 4-13-10-9 14 1Z"
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
  const chest = value.chests.find((item) => !item.opened) ?? value.chests.at(-1);
  const remaining =
    chest?.unlockAt === null || !chest ? 0 : Math.max(0, Math.ceil((chest.unlockAt - now) / 1000));
  useEffect(() => {
    if (!chest || chest.opened || chest.unlockAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [chest]);
  function action() {
    if (!chest) return;
    try {
      setValue(
        chest.unlockAt === null
          ? unlockMathChest(course, chest.id)
          : openMathChest(course, chest.id),
      );
      setNow(Date.now());
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
      {chest && (
        <div className={`math-chest-dock${remaining > 0 ? " is-unlocking" : ""}`}>
          <CommonMathChest open={chest.opened} />
          <div>
            {chest.opened ? (
              <span role="status">Baú comum aberto!</span>
            ) : (
              <>
                <span>
                  {chest.unlockAt === null
                    ? "Baú comum"
                    : remaining > 0
                      ? `Destrancando · ${remaining}s`
                      : "Pronto para abrir!"}
                </span>
                {chest.unlockAt !== null && (
                  <progress aria-label="Destrancando baú" max={60} value={60 - remaining} />
                )}
                <button className="secondary-button" disabled={remaining > 0} onClick={action}>
                  {chest.unlockAt === null ? "Destrancar baú" : "Abrir baú"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {warning && <p role="alert">{warning}</p>}
    </div>
  );
}
