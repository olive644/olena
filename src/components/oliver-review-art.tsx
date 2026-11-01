import { useEffect, useRef, useState } from "react";
import { loadRiveRuntime, type RivePlayer } from "../data/rive-runtime";
import { reducedMotion, watchReducedMotion } from "../data/reduced-motion";
import "./oliver-review-art.css";

export function OliverReviewArt({
  cue,
  reaction,
  label,
  speaking = true,
  word,
  variant = 0,
}: {
  cue: string;
  reaction: "explain" | "correct" | "retry" | "greet" | "think" | "listen";
  label: string;
  speaking?: boolean;
  word?: { index: number; word: string; durationMs: number } | undefined;
  variant?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<RivePlayer | null>(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const refresh = () => setActive(!reducedMotion());
    const stop = watchReducedMotion(refresh);
    refresh();
    return stop;
  }, []);
  useEffect(() => {
    if (!active || !canvas.current) return;
    const target = canvas.current;
    let cancelled = false;
    let instance: RivePlayer | undefined;
    const resize = () => instance?.resizeDrawingSurfaceToCanvas();
    const visibility = () => (document.hidden ? instance?.pause() : instance?.play());
    loadRiveRuntime()
      .then((runtime) => {
        if (cancelled) return;
        const created = new runtime.Rive({
          src: "/oliver-math-review/oliver.riv?v=5",
          canvas: target,
          stateMachines: "Oliver",
          autoplay: !document.hidden,
          layout: new runtime.Layout({ fit: runtime.Fit.Contain }),
          onLoad: () => {
            if (cancelled) return;
            created.resizeDrawingSurfaceToCanvas();
            player.current = created;
            setReady(true);
            visibility();
          },
          onLoadError: () => {
            if (!cancelled) setReady(false);
          },
        });
        instance = created;
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      player.current = null;
      instance?.cleanup();
      setReady(false);
    };
  }, [active]);
  useEffect(() => {
    if (!ready) return;
    const input = player.current
      ?.stateMachineInputs("Oliver")
      ?.find((item) => item.name === "clique");
    if (!input) return;
    input.value =
      reaction === "correct"
        ? variant % 2
          ? 6
          : 1
        : reaction === "retry"
          ? 3
          : reaction === "greet"
            ? 4
            : reaction === "think"
              ? 5
              : reaction === "listen"
                ? 7
                : speaking
                  ? 2
                  : 0;
    if (reaction === "explain" && speaking)
      return () => {
        if (player.current) input.value = 0;
      };
    const timer = setTimeout(() => {
      input.value = 0;
    }, 90);
    return () => clearTimeout(timer);
  }, [ready, cue, reaction, speaking, variant]);
  useEffect(() => {
    if (!ready) return;
    const mouth = player.current
      ?.stateMachineInputs("Oliver")
      ?.find((input) => input.name === "boca");
    if (!mouth) return;
    if (!speaking || !word || reaction === "retry" || reaction === "correct") {
      mouth.value = reaction === "retry" ? 4 : reaction === "correct" ? 5 : 0;
      const timer = setTimeout(() => {
        if (player.current) mouth.value = 0;
      }, 1800);
      return () => clearTimeout(timer);
    }
    mouth.value = document.hidden ? 0 : 1 + (word.index % 3);
    const timer = setTimeout(
      () => {
        if (player.current) mouth.value = 0;
      },
      Math.max(150, word.durationMs * 0.65),
    );
    return () => {
      clearTimeout(timer);
      if (player.current) mouth.value = 0;
    };
  }, [ready, speaking, word, reaction]);
  return (
    <span
      className="oliver-review-art"
      data-ready={ready ? "true" : "false"}
      data-reaction={reaction}
      data-speaking={speaking ? "true" : "false"}
      data-word={word?.index}
    >
      <img
        src="/oliver-math-review/oliver.png"
        width="1254"
        height="1254"
        alt={label}
        draggable={false}
      />
      {active && <canvas ref={canvas} aria-hidden="true" />}
    </span>
  );
}
