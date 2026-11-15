import { useRef } from "react";
import { useRiveArt } from "../hooks/use-rive-art";

// Arquivos gerados por scripts/prateleira-rive (ver o README da pasta).
const OLENA_FILE = "/olena-prateleira/olena-dormindo.riv?v=1";
const HERA_FILE = "/olena-prateleira/hera.riv?v=1";

/**
 * A Olena dormindo da prateleira dos cadernos, animada em Rive. A imagem estática é o primeiro
 * quadro, a que fica com movimento reduzido e a que aparece se o Rive não carregar. O quadro do
 * Rive tem 16 unidades de folga em volta da arte de 480 x 240 (a estrela, a orelha, os brilhos e os
 * "z" saem um pouco do quadro da imagem), por isso o canvas passa da imagem nos quatro lados.
 * Tocar nela a assusta (entrada `clique`). É só decoração: fica de fora da árvore de acessibilidade
 * e nenhuma ação depende dela.
 */
export function OlenaShelfCat({ src }: { src: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { quiet, ready, trigger } = useRiveArt(canvas, { src: OLENA_FILE, stateMachine: "Olena" });
  return (
    <span className="notebook-shelf-cat" data-ready={ready ? "true" : "false"} aria-hidden="true">
      <img src={src} alt="" width={480} height={240} decoding="async" draggable={false} />
      {!quiet && <canvas ref={canvas} onPointerDown={() => trigger("clique")} />}
    </span>
  );
}

/**
 * A hera que pende de um canto da prateleira: 16 folhas de papel que balançam com a brisa e, de
 * tempos em tempos, com uma rajada. As folhas de CSS ficam no lugar e são o primeiro quadro, o que
 * fica com movimento reduzido e o que aparece se o Rive não carregar.
 */
export function ShelfVines({ side }: { side: "left" | "right" }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { quiet, ready } = useRiveArt(canvas, { src: HERA_FILE, stateMachine: "Hera" });
  return (
    <span
      className={`notebook-shelf-vines is-${side}`}
      data-ready={ready ? "true" : "false"}
      aria-hidden="true"
    >
      {Array.from({ length: 16 }, (_, index) => (
        <i key={index} style={{ top: index * 12 }} />
      ))}
      {!quiet && <canvas ref={canvas} />}
    </span>
  );
}
