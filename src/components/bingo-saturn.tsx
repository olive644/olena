import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createApprovedSaturn, type ApprovedSaturn } from "./bingo-saturn-engine";
import { createSaturnSound, type SaturnSound } from "./bingo-saturn-sound";

const letters = ["B", "I", "N", "G", "O"];
const colors = ["#facc15", "#50bdc4", "#a779ef", "#ff8e77", "#fff0c7"];
const shades = ["#d4a600", "#147b83", "#51259b", "#c95649", "#d7b84b"];
const lights = ["#ffe88d", "#a4e8eb", "#d7baff", "#ffd3c5", "#fff9ef"];
function ballStyle(number: string): CSSProperties {
  const group = Math.floor((Number(number) - 1) / 15);
  return {
    "--ball-color": colors[group],
    "--ball-shade": shades[group],
    "--ball-light": lights[group],
  } as CSSProperties;
}
function Ball({ number }: { number: string }) {
  return (
    <>
      <i className="bingo-ball-facet" aria-hidden="true" />
      <small>{letters[Math.floor((Number(number) - 1) / 15)]}</small>
      <strong>{number}</strong>
    </>
  );
}

export function BingoSaturn({
  drawn,
  isHost,
  pending,
  onDraw,
}: {
  drawn: readonly string[];
  isHost: boolean;
  pending: boolean;
  onDraw: () => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ApprovedSaturn | null>(null);
  const soundRef = useRef<SaturnSound | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef(drawn.join(","));
  const [visible, setVisible] = useState([...drawn]);
  const [animating, setAnimating] = useState(false);
  const [focus, setFocus] = useState(false);
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState("");
  const key = drawn.join(",");
  const number = drawn.at(-1) ?? "";
  const latestVisible = visible.at(-1) ?? "";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createApprovedSaturn(canvas);
    engineRef.current = engine;
    soundRef.current = createSaturnSound();
    const stop = () => {
      if (document.hidden) soundRef.current?.stop();
    };
    document.addEventListener("visibilitychange", stop);
    return () => {
      engine?.dispose();
      soundRef.current?.dispose();
      engineRef.current = null;
      soundRef.current = null;
      document.removeEventListener("visibilitychange", stop);
    };
  }, []);

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    const previous = previousRef.current ? previousRef.current.split(",") : [];
    previousRef.current = key;
    const engine = engineRef.current;
    if (
      !engine ||
      ids.length !== previous.length + 1 ||
      !previous.every((id, i) => ids[i] === id)
    ) {
      engine?.setDrawn(ids);
      setVisible(ids);
      setAnimating(false);
      setFocus(false);
      setCaption("");
      return;
    }
    const n = ids.at(-1)!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controller = new AbortController();
    const motions = new Set<Animation>();
    const sound = soundRef.current;
    const flyingNode = flyRef.current;
    const historyNode = historyRef.current;
    const wait = (ms: number) =>
      new Promise<boolean>((resolve) => {
        if (controller.signal.aborted) {
          resolve(false);
          return;
        }
        const aborted = () => {
          clearTimeout(timer);
          resolve(false);
        };
        const timer = window.setTimeout(
          () => {
            controller.signal.removeEventListener("abort", aborted);
            resolve(!controller.signal.aborted);
          },
          reduced ? 0 : ms,
        );
        controller.signal.addEventListener("abort", aborted, { once: true });
      });
    const animate = async (element: HTMLElement, frames: Keyframe[], duration: number) => {
      if (controller.signal.aborted) return false;
      const motion = element.animate(frames, { duration, easing: "linear", fill: "forwards" });
      motions.add(motion);
      try {
        await motion.finished;
        return !controller.signal.aborted;
      } catch {
        return false;
      }
    };
    async function run() {
      engine!.setDrawn(previous);
      setVisible(previous);
      setAnimating(true);
      setFocus(false);
      setCaption("Misturando as bolinhas…");
      engine!.spin(true);
      sound?.mix();
      if (!(await wait(2100))) return;
      engine!.spin(false);
      sound?.stop();
      if (!(await wait(420))) return;
      engine!.beginExit(Number(n));
      setCaption("A bolinha está saindo");
      if (!(await wait(620))) return;
      engine!.releaseBall();
      const canvas = canvasRef.current,
        fly = flyRef.current,
        target = targetRef.current;
      if (!canvas || !fly || !target) return;
      const outlet = engine!.outlet();
      const rect = canvas.getBoundingClientRect(),
        end = target.getBoundingClientRect();
      const sourceX = rect.left + outlet.x,
        sourceY = rect.top + outlet.y;
      const x = end.left + end.width / 2 - sourceX,
        y = end.top + end.height / 2 - sourceY;
      fly.style.left = outlet.x - 34 + "px";
      fly.style.top = outlet.y - 34 + "px";
      fly.style.visibility = reduced ? "hidden" : "visible";
      const startScale = (2 * outlet.radius * 0.092) / 68,
        endScale = end.width / 68;
      const frames: Keyframe[] = [];
      for (let i = 0; i <= 90; i++) {
        const t = i / 90;
        let px = 0,
          py: number,
          scale = startScale,
          rotation: number;
        if (t < 0.14) {
          const q = t / 0.14;
          py = 5 * q * q;
          rotation = 15 * q;
        } else if (t < 0.52) {
          const q = (t - 0.14) / 0.38,
            travel = q * q * 0.65 + q * 0.35;
          px = outlet.rampX * travel;
          py = 5 + (outlet.rampY - 5) * travel;
          rotation = 15 + travel * 175;
        } else {
          const q = (t - 0.52) / 0.48,
            ease = q * q * (3 - 2 * q);
          px = outlet.rampX + (x - outlet.rampX) * ease;
          py = outlet.rampY + (y - outlet.rampY) * ease - Math.sin(q * Math.PI) * 25;
          scale = startScale + (endScale - startScale) * ease;
          rotation = 190 + 170 * ease;
        }
        frames.push({
          transform:
            "translate(" + px + "px," + py + "px) scale(" + scale + ") rotate(" + rotation + "deg)",
          offset: t,
        });
      }
      sound?.exit();
      if (!reduced && !(await animate(fly, frames, 1500))) return;
      engine!.finishExit();
      setCaption("Saiu " + letters[Math.floor((Number(n) - 1) / 15)] + " " + n + "!");
      setFocus(true);
      sound?.reveal();
      if (!(await wait(1400))) return;
      setFocus(false);
      setVisible(ids);
      if (!(await wait(40))) return;
      const destination = historyRef.current?.querySelector<HTMLElement>(
        '[data-bingo-number="' + n + '"]',
      );
      if (destination && !reduced) {
        destination.style.visibility = "hidden";
        const history = historyRef.current;
        if (history)
          history.scrollTop = Math.max(
            0,
            destination.offsetTop + destination.offsetHeight - history.clientHeight,
          );
        const from = fly.getBoundingClientRect(),
          to = destination.getBoundingClientRect();
        for (const motion of motions) motion.cancel();
        motions.clear();
        const currentRect = canvas.getBoundingClientRect();
        fly.style.left = from.left + from.width / 2 - currentRect.left - 34 + "px";
        fly.style.top = from.top + from.height / 2 - currentRect.top - 34 + "px";
        const dx = to.left + to.width / 2 - from.left - from.width / 2,
          dy = to.top + to.height / 2 - from.top - from.height / 2;
        const frames = Array.from({ length: 49 }, (_, i) => {
          const t = i / 48,
            ease = 1 - Math.pow(1 - t, 3);
          return {
            transform:
              "translate(" +
              dx * ease +
              "px," +
              (dy * ease - Math.sin(t * Math.PI) * 12) +
              "px) scale(" +
              (from.width / 68 + (to.width / 68 - from.width / 68) * ease) +
              ")",
            offset: t,
          };
        });
        if (!(await animate(fly, frames, 650))) return;
        destination.style.visibility = "";
      }
      fly.style.visibility = "hidden";
      engine!.setDrawn(ids);
      sound?.land();
      setAnimating(false);
      setCaption("");
    }
    void run().catch(() => {
      if (!controller.signal.aborted) {
        engine.setDrawn(ids);
        engine.finishExit();
        engine.spin(false);
        setVisible(ids);
        setAnimating(false);
        setFocus(false);
        setCaption("");
        if (flyRef.current) flyRef.current.style.visibility = "hidden";
      }
    });
    return () => {
      controller.abort();
      for (const motion of motions) motion.cancel();
      sound?.stop();
      engine.spin(false);
      engine.finishExit();
      if (flyingNode) flyingNode.style.visibility = "hidden";
      historyNode?.querySelectorAll<HTMLElement>("[data-bingo-number]").forEach((el) => {
        el.style.visibility = "";
      });
    };
  }, [key]);

  return (
    <div className="bingo-saturn-panel" aria-busy={animating}>
      <div className="bingo-saturn">
        <canvas ref={canvasRef} aria-label="Globo Saturno com as bolinhas restantes" />
        <div
          ref={targetRef}
          className={"bingo-result bingo-ball" + (focus ? " bingo-result-focus" : "")}
          style={ballStyle(number)}
          aria-hidden="true"
        >
          {focus && matchMedia("(prefers-reduced-motion: reduce)").matches && (
            <Ball number={number} />
          )}
        </div>
        <div
          ref={flyRef}
          className={"bingo-flying bingo-ball" + (focus ? " bingo-flying-focus" : "")}
          style={ballStyle(number)}
          aria-hidden="true"
        >
          <Ball number={number} />
        </div>
        <div className="bingo-current" role="status" aria-live="polite">
          {caption ||
            (latestVisible
              ? "Última bolinha: " +
                letters[Math.floor((Number(latestVisible) - 1) / 15)] +
                " " +
                latestVisible
              : "")}
        </div>
      </div>
      <div className="bingo-history">
        <h3>
          Números sorteados <small>{visible.length}/75</small>
        </h3>
        <div ref={historyRef} role="list" aria-label="Números sorteados">
          {visible.map((id) => (
            <span
              role="listitem"
              key={id}
              data-bingo-number={id}
              className={"bingo-ball" + (id === latestVisible ? " latest" : "")}
              style={ballStyle(id)}
              aria-label={letters[Math.floor((Number(id) - 1) / 15)] + " " + id}
            >
              <Ball number={id} />
            </span>
          ))}
        </div>
        <div className="bingo-machine-actions">
          {isHost && (
            <button
              className="primary-button"
              type="button"
              disabled={pending || animating || drawn.length >= 75}
              onClick={async () => {
                await soundRef.current?.unlock();
                await onDraw();
              }}
            >
              {animating ? "Girando…" : "Sortear próxima bolinha"}
            </button>
          )}
          <button
            className="secondary-button"
            type="button"
            aria-label={muted ? "Ativar sons" : "Desativar sons"}
            aria-pressed={!muted}
            onClick={async () => {
              const next = !muted;
              setMuted(next);
              soundRef.current?.setMuted(next);
              if (!next) await soundRef.current?.unlock();
            }}
          >
            {muted ? "Som desligado" : "Som ligado"}
          </button>
        </div>
      </div>
    </div>
  );
}
