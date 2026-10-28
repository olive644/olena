import { useAccessibility } from "../../data/accessibility-preferences";

let cached: boolean | undefined;

/** WebGL disponível neste aparelho. Sem ele (ou no jsdom), o caderno continua em 2D. */
export function supportsNotebook3d(): boolean {
  if (cached !== undefined) return cached;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    cached = Boolean(context);
    if (context && "getExtension" in context)
      context.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
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
