import type {
  HandwritingCoordinateSystem,
  HandwritingImage,
  HandwritingLayerKey,
  HandwritingLayerVisibility,
  HandwritingPaperColor,
  HandwritingSticky,
} from "../domain/handwriting";
import { renderPage } from "./handwriting-canvas";
import type { PaperStyle, Stroke } from "./handwriting-types";

// Tudo o que desenha a folha, reunido em um objeto. `renderPage` recebe quinze argumentos em
// ordem fixa e o editor o chamava de quatro lugares (tela, PNG, PDF e impressão); assim cada um
// só diz o que muda.
export type PageScene = {
  strokes: readonly Stroke[];
  paper: PaperStyle;
  paperColor: HandwritingPaperColor;
  stickies: readonly HandwritingSticky[];
  pageText: string;
  pageTextSize: number;
  pageTextFrame: { x: number; y: number; width: number; height: number };
  coordinateSystems: readonly HandwritingCoordinateSystem[];
  backgroundImage: HTMLImageElement | undefined;
  backgroundFrame: { x: number; y: number; width: number; height: number } | undefined;
  layers: HandwritingLayerVisibility;
  layerOrder: readonly HandwritingLayerKey[];
  images: readonly {
    image: HTMLImageElement;
    frame: Pick<HandwritingImage, "x" | "y" | "width" | "height">;
    rotation?: number;
  }[];
};

export type PageSceneOptions = {
  // Na tela: mostra os controles de edição (ex.: a moldura do post-it) e aceita esconder traços
  // que estão na camada ao vivo. Na exportação: a folha limpa.
  editing?: boolean;
  strokes?: readonly Stroke[];
  pageText?: string;
};

export function renderPageScene(
  canvas: HTMLCanvasElement,
  scene: PageScene,
  options: PageSceneOptions = {},
): void {
  renderPage(
    canvas,
    options.strokes ?? scene.strokes,
    scene.paper,
    scene.paperColor,
    scene.stickies,
    options.editing ?? false,
    options.pageText ?? scene.pageText,
    scene.pageTextSize,
    scene.coordinateSystems,
    scene.backgroundImage,
    scene.backgroundFrame,
    scene.layers,
    [...scene.layerOrder],
    scene.images,
    scene.pageTextFrame,
  );
}
