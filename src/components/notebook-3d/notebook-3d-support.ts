import { useAccessibility } from "../../data/accessibility-preferences";

let cached: boolean | undefined;

/**
 * WebGL disponível neste aparelho. Sem ele (ou no jsdom), o caderno continua em 2D. Criar um
 * contexto só para testar custava centenas de milissegundos ao abrir o caderno: aqui só se
 * confere a API, e se a cena não conseguir o contexto ela mesma devolve o caderno ao 2D.
 */
export function supportsNotebook3d(): boolean {
  if (cached !== undefined) return cached;
  cached =
    typeof WebGL2RenderingContext !== "undefined" || typeof WebGLRenderingContext !== "undefined";
  return cached;
}

/** Caderno 3D ligado: preferência da pessoa e suporte do aparelho. */
export function useNotebook3d(): boolean {
  const { notebook3d } = useAccessibility();
  return notebook3d && supportsNotebook3d();
}

export function resetNotebook3dSupportForTests() {
  cached = undefined;
}

/** Retângulo da capa fechada do caderno 3D: a cena centraliza o livro fechado na sua área. */
export function notebook3dCoverRect(scene: HTMLElement) {
  const rect = scene.getBoundingClientRect();
  const height = rect.height * 0.8;
  const width = height * 0.74;
  return { x: rect.x + (rect.width - width) / 2, y: rect.y + rect.height * 0.08, width, height };
}

let prefetched = false;
/**
 * Baixa a cena e a tela do 3D antes de serem pedidas. Na estante isso roda em silêncio, depois
 * que a página assentou; com "economizar dados" ligado só baixa quando o caderno realmente abre.
 */
export function prefetchNotebook3d(force = false) {
  if (prefetched) return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData && !force) return;
  prefetched = true;
  void import("./notebook-3d-scene");
  void import("./notebook-3d-book");
}

type Closer = () => Promise<DOMRect | null>;
let closer: Closer | null = null;
/** O caderno 3D aberto se registra para a estante pedir que ele feche antes de a capa viajar. */
export function registerNotebook3dCloser(value: Closer) {
  closer = value;
  return () => {
    if (closer === value) closer = null;
  };
}
/** Fecha o caderno 3D aberto e devolve onde a capa ficou na tela; sem caderno 3D, devolve null. */
export function closeNotebook3d(): Promise<DOMRect | null> {
  return closer ? closer() : Promise.resolve(null);
}
