import { useEffect, useRef, useState } from "react";
import { loadRiveRuntime, type RiveInput, type RivePlayer } from "../data/rive-runtime";
import { playPomodoroSound } from "../data/pomodoro-sfx";
import { reducedMotion, watchReducedMotion } from "../data/reduced-motion";
import { TOMATO_ART, tomatoStage } from "../domain/pomodoro-tomato";
import { uiText } from "../i18n/runtime";

const RIVE_FILE = "/pomodoro-tomato/tomato.riv?v=1";
/** Tempo que a entrada "instante" fica ligada para a máquina pular direto para a etapa. */
const INSTANT_MS = 150;

/** Quadro estático do tomate na etapa dada: o único elemento do Espaço do aluno e o primeiro quadro da aba Foco. */
function frame(stage: number, alt: string) {
  return (
    <img
      className="pomodoro-tomato"
      src={`/pomodoro-tomato/estagio-${stage}.webp`}
      width={TOMATO_ART.staticWidth}
      height={TOMATO_ART.staticHeight}
      alt={alt}
      data-stage={stage}
      draggable={false}
    />
  );
}

/** Quadro estático do tomate para uma fração de tempo restante (cartão do Espaço do aluno). */
export function PomodoroTomato({ progress }: { progress: number }) {
  return frame(tomatoStage(progress), uiText(1158));
}

/**
 * O tomate do Pomodoro em Rive, comido de verdade: uma mordida real arranca um pedaço a cada oitavo
 * do tempo escolhido, com a peça arrancada, sementes e migalhas, e o tomate brota de novo quando o
 * ciclo recomeça. A imagem estática da etapa é o quadro inicial e o que fica com movimento
 * reduzido; abrir a tela no meio do tempo pula direto para a etapa certa, sem repetir mordidas.
 */
export function AnimatedPomodoroTomato({
  stage,
  sound = true,
}: {
  stage: number;
  sound?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const inputs = useRef<Record<string, RiveInput>>({});
  const latest = useRef(stage);
  const applied = useRef(stage);
  const instantTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previous = useRef(stage);
  const [quiet, setQuiet] = useState(reducedMotion);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    latest.current = stage;
  }, [stage]);

  const jump = (value: number) => {
    const input = inputs.current;
    if (!input["instante"] || !input["etapa"]) return;
    input["instante"].value = true;
    input["etapa"].value = value;
    clearTimeout(instantTimer.current);
    instantTimer.current = setTimeout(() => {
      if (input["instante"]) input["instante"].value = false;
    }, INSTANT_MS);
  };

  // som de cada mordida (só a mordida seguinte da sequência, nunca um salto de etapa)
  useEffect(() => {
    const before = previous.current;
    previous.current = stage;
    // o estalo do som cai junto da troca de estágio da animação (0,22 s)
    if (sound && stage === before + 1) playPomodoroSound("mordida");
  }, [stage, sound]);

  useEffect(() => watchReducedMotion(() => setQuiet(reducedMotion())), []);

  useEffect(() => {
    const target = canvas.current;
    if (quiet || !target) return;
    let cancelled = false;
    let instance: RivePlayer | undefined;
    const owner = target.ownerDocument.defaultView ?? window;
    const resizePlayer = (player: RivePlayer) => {
      if (owner === window) player.resizeDrawingSurfaceToCanvas();
      else {
        // O helper do Rive ignora canvas de outra janela por usar instanceof do documento original.
        const box = target.getBoundingClientRect();
        target.width = box.width * owner.devicePixelRatio;
        target.height = box.height * owner.devicePixelRatio;
        player.resizeToCanvas();
      }
    };
    loadRiveRuntime()
      .then((rive) => {
        if (cancelled) return;
        const created: RivePlayer = new rive.Rive({
          src: RIVE_FILE,
          canvas: target,
          stateMachines: "Tomate",
          autoplay: false,
          onLoadError: () => undefined,
          layout: new rive.Layout({ fit: rive.Fit.Contain }),
          onLoad: () => {
            if (cancelled) return;
            resizePlayer(created);
            const found: Record<string, RiveInput> = {};
            for (const input of created.stateMachineInputs("Tomate") ?? [])
              found[input.name] = input;
            inputs.current = found;
            applied.current = latest.current;
            jump(latest.current);
            created.play();
            setReady(true);
          },
        });
        instance = created;
      })
      .catch(() => 0);
    const resize = () => {
      if (instance) resizePlayer(instance);
    };
    owner.addEventListener("resize", resize);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(target);
    return () => {
      cancelled = true;
      owner.removeEventListener("resize", resize);
      observer?.disconnect();
      clearTimeout(instantTimer.current);
      inputs.current = {};
      instance?.cleanup();
      setReady(false);
    };
  }, [quiet]);

  useEffect(() => {
    if (!ready) return;
    const before = applied.current;
    if (stage === before) return;
    applied.current = stage;
    const etapa = inputs.current["etapa"];
    if (stage === 0 || stage === before + 1) {
      if (etapa) etapa.value = stage;
    } else jump(stage);
  }, [stage, ready]);

  return (
    <span
      className="pomodoro-tomato-live"
      role="img"
      aria-label={uiText(1158)}
      data-stage={stage}
      data-ready={ready ? "true" : "false"}
    >
      {frame(stage, "")}
      {!quiet && <canvas ref={canvas} aria-hidden="true" />}
    </span>
  );
}
