import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { loadRiveRuntime, type RivePlayer } from "../data/rive-runtime";
import { reducedMotion, watchReducedMotion } from "../data/reduced-motion";

type Options = {
  /** Arquivo .riv (já com a versão na URL). */
  src: string;
  /** Nome da máquina de estados do arquivo. */
  stateMachine: string;
};

/**
 * Anima um canvas com um arquivo Rive, só quando a arte aparece na tela e sem movimento reduzido.
 * Devolve `ready` (o primeiro quadro do Rive já está no canvas, então a imagem estática pode sair)
 * e `trigger`, que liga uma entrada numérica da máquina de estados por um instante.
 * Nada da conversa ou da conta passa por aqui.
 */
export function useRiveArt(canvas: RefObject<HTMLCanvasElement | null>, options: Options) {
  const { src, stateMachine } = options;
  const [quiet, setQuiet] = useState(reducedMotion);
  const [ready, setReady] = useState(false);
  const player = useRef<RivePlayer | undefined>(undefined);

  useEffect(() => watchReducedMotion(() => setQuiet(reducedMotion())), []);

  useEffect(() => {
    const target = canvas.current;
    if (quiet || !target) return;
    let cancelled = false;
    let instance: RivePlayer | undefined;
    const owner = target.ownerDocument.defaultView ?? window;
    loadRiveRuntime(owner)
      .then((rive) => {
        if (cancelled) return;
        const created: RivePlayer = new rive.Rive({
          src,
          canvas: target,
          stateMachines: stateMachine,
          autoplay: false,
          onLoadError: () => 0,
          layout: new rive.Layout({ fit: rive.Fit.Contain }),
          onLoad: () => {
            if (cancelled) return;
            created.resizeDrawingSurfaceToCanvas();
            created.play();
            player.current = created;
            setReady(true);
          },
        });
        instance = created;
      })
      .catch(() => 0);
    const resize = () => instance?.resizeDrawingSurfaceToCanvas();
    owner.addEventListener("resize", resize);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(target);
    // Só a arte visível gasta quadros: fora da tela (ou numa aba escondida) ela pausa.
    const visibility =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            const visible = entries.some((entry) => entry.isIntersecting);
            if (visible) instance?.play();
            else instance?.pause();
          });
    visibility?.observe(target);
    return () => {
      cancelled = true;
      owner.removeEventListener("resize", resize);
      observer?.disconnect();
      visibility?.disconnect();
      instance?.cleanup();
      player.current = undefined;
      setReady(false);
    };
  }, [canvas, quiet, src, stateMachine]);

  const trigger = useCallback(
    (name: string, hold = 120) => {
      const input = player.current
        ?.stateMachineInputs(stateMachine)
        ?.find((item) => item.name === name);
      if (!input) return;
      input.value = 1;
      window.setTimeout(() => {
        input.value = 0;
      }, hold);
    },
    [stateMachine],
  );

  return { quiet, ready, trigger };
}
