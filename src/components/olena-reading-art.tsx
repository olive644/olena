import { useEffect, useRef, useState } from "react";
import { loadRiveRuntime, type RivePlayer } from "../data/rive-runtime";
import { reducedMotion, watchReducedMotion } from "../data/reduced-motion";

const RIVE_FILE = "/olena-reading/olena.riv?v=1";
const STATE_MACHINE = "Olena";

type Props = {
  /** Classe do contêiner: é ela que dá tamanho e posição à Olena em cada tela. */
  className: string;
  /** Texto para leitor de tela. Vazio deixa a arte só decorativa. */
  alt?: string;
  /** Quadro estático da arte: é o primeiro quadro e o que fica com movimento reduzido. */
  src: string;
  width: number;
  height: number;
};

/**
 * A Olena lendo do onboarding, animada em Rive (public/olena-reading/olena.riv). A imagem estática
 * é o quadro inicial, a que fica com movimento reduzido e a que aparece se o Rive não carregar.
 * O quadro do Rive é 720 x 720 para uma arte de 640 x 640, por isso o canvas passa 6,25% da
 * imagem para cada lado (a cauda, as orelhas e a estrela saem do quadro da imagem ao se mexer).
 * Nada da conversa ou da conta passa por aqui.
 */
export function OlenaReadingArt({ className, alt = "", src, width, height }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [quiet, setQuiet] = useState(reducedMotion);
  const [ready, setReady] = useState(false);

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
          src: RIVE_FILE,
          canvas: target,
          stateMachines: STATE_MACHINE,
          autoplay: false,
          onLoadError: () => 0,
          layout: new rive.Layout({ fit: rive.Fit.Contain }),
          onLoad: () => {
            if (cancelled) return;
            created.resizeDrawingSurfaceToCanvas();
            created.play();
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
    // A tela mantém duas Olenas montadas (uma fica escondida): só a que aparece gasta quadros.
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
      setReady(false);
    };
  }, [quiet]);

  return (
    <span
      className={className}
      data-ready={ready ? "true" : "false"}
      {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
    >
      <img
        className="onboarding__helena-art"
        src={src}
        alt=""
        width={width}
        height={height}
        decoding="async"
        draggable={false}
      />
      {!quiet && <canvas ref={canvas} aria-hidden="true" />}
    </span>
  );
}
