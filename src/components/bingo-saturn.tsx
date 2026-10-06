import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  createApprovedSaturn,
  EXIT_TIMING,
  type ApprovedSaturn,
  type ChuteEnd,
} from "./bingo-saturn-engine";
import { createSaturnSound, type SaturnSound } from "./bingo-saturn-sound";
import { PaperBallSkin } from "./bingo-paper-ball";

// Tempos da sequência de um sorteio, em milissegundos. A viagem da bolinha dentro do globo
// (EXIT_TIMING) é medida pelo próprio motor.
const MIX_MS = 1400;
const SETTLE_MS = 320;
const FLIGHT_MS = 900;
const HOLD_MS = 1100;
const HISTORY_MS = 700;
const letters = ["B", "I", "N", "G", "O"];
const easeOutBack = (t: number) => {
  const c1 = 1.4,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
// Quadros de um arremesso: desacelera ao pousar, faz um arco curto e cresce com um leve pulo.
function tossFrames(
  dx: number,
  dy: number,
  fromScale: number,
  toScale: number,
  fromRotation: number,
): Keyframe[] {
  const arc = Math.min(70, Math.abs(dx) * 0.2 + 30);
  // Termina sempre na vertical (múltiplo de 360°), senão a caixa da bolinha inclinada passaria
  // das bordas do palco ao pousar.
  const toRotation = Math.ceil((fromRotation + 300) / 360) * 360;
  return Array.from({ length: 61 }, (_, i) => {
    const t = i / 60,
      travel = Math.min(1, t / 0.72),
      bounceTime = Math.max(0, (t - 0.72) / 0.28),
      bounce = Math.abs(Math.sin(bounceTime * Math.PI * 2)) * 14 * (1 - bounceTime),
      e = 1 - Math.pow(1 - travel, 2.2);
    return {
      transform:
        "translate(" +
        dx * e +
        "px," +
        (dy * e - Math.sin(Math.PI * travel) * arc * (1 - 0.3 * travel) - bounce) +
        "px) scale(" +
        (fromScale + (toScale - fromScale) * easeOutBack(travel)) +
        ") rotate(" +
        (fromRotation + (toRotation - fromRotation) * e) +
        "deg)",
      offset: t,
    };
  });
}
const colors = ["#facc15", "#50bdc4", "#a779ef", "#ff8e77", "#fff0c7"];
const shades = ["#d4a600", "#147b83", "#51259b", "#c95649", "#d7b84b"];
const lights = ["#ffe88d", "#a4e8eb", "#d7baff", "#ffd3c5", "#fff9ef"];
function ballStyle(number: string): CSSProperties {
  const group = Math.floor((Number(number) - 1) / 15);
  return {
    "--ball-base": colors[group],
    "--ball-color": colors[group],
    "--ball-shade": shades[group],
    "--ball-dark": ["#997207", "#0c5965", "#382066", "#8e383e", "#9b7d35"][group],
    "--ball-light": lights[group],
  } as CSSProperties;
}
function Ball({ number }: { number: string }) {
  return (
    <>
      <PaperBallSkin />
      <small>{letters[Math.floor((Number(number) - 1) / 15)]}</small>
      <strong>{number}</strong>
    </>
  );
}

function BingoSaturnView({
  drawn,
  isHost,
  pending,
  onDraw,
  onReveal,
}: {
  drawn: readonly string[];
  isHost: boolean;
  pending: boolean;
  onDraw: () => Promise<void>;
  onReveal?: (ids: readonly string[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ApprovedSaturn | null>(null);
  const soundRef = useRef<SaturnSound | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef(drawn.join(","));
  const onRevealRef = useRef(onReveal);
  const [visible, setVisible] = useState([...drawn]);
  const [animating, setAnimating] = useState(false);
  const [focus, setFocus] = useState(false);
  const [caption, setCaption] = useState("");
  const key = drawn.join(",");
  const number = drawn.at(-1) ?? "";
  const latestVisible = visible.at(-1) ?? "";

  useEffect(() => {
    onRevealRef.current = onReveal;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createApprovedSaturn(canvas);
    engineRef.current = engine;
    soundRef.current = createSaturnSound();
    // O navegador exige uma interação antes do áudio. Os efeitos permanecem ativados.
    const unlock = () => {
      void soundRef.current?.unlock();
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
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
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
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
      onRevealRef.current?.(ids);
      return;
    }
    const n = ids.at(-1)!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controller = new AbortController();
    const motions = new Set<Animation>();
    const timers = new Set<number>();
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
      onRevealRef.current?.(previous);
      setAnimating(true);
      setFocus(false);
      setCaption("Misturando as bolinhas…");
      engine!.spin(true);
      sound?.mix();
      if (!(await wait(MIX_MS))) return;
      engine!.spin(false);
      sound?.stop();
      if (!(await wait(SETTLE_MS))) return;
      setCaption("A bolinha está saindo");
      sound?.pick();
      timers.add(window.setTimeout(() => sound?.exit(), EXIT_TIMING.lift + EXIT_TIMING.hover));
      // A bolinha sobe, espera, cai pelo portão e rola pelo funil dentro do próprio globo. O motor
      // avisa quando ela chega à ponta, sem depender de temporizadores da página.
      const end = await new Promise<ChuteEnd | null>((resolve) => {
        const cancelled = () => resolve(null);
        controller.signal.addEventListener("abort", cancelled, { once: true });
        engine!.beginExit(Number(n), (arrival) => {
          controller.signal.removeEventListener("abort", cancelled);
          resolve(arrival);
        });
      });
      if (!end || controller.signal.aborted) return;
      const canvas = canvasRef.current,
        fly = flyRef.current,
        target = targetRef.current;
      if (!canvas || !fly || !target) return;
      const rect = canvas.getBoundingClientRect(),
        goal = target.getBoundingClientRect();
      const goalX = goal.left + goal.width / 2,
        goalY = goal.top + goal.height / 2;
      fly.style.left = end.x - 34 + "px";
      fly.style.top = end.y - 34 + "px";
      fly.style.transform = "scale(" + (2 * end.radius) / 68 + ") rotate(" + end.rotation + "deg)";
      fly.style.visibility = reduced ? "hidden" : "visible";
      // No mesmo quadro: a bolinha de papel da página assume e a do globo deixa de ser desenhada.
      engine!.releaseBall();
      if (!reduced) {
        const frames = tossFrames(
          goalX - (rect.left + end.x),
          goalY - (rect.top + end.y),
          (2 * end.radius) / 68,
          goal.width / 68,
          end.rotation,
        );
        if (!(await animate(fly, frames, FLIGHT_MS))) return;
      }
      engine!.finishExit();
      engine!.burst(goalX - rect.left, goalY - rect.top);
      setCaption("Saiu " + letters[Math.floor((Number(n) - 1) / 15)] + " " + n + "!");
      setFocus(true);
      sound?.reveal();
      onRevealRef.current?.(ids);
      if (!(await wait(HOLD_MS))) return;
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
        // Fixa a posição de pouso no próprio elemento antes de cancelar o arremesso: cancelar
        // sozinho devolveria a bolinha ao ponto de partida por um quadro.
        for (const motion of motions) {
          try {
            motion.commitStyles();
          } catch {
            // Sem commitStyles a posição é refeita logo abaixo.
          }
          motion.cancel();
        }
        motions.clear();
        const currentRect = canvas.getBoundingClientRect();
        fly.style.left = from.left + from.width / 2 - currentRect.left - 34 + "px";
        fly.style.top = from.top + from.height / 2 - currentRect.top - 34 + "px";
        fly.style.transform = "";
        const dx = to.left + to.width / 2 - from.left - from.width / 2,
          dy = to.top + to.height / 2 - from.top - from.height / 2;
        const frames = Array.from({ length: 61 }, (_, i) => {
          const t = i / 60,
            ease = t * t * (3 - 2 * t);
          return {
            transform:
              "translate(" +
              dx * ease +
              "px," +
              (dy * ease - Math.sin(t * Math.PI) * 14) +
              "px) scale(" +
              (from.width / 68 + (to.width / 68 - from.width / 68) * ease) +
              ")",
            offset: t,
          };
        });
        if (!(await animate(fly, frames, HISTORY_MS))) return;
        destination.style.visibility = "";
      }
      fly.style.visibility = "hidden";
      fly.style.transform = "";
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
        onRevealRef.current?.(ids);
        if (flyRef.current) flyRef.current.style.visibility = "hidden";
      }
    });
    return () => {
      controller.abort();
      for (const motion of motions) motion.cancel();
      for (const timer of timers) clearTimeout(timer);
      sound?.stop();
      engine.spin(false);
      engine.finishExit();
      if (flyingNode) {
        flyingNode.style.visibility = "hidden";
        flyingNode.style.transform = "";
      }
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
        </div>
      </div>
    </div>
  );
}

// O estado da sala chega várias vezes por minuto (presença, respostas). O globo só precisa
// redesenhar quando o sorteio muda, senão a animação disputa o quadro com renderizações inúteis.
export const BingoSaturn = memo(
  BingoSaturnView,
  (before, after) =>
    before.isHost === after.isHost &&
    before.pending === after.pending &&
    before.onDraw === after.onDraw &&
    before.onReveal === after.onReveal &&
    before.drawn.join(",") === after.drawn.join(","),
);
