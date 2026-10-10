import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MathCourseId } from "../data/math-courses";
import {
  isChestCollected,
  chestCards,
  MATH_PLACE_REWARDS_KEY,
  parseMathRewards,
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
import { MathChestArt } from "./math-chest-art";

function rewardsIdentity(raw: string | null, course: MathCourseId) {
  const value = parseMathRewards(raw ?? "{}")[course];
  return JSON.stringify({
    points: value?.points ?? 0,
    receipts: [...(value?.receipts ?? [])].sort(),
    chests: [...(value?.chests ?? [])]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((chest) => ({
        id: chest.id,
        unlockAt: chest.unlockAt,
        opened: chest.opened,
        cards: chest.cards ?? [],
        revealed: chest.revealed ?? 0,
        kind: chest.kind ?? "common",
        arcana: chest.arcana,
      })),
  });
}

export function CommonMathChest({
  open = false,
  arcane = false,
}: {
  open?: boolean;
  arcane?: boolean;
}) {
  return <MathChestArt open={open} arcane={arcane} />;
}
export function MathPlaceTreasure({
  course,
  deliveryOrigin,
}: {
  course: MathCourseId;
  deliveryOrigin?: { x: number; y: number; size: number; id: string } | undefined;
}) {
  const [value, setValue] = useState(() => mathPlaceRewards(course));
  const [now, setNow] = useState(Date.now);
  const [points, setPoints] = useState(0);
  const [warning, setWarning] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [booster, setBooster] = useState<MathChest | null>(null);
  const [collection, setCollection] = useState(false);
  const [incomingCards, setIncomingCards] = useState<ReturnType<typeof chestCards>>([]);
  const audio = useRef<ReturnType<typeof createMathSound> | null>(null);
  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dock = useRef<HTMLDivElement>(null);
  const delivery = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ghost = delivery.current;
    const slot = Array.from(
      dock.current?.querySelectorAll<HTMLButtonElement>("[data-chest-id]") ?? [],
    ).find((item) => item.dataset["chestId"] === deliveryOrigin?.id);
    if (!ghost || !slot || !deliveryOrigin) return;
    if (isMotionReduced()) {
      ghost.hidden = true;
      return;
    }
    const target = slot.getBoundingClientRect();
    ghost.style.left = `${target.x}px`;
    ghost.style.top = `${target.y}px`;
    const animation = ghost.animate(
      [
        {
          transform: `translate(${deliveryOrigin.x - target.x - target.width / 2}px, ${deliveryOrigin.y - target.y - target.height / 2}px) scale(1.5) rotate(-12deg)`,
          opacity: 1,
        },
        { transform: "translate(0, -35px) scale(1.1) rotate(8deg)", opacity: 1, offset: 0.75 },
        { transform: "none", opacity: 0 },
      ],
      { duration: 950, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
    );
    return () => animation.cancel();
  }, [deliveryOrigin]);
  const storedRewards = useRef(localStorage.getItem(MATH_PLACE_REWARDS_KEY));
  function acceptValue(next: ReturnType<typeof mathPlaceRewards>) {
    storedRewards.current = localStorage.getItem(MATH_PLACE_REWARDS_KEY);
    setValue(next);
  }
  useEffect(() => {
    function refresh() {
      const incoming = localStorage.getItem(MATH_PLACE_REWARDS_KEY);
      if (incoming === storedRewards.current) return;
      const changed =
        rewardsIdentity(incoming, course) !== rewardsIdentity(storedRewards.current, course);
      storedRewards.current = incoming;
      if (!changed) {
        setValue(mathPlaceRewards(course));
        return;
      }
      if (openingTimer.current) clearTimeout(openingTimer.current);
      setValue(mathPlaceRewards(course));
      setNow(Date.now());
      setOpening(null);
      setBooster(null);
      setCollection(false);
      setIncomingCards([]);
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
  const previousWaiting = useRef(new Set<string>());
  const announceReady = useEffectEvent((arcane: boolean) =>
    play(arcane ? "arcaneUnlock" : "chestUnlock"),
  );
  useEffect(() => {
    if (
      value.chests.some(
        (chest) =>
          !chest.opened &&
          chest.unlockAt !== null &&
          chest.unlockAt <= now &&
          previousWaiting.current.has(chest.id),
      )
    )
      announceReady(
        value.chests.some(
          (chest) =>
            chest.kind === "arcane" &&
            chest.unlockAt !== null &&
            chest.unlockAt <= now &&
            previousWaiting.current.has(chest.id),
        ),
      );
    previousWaiting.current = new Set(
      value.chests
        .filter((chest) => !chest.opened && chest.unlockAt !== null && chest.unlockAt > now)
        .map((chest) => chest.id),
    );
  }, [value, now]);
  function play(
    cue: "chestUnlock" | "chestOpen" | "cardReveal" | "arcaneUnlock" | "arcaneOpen" | "tarotReveal",
  ) {
    audio.current ??= createMathSound();
    audio.current.unlock();
    audio.current.play(cue);
  }
  function action(chest: MathChest, actionTime: number) {
    if (opening) return;
    try {
      if (chest.opened && chestCards(chest).length) {
        setBooster(chest);
        return;
      }
      if (chest.unlockAt === null) {
        play(chest.kind === "arcane" ? "arcaneUnlock" : "chestUnlock");
        acceptValue(unlockMathChest(course, chest.id, actionTime));
        setNow(actionTime);
      } else if (chest.unlockAt <= actionTime) {
        const saved = openMathChest(course, chest.id, actionTime);
        acceptValue(saved);
        setOpening(chest.id);
        play(chest.kind === "arcane" ? "arcaneOpen" : "chestOpen");
        const received = saved.chests.find((item) => item.id === chest.id)!;
        openingTimer.current = setTimeout(
          () => {
            setOpening(null);
            setBooster(received);
          },
          isMotionReduced() ? 0 : 500,
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
      {deliveryOrigin && (
        <div className="math-chest-flight" ref={delivery} aria-hidden="true">
          <CommonMathChest
            arcane={value.chests.find((chest) => chest.id === deliveryOrigin.id)?.kind === "arcane"}
          />
        </div>
      )}
      <div className="math-chest-dock" ref={dock} aria-label="Três espaços de baús">
        {Array.from({ length: 3 }, (_, index) => {
          const chest = chests[index];
          if (!chest)
            return (
              <div
                className="math-chest-empty"
                key={`empty-${index}`}
                aria-label="Espaço de baú vazio"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#138A91" d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7Z" />
                  <path fill="#60CED3" d="M9 2h6l-2 3v6H2V9h7Z" />
                  <path fill="#0D626B" d="m13 13 9-4v6h-7v7H9l4-3Z" />
                </svg>
              </div>
            );
          const remaining =
            chest.unlockAt === null ? 0 : Math.max(0, Math.ceil((chest.unlockAt - now) / 1000));
          const name = chest.kind === "arcane" ? "arcano" : "comum";
          return (
            <button
              key={chest.id}
              data-chest-id={chest.id}
              className={`math-chest-slot${remaining > 0 ? " is-unlocking" : chest.unlockAt !== null && !chest.opened ? " is-ready" : ""}${opening === chest.id ? " is-opening" : ""}`}
              disabled={remaining > 0 || opening !== null}
              aria-label={
                chest.opened
                  ? "Revelar cartas do baú"
                  : chest.unlockAt === null
                    ? `Destrancar baú ${name}`
                    : remaining > 0
                      ? `Baú ${name}, ${remaining} segundos restantes`
                      : `Abrir baú ${name}`
              }
              onClick={() => action(chest, Date.now())}
            >
              <CommonMathChest
                open={chest.opened || opening === chest.id}
                arcane={chest.kind === "arcane"}
              />
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
              {remaining > 0 && !chest.opened && (
                <progress
                  className="math-chest-progress"
                  aria-label="Destrancando baú"
                  max={60}
                  value={Math.max(0, 60 - (chest.unlockAt! - now) / 1000)}
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
            onStore={(cards) => {
              setIncomingCards(cards);
              setBooster(null);
              setCollection(true);
            }}
            onClose={() => setBooster(null)}
            sound={() => play(booster.kind === "arcane" ? "tarotReveal" : "cardReveal")}
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
        createPortal(
          <OliverCardCollection
            incoming={incomingCards}
            onClose={() => {
              setIncomingCards([]);
              setCollection(false);
            }}
          />,
          document.body,
        )}
    </div>
  );
}
