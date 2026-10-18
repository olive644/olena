import { useEffect, useRef, useState } from "react";
import { loadRiveRuntime, type RiveInput, type RivePlayer } from "../data/rive-runtime";
import { uiText } from "../i18n/runtime";

const RIVE_FILE = "/oliver-math-islands/oliver.riv?v=1";
/** Espera o primeiro quadro estático pintar antes de baixar o runtime e o arquivo. */
const ACTIVATION_DELAY = 900;
/** Reações da máquina "Oliver": 1 pulo, 2 aceno, 3 ânimo. */
const REACTIONS = [1, 2, 3] as const;
const GREETING = 2;
const REACTION_PULSE = 90;
const LEAN_EASE = 0.14;
const INTERACTIVE = "button, a, input, select, textarea, summary, [role=button], [role=link]";

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

function reducedMotion(): boolean {
  return (
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true) ||
    document.documentElement.dataset["reduceMotion"] === "true"
  );
}

/**
 * A arte do Oliver do Espaço do aluno, animada em Rive. A imagem estática continua sendo o
 * elemento acessível e o quadro inicial: o canvas só a substitui quando o arquivo carrega, e a
 * pose de repouso do arquivo é a da imagem, então a troca não tem salto. A arte é decorativa:
 * não recebe foco nem intercepta toques. Ela acompanha o mouse com uma leve inclinação e reage
 * a um toque ou clique sobre ela. Movimento reduzido mantém só a imagem e não baixa nada.
 */
export function OliverHeroArt() {
  const stage = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<RivePlayer | null>(null);
  const inputs = useRef<Record<string, RiveInput>>({});
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);

  // Ativa depois do primeiro quadro e desliga com movimento reduzido, nas duas direções.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      if (reducedMotion()) {
        setActive(false);
        setReady(false);
      } else if (!document.hidden) {
        timer = setTimeout(() => setActive(true), ACTIVATION_DELAY);
      }
    };
    const preferences = new MutationObserver(refresh);
    preferences.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reduce-motion"],
    });
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    media?.addEventListener?.("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return () => {
      if (timer) clearTimeout(timer);
      preferences.disconnect();
      media?.removeEventListener?.("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // Baixa o runtime e o arquivo só quando a animação entra.
  useEffect(() => {
    const target = canvas.current;
    if (!active || !target) return;
    let cancelled = false;
    let instance: RivePlayer | undefined;
    loadRiveRuntime()
      .then((rive) => {
        if (cancelled) return;
        const created: RivePlayer = new rive.Rive({
          src: RIVE_FILE,
          canvas: target,
          stateMachines: "Oliver",
          autoplay: true,
          layout: new rive.Layout({ fit: rive.Fit.Contain }),
          onLoad: () => {
            if (cancelled) return;
            created.resizeDrawingSurfaceToCanvas();
            const found: Record<string, RiveInput> = {};
            for (const input of created.stateMachineInputs("Oliver") ?? [])
              found[input.name] = input;
            inputs.current = found;
            player.current = created;
            setReady(true);
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
    return () => {
      cancelled = true;
      player.current = null;
      inputs.current = {};
      instance?.cleanup();
      setReady(false);
    };
  }, [active]);

  // Com a animação pronta: pausa fora da tela, olhar pelo mouse e reação ao toque.
  useEffect(() => {
    const host = stage.current;
    if (!ready || !host) return;
    const current = player.current;
    const set = (name: string, value: number) => {
      const input = inputs.current[name];
      if (input) input.value = value;
    };
    let onScreen = true;
    const sync = () => {
      if (onScreen && !document.hidden && !reducedMotion()) current?.play();
      else current?.pause();
    };

    // Inclinação suave: o alvo vem do ponteiro e o valor da máquina o alcança por quadro.
    let target = 0;
    let lean = 0;
    let frame = 0;
    const follow = () => {
      frame = 0;
      lean += (target - lean) * LEAN_EASE;
      if (Math.abs(target - lean) < 0.004) lean = target;
      set("olharX", lean);
      if (lean !== target) frame = requestAnimationFrame(follow);
    };
    const aim = (value: number) => {
      target = value;
      if (!frame) frame = requestAnimationFrame(follow);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const box = host.getBoundingClientRect();
      aim(clamp((event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2)));
    };
    const leave = () => aim(0);

    let pulse: ReturnType<typeof setTimeout> | undefined;
    let next = 0;
    const react = (value: number) => {
      set("clique", value);
      if (pulse) clearTimeout(pulse);
      pulse = setTimeout(() => set("clique", 0), REACTION_PULSE);
    };
    // A arte não intercepta toques: o clique é reconhecido pelo retângulo dela, e controles
    // por baixo (botões, links, campos) continuam com a ação deles.
    const press = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
      const box = host.getBoundingClientRect();
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      )
        return;
      react(REACTIONS[next++ % REACTIONS.length] ?? 1);
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver((entries) => {
            onScreen = entries.some((entry) => entry.isIntersecting);
            sync();
          });
    observer?.observe(host);
    const resize = () => current?.resizeDrawingSurfaceToCanvas();
    const greeting = setTimeout(() => react(GREETING), 700);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", press, true);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      clearTimeout(greeting);
      if (pulse) clearTimeout(pulse);
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", press, true);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ready]);

  return (
    <span ref={stage} className="math-hero-oliver" data-ready={ready ? "true" : "false"}>
      <img
        src="/oliver-math-islands.png"
        width="720"
        height="791"
        fetchPriority="high"
        alt={uiText("Oliver convidando você para explorar as ilhas de Matemática")}
        draggable={false}
      />
      {active && <canvas ref={canvas} aria-hidden="true" />}
    </span>
  );
}
