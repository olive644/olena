import { inlineAchievementArt } from "./achievement-png";

// Tamanho de referência da carta (docs/ARCANA_CARD_DESIGN.md): 348 x 598, moldura de 10 px.
const WIDTH = 348;
const HEIGHT = 598;
const SCALE = 3;
const SVG = "http://www.w3.org/2000/svg";
const GLYPH_SOURCES = ["/paper-monochrome-alphabet.svg", "/paper-digits.svg"];
const ART_PATH = /^\/arcana\/[a-z0-9/-]+\.webp$/;
const YELLOW = "#facc15";
const PURPLE = "#6d28d9";
const BLACK = "#17151c";

const num = (value: number) => String(Math.round(value * 100) / 100);
function element(name: string, attributes: Record<string, string>, ...children: Element[]) {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  node.append(...children);
  return node;
}
async function load(source: string, what: string) {
  const image = new Image();
  image.src = source;
  try {
    await image.decode();
  } catch {
    throw new Error(`${what} unavailable`);
  }
  return image;
}

// Troca cada <use> do alfabeto e dos dígitos pelo símbolo original, porque uma imagem SVG
// rasterizada não consegue buscar arquivos externos. Só as duas fontes do app são aceitas.
async function inlineGlyphs(root: Element) {
  const documents = new Map<string, Document>();
  for (const use of [...root.querySelectorAll("use")]) {
    const [path, id] = (use.getAttribute("href") ?? "").split("#");
    if (!path || !id || !GLYPH_SOURCES.includes(path)) throw new Error("Artwork unavailable");
    if (!documents.has(path)) {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Artwork unavailable");
      documents.set(path, new DOMParser().parseFromString(await response.text(), "image/svg+xml"));
    }
    const symbol = documents.get(path)!.getElementById(id);
    if (!symbol) throw new Error("Artwork missing");
    const group = element("svg", {
      viewBox: symbol.getAttribute("viewBox") ?? "0 0 66 98",
      width: use.getAttribute("width") ?? "100%",
      height: use.getAttribute("height") ?? "100%",
      overflow: "visible",
    });
    group.append(...[...symbol.childNodes].map((node) => document.importNode(node, true)));
    use.replaceWith(group);
  }
}

// Âncora de 4 pontas dos sinais roxos laterais do título (o glifo de texto muda por fonte).
const SPARK = "M0-6.5 1.8-1.8 6.5 0 1.8 1.8 0 6.5-1.8 1.8-6.5 0-1.8-1.8Z";

/**
 * Recebe o `article.arcana-paper` renderizado da miniatura de uma carta e devolve uma imagem
 * local (PNG) do card completo: moldura, índice, título no alfabeto original e a arte COMPLETA
 * (a miniatura `-small.webp` é trocada pelo arquivo cheio, nunca ampliada). O desenho segue o
 * layout de referência 348 x 598 medido numa cópia fora da tela, sem o CSS compacto da galeria.
 *
 * A imagem tem exatamente a caixa da carta (1044 x 1794, 3x), canto inferior direito incluso.
 * A base roxa deslocada e a sombra externa ficam fora dessa caixa e são de quem compõe o
 * compartilhamento. Só vetores do próprio app e a arte em data URL entram no canvas, sem
 * foreignObject, então o resultado não contamina um canvas de compartilhamento.
 */
export async function arcanaThumbnailPng(source: HTMLElement): Promise<HTMLImageElement> {
  if (!source.classList.contains("arcana-paper") || source.classList.contains("arcana-paper--back"))
    throw new Error("Card front required");
  const picture = source.querySelector<HTMLImageElement>(".arcana-paper__scene > img");
  const thumbnail = picture?.getAttribute("src") ?? "";
  const art = thumbnail.replace(/-small\.webp$/, ".webp");
  if (!ART_PATH.test(art)) throw new Error("Artwork unavailable");
  const indexColor = source
    .querySelector<HTMLElement>(".arcana-paper__index")
    ?.style.getPropertyValue("--arcana-index-color")
    .trim();

  // Cópia fora da tela na largura de referência, sem o CSS da miniatura da galeria.
  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  stage.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;pointer-events:none`;
  const card = source.cloneNode(true) as HTMLElement;
  card.removeAttribute("id");
  card.querySelector(".arcana-paper__scene > img")?.remove();
  // A caixa de referência não pode depender do reset global de box-sizing do app.
  for (const node of [card, ...card.querySelectorAll<HTMLElement>("*")])
    if (node instanceof HTMLElement) node.style.boxSizing = "border-box";
  stage.append(card);
  document.body.append(stage);
  const svg = element("svg", {
    xmlns: SVG,
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    width: String(WIDTH * SCALE),
    height: String(HEIGHT * SCALE),
  });
  try {
    await document.fonts?.ready;
    const origin = card.getBoundingClientRect();
    if (Math.abs(origin.width - WIDTH) > 1 || Math.abs(origin.height - HEIGHT) > 1)
      throw new Error("Card layout unavailable");
    const box = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        w: rect.width,
        h: rect.height,
      };
    };
    const scene = box(card.querySelector(".arcana-paper__scene")!);
    const color = /^#[0-9a-f]{6}$/i.test(indexColor ?? "") ? indexColor! : YELLOW;
    svg.append(
      element(
        "defs",
        {},
        element(
          "clipPath",
          { id: "scene" },
          element("path", {
            d: `M${num(scene.x + 3)} ${num(scene.y)}H${num(scene.x + scene.w - 5)}L${num(scene.x + scene.w)} ${num(scene.y + 5)}V${num(scene.y + scene.h)}H${num(scene.x)}V${num(scene.y + 3)}Z`,
          }),
        ),
        element(
          "clipPath",
          { id: "frame" },
          element("path", {
            d: `M3 0H${WIDTH - 11}Q${WIDTH} 0 ${WIDTH} 11V${HEIGHT - 3}Q${WIDTH} ${HEIGHT} ${WIDTH - 3} ${HEIGHT}H8Q0 ${HEIGHT} 0 ${HEIGHT - 8}V3Q0 0 3 0Z`,
          }),
        ),
      ),
      // Moldura amarela com os cantos assimétricos 3/11/3/8 e o recorte roxo inferior direito.
      element(
        "g",
        { "clip-path": "url(#frame)" },
        element("rect", { width: String(WIDTH), height: String(HEIGHT), fill: YELLOW }),
        element("path", { d: `M${WIDTH} ${HEIGHT - 17}V${HEIGHT}H${WIDTH - 17}Z`, fill: PURPLE }),
      ),
      element("rect", {
        x: num(scene.x),
        y: num(scene.y),
        width: num(scene.w),
        height: num(scene.h),
        fill: BLACK,
        "clip-path": "url(#scene)",
      }),
      element("image", {
        href: art,
        x: num(scene.x),
        y: num(scene.y),
        width: num(scene.w),
        height: num(scene.h),
        preserveAspectRatio: "xMidYMid slice",
        "clip-path": "url(#scene)",
      }),
    );
    // Índice e título: os mesmos glifos renderizados pelo componente, nas posições medidas.
    const glyphs = (selector: string, style: string) =>
      [...card.querySelectorAll<SVGSVGElement>(selector)].map((glyph) => {
        const place = box(glyph);
        const clone = glyph.cloneNode(true) as SVGSVGElement;
        for (const attribute of ["class", "style", "focusable", "aria-hidden"])
          clone.removeAttribute(attribute);
        for (const [key, value] of Object.entries({
          x: num(place.x),
          y: num(place.y),
          width: num(place.w),
          height: num(place.h),
          overflow: "visible",
        }))
          clone.setAttribute(key, value);
        return element("g", { style }, clone);
      });
    const digits = !!card.querySelector(".arcana-paper__index .paper-digits");
    svg.append(
      ...glyphs(
        ".arcana-paper__index svg",
        `--digit-face:${color};--digit-fold:${color};--digit-depth:${PURPLE};--digit-edge:${digits ? PURPLE : color}`,
      ),
      ...glyphs(
        ".arcana-paper__title svg",
        `--digit-face:${BLACK};--digit-fold:${PURPLE};--digit-depth:${PURPLE};--digit-edge:${BLACK}`,
      ),
    );
    // Pequeno traço roxo sob o índice e os dois sinais laterais do título.
    const index = card.querySelector(".arcana-paper__index");
    if (index) {
      const rect = box(index);
      svg.append(
        element("path", {
          d: `M${num(rect.x + rect.w / 2 - 15)} ${num(rect.y + rect.h - 7)}L${num(rect.x + rect.w / 2)} ${num(rect.y + rect.h - 8)}L${num(rect.x + rect.w / 2 + 15)} ${num(rect.y + rect.h - 7)}L${num(rect.x + rect.w / 2)} ${num(rect.y + rect.h - 6)}Z`,
          fill: PURPLE,
        }),
      );
    }
    for (const spark of card.querySelectorAll(
      ".arcana-paper__title > span[aria-hidden=true]:not(.paper-card-title)",
    )) {
      const rect = box(spark);
      svg.append(
        element("path", {
          d: SPARK,
          fill: PURPLE,
          transform: `translate(${num(rect.x + rect.w / 2)} ${num(rect.y + rect.h / 2)}) scale(${num(Math.min(1, rect.h / 16))})`,
        }),
      );
    }
  } finally {
    stage.remove();
  }
  await inlineGlyphs(svg);
  await inlineAchievementArt(svg as SVGSVGElement, (path) => path === art);

  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }),
  );
  try {
    const drawing = await load(url, "Card");
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH * SCALE;
    canvas.height = HEIGHT * SCALE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(drawing, 0, 0, canvas.width, canvas.height);
    // Data URL do mesmo documento: a imagem devolvida nunca marca o canvas de quem a desenhar.
    return await load(canvas.toDataURL("image/png"), "Card");
  } finally {
    URL.revokeObjectURL(url);
  }
}
