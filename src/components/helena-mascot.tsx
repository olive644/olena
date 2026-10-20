import { useEffect, useRef, useState } from "react";
import { loadRiveRuntime, type RiveInput, type RivePlayer } from "../data/rive-runtime";
import { reducedMotion, watchReducedMotion } from "../data/reduced-motion";

type MascotProps = {
  open: boolean;
  motion: string;
  tilt: { x: number; y: number };
  hover: boolean;
};

/** Ritmo do botão recolhido, o mesmo da versão anterior: estrela por 2,8 s e Olena por 13 s. */
const STAR_SECONDS = 2800;
const HELENA_SECONDS = 13000;
const ACTIVATION_DELAY = 1500;
const RIVE_FILE = "/helena-assistant/helena.riv?v=1";

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/** Forma visível a partir do estado da máquina do Rive: serve aos testes e ao CSS. */
function formOf(state: string): "star" | "helena" | "transforming" {
  if (state.startsWith("vira-")) return "transforming";
  return state.startsWith("estrela") ? "star" : "helena";
}

/**
 * A Olena do assistente, em Rive. O botão pai mantém foco, clique e arraste; aqui só se desenha.
 * O estado visual chega pelas entradas da máquina "Helena" (aberta, arrastando, atenta, lado e
 * olharX). Nada da conversa ou da conta passa por aqui.
 */
export function HelenaMascot(props: MascotProps) {
  const host = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<RivePlayer | null>(null);
  const inputs = useRef<Record<string, RiveInput>>({});
  const interaction = useRef(false);
  const [active, setActive] = useState(() => !reducedMotion());
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  // Com a conversa fechada, o botão alterna sozinho entre estrela e Olena.
  const [showHelena, setShowHelena] = useState(false);
  // Abrir ou recolher a conversa recomeça o ciclo pela estrela: ao recolher, ela vira estrela na hora.
  const [lastOpen, setLastOpen] = useState(props.open);
  if (lastOpen !== props.open) {
    setLastOpen(props.open);
    setShowHelena(false);
  }
  const aberta = props.open || showHelena;

  useEffect(() => {
    if (props.open || !ready || reduced) return;
    if (!showHelena) {
      const timer = setTimeout(() => setShowHelena(true), STAR_SECONDS);
      return () => clearTimeout(timer);
    }
    if (props.hover) return;
    const timer = setTimeout(() => setShowHelena(false), HELENA_SECONDS);
    return () => clearTimeout(timer);
  }, [props.open, props.hover, showHelena, ready, reduced]);

  // Entradas da máquina de estados, a cada mudança de estado visual.
  useEffect(() => {
    const set = (name: string, value: number | boolean) => {
      const input = inputs.current[name];
      if (input) input.value = value;
    };
    const dragging = props.motion === "dragging";
    if (host.current)
      host.current.dataset["behavior"] = dragging ? "dragging" : props.hover ? "following" : "idle";
    set("aberta", aberta);
    set("arrastando", dragging);
    set("lado", dragging ? clamp(props.tilt.y / 18) : 0);
    set("atenta", props.hover && !dragging);
    set("olharX", clamp(props.tilt.y / 18));
  }, [aberta, props.motion, props.tilt.x, props.tilt.y, props.hover, ready]);

  // Ativação, pausa quando outra tela está em uso e movimento reduzido.
  useEffect(() => {
    let activation: ReturnType<typeof setTimeout> | undefined;
    let resume: ReturnType<typeof setTimeout> | undefined;
    const visible = () =>
      !document.hidden &&
      !interaction.current &&
      !document.querySelector('dialog[open], [aria-modal="true"]');
    const sync = () => {
      const current = player.current;
      if (!current) return;
      if (visible() && !reducedMotion()) current.play();
      else current.pause();
    };
    const refresh = () => {
      const quiet = reducedMotion();
      setReduced(quiet);
      if (activation) clearTimeout(activation);
      if (quiet) {
        setActive(false);
        setReady(false);
      } else if (!document.hidden) {
        activation = setTimeout(() => setActive(true), ACTIVATION_DELAY);
      }
      sync();
    };
    const input = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(".helena-chat")) {
        interaction.current = false;
        if (resume) clearTimeout(resume);
        if (!reducedMotion()) setActive(true);
        sync();
        return;
      }
      interaction.current = true;
      if (resume) clearTimeout(resume);
      if (activation) clearTimeout(activation);
      sync();
      resume = setTimeout(() => {
        interaction.current = false;
        refresh();
      }, ACTIVATION_DELAY);
    };
    const approach = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(".helena-chat")) input(event);
    };
    const unwatch = watchReducedMotion(refresh);
    const dialogs = new MutationObserver(sync);
    dialogs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "aria-modal"],
    });
    const resize = () => player.current?.resizeDrawingSurfaceToCanvas();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", input, true);
    window.addEventListener("pointerover", approach, true);
    window.addEventListener("keydown", input, true);
    window.addEventListener("input", input, true);
    refresh();
    return () => {
      if (activation) clearTimeout(activation);
      if (resume) clearTimeout(resume);
      unwatch();
      dialogs.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", input, true);
      window.removeEventListener("pointerover", approach, true);
      window.removeEventListener("keydown", input, true);
      window.removeEventListener("input", input, true);
    };
  }, []);

  // Carrega o runtime e o arquivo .riv só quando a animação entra.
  useEffect(() => {
    const target = canvas.current;
    if (!active || reduced || !target) return;
    let cancelled = false;
    loadRiveRuntime()
      .then((rive) => {
        if (cancelled) return;
        const instance = new rive.Rive({
          src: RIVE_FILE,
          canvas: target,
          stateMachines: "Helena",
          autoplay: true,
          layout: new rive.Layout({ fit: rive.Fit.Contain }),
          onLoad: () => {
            if (cancelled) return;
            instance.resizeDrawingSurfaceToCanvas();
            const found: Record<string, RiveInput> = {};
            for (const input of instance.stateMachineInputs("Helena") ?? [])
              found[input.name] = input;
            inputs.current = found;
            setReady(true);
          },
          onLoadError: () => {
            if (!cancelled) setReady(false);
          },
          onStateChange: (event) => {
            const names = Array.isArray(event.data) ? event.data : [];
            const state = names.find((name): name is string => typeof name === "string");
            if (state && host.current) {
              host.current.dataset["state"] = state;
              host.current.dataset["form"] = formOf(state);
            }
          },
        });
        player.current = instance;
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
      player.current?.cleanup();
      player.current = null;
      inputs.current = {};
      setReady(false);
    };
  }, [active, reduced]);

  return (
    <span
      ref={host}
      className="helena-virtual-mascot"
      data-ready={ready}
      data-reduced={reduced}
      aria-hidden="true"
    >
      <img
        src={props.open ? "/helena-assistant/helena-rive.png" : "/helena-assistant/star-rive.png"}
        width="64"
        height="64"
        alt=""
        draggable="false"
      />
      {active && !reduced && <canvas ref={canvas} width="128" height="128" />}
    </span>
  );
}
