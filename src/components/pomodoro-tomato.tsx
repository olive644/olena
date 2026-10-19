import { useEffect, useRef, useState } from "react";
import { loadRiveRuntime, type RiveInput, type RivePlayer } from "../data/rive-runtime";
import { reducedMotion, watchReducedMotion } from "../data/reduced-motion";
import { TOMATO_ART, tomatoStage } from "../domain/pomodoro-tomato";
import { uiText } from "../i18n/runtime";

const RIVE_FILE = "/pomodoro-tomato/tomato.riv?v=1";
/** Tempo que a entrada "instante" fica ligada para a máquina pular direto para a etapa. */
const INSTANT_MS = 150;

function staticSource(stage: number) {
  return `/pomodoro-tomato/estagio-${stage}.webp`;
}

/** Quadro estático do tomate para uma fração de tempo restante (cartão do Espaço do aluno). */
export function PomodoroTomato({ progress }: { progress: number }) {
  const stage = tomatoStage(progress);
  return (
    <img
      className="pomodoro-tomato"
      src={staticSource(stage)}
      width={TOMATO_ART.staticWidth}
      height={TOMATO_ART.staticHeight}
      alt={uiText(1158)}
      data-stage={stage}
      draggable={false}
    />
  );
}

/**
 * O tomate do Pomodoro em Rive, comido de verdade: uma mordida real arranca um pedaço a cada oitavo
 * do tempo escolhido, com a peça arrancada, sementes e migalhas, e o tomate brota de novo quando o
 * ciclo recomeça. A imagem estática da etapa é o quadro inicial e o que fica com movimento
 * reduzido; abrir a tela no meio do tempo pula direto para a etapa certa, sem repetir mordidas.
 */
export function AnimatedPomodoroTomato({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const inputs = useRef<Record<string, RiveInput>>({});
  const latest = useRef(stage);
  const applied = useRef(stage);
  const instantTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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

  useEffect(() => watchReducedMotion(() => setQuiet(reducedMotion())), []);

  useEffect(() => {
    const target = canvas.current;
    if (quiet || !target) return;
    let cancelled = false;
    let instance: RivePlayer | undefined;
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
            created.resizeDrawingSurfaceToCanvas();
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
      .catch(() => undefined);
    const resize = () => instance?.resizeDrawingSurfaceToCanvas();
    const owner = target.ownerDocument.defaultView ?? window;
    owner.addEventListener("resize", resize);
    return () => {
      cancelled = true;
      owner.removeEventListener("resize", resize);
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
      <img
        className="pomodoro-tomato"
        src={staticSource(stage)}
        width={TOMATO_ART.staticWidth}
        height={TOMATO_ART.staticHeight}
        alt=""
      />
      {!quiet && <canvas ref={canvas} aria-hidden="true" />}
    </span>
  );
}
