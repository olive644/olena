import { uiLocale, uiText } from "../i18n/runtime";
import type { Achievement } from "../domain/math-achievements";
import {
  ACHIEVEMENT_MATERIALS,
  ACHIEVEMENT_THEMES,
  achievementTheme,
} from "../domain/achievement-presentation";

// Embute no SVG clonado a arte do selo e os dígitos de papel, para rasterizar sem rede.
export async function inlineAchievementArt(
  svg: SVGSVGElement,
  allowed: (path: string) => boolean,
): Promise<void> {
  svg.querySelectorAll("[data-achievement-preview]").forEach((node) => node.remove());
  for (const badge of svg.querySelectorAll("image")) {
    const path = badge.getAttribute("href") ?? "";
    if (!allowed(path)) throw new Error("Artwork unavailable");
    const response = await fetch(path);
    if (!response.ok) throw new Error("Artwork unavailable");
    const blob = await response.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("Artwork unavailable"));
      reader.onerror = () => reject(new Error("Artwork unavailable"));
      reader.readAsDataURL(blob);
    });
    badge.setAttribute("href", data);
  }
  const uses = [...svg.querySelectorAll("use")];
  if (uses.length) {
    const documents = new Map<string, Document>();
    for (const use of uses) {
      const [path, id] = (use.getAttribute("href") ?? "").split("#");
      if (!path || !["/paper-digits.svg"].includes(path)) throw new Error("Artwork unavailable");
      if (!documents.has(path)) {
        const response = await fetch(path);
        if (!response.ok) throw new Error("Artwork unavailable");
        documents.set(
          path,
          new DOMParser().parseFromString(await response.text(), "image/svg+xml"),
        );
      }
      const symbols = documents.get(path)!;
      const symbol = id ? symbols.getElementById(id) : null;
      if (!symbol) throw new Error("Artwork missing");
      const group = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      group.setAttribute("viewBox", symbol.getAttribute("viewBox") ?? "0 0 160 180");
      for (const attr of ["x", "y", "width", "height"]) {
        const value = use.getAttribute(attr);
        if (value) group.setAttribute(attr, value);
      }
      group.append(...[...symbol.childNodes].map((node) => document.importNode(node, true)));
      use.replaceWith(group);
    }
  }
}
// Rasteriza somente a arte estática do próprio app. Nenhum dado sai no preparo do card.
export async function achievementPng(
  source: SVGSVGElement,
  achievement: Achievement,
  owner: string,
  earnedAt?: string,
): Promise<File> {
  await document.fonts?.ready;
  const svg = source.cloneNode(true) as SVGSVGElement;
  await inlineAchievementArt(svg, (path) =>
    [
      `/achievement-badges/math/${achievement.id}.webp`,
      `/achievement-badges/general/${achievement.id}.webp`,
    ].includes(path),
  );
  const image = new Image();
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }),
  );
  try {
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    const theme = ACHIEVEMENT_THEMES[achievementTheme(achievement)];
    const background = new Image();
    background.src = `/achievement-badges/cards/${achievementTheme(achievement)}.svg`;
    await background.decode();
    ctx.drawImage(background, 0, 0, 1080, 1350);
    ctx.fillStyle = "#fff9ef";
    ctx.font = "700 28px Manrope, sans-serif";
    ctx.fillText(uiText(theme.label), 55, 70);
    ctx.drawImage(image, 270, 190, 540, 540);
    ctx.textAlign = "center";
    ctx.fillStyle = "#292432";
    function line(text: string, y: number, size: number, weight = 700) {
      ctx!.font = `${weight} ${size}px Manrope, sans-serif`;
      ctx!.fillText(text, 540, y, 920);
    }
    line(uiText(2850), 820, 40);
    const material =
      achievement.category === "general" && achievement.tier
        ? uiText(ACHIEVEMENT_MATERIALS[achievement.tier].label)
        : "";
    line(
      `${uiText(achievement.name)}${achievement.category === "general" ? (material ? " · " + material : "") : " " + achievement.target}`,
      895,
      48,
      800,
    );
    const description = uiText(achievement.description, [achievement.target]);
    line(description, 965, 28, 500);
    if (owner) line(owner.slice(0, 80), 1030, 30);
    if (earnedAt) line(new Date(earnedAt).toLocaleDateString(uiLocale()), 1080, 26, 500);
    const logo = await paperBrandImage(theme);
    const mark = new Image();
    mark.src = "/olena-favicon-180.png";
    await mark.decode();
    ctx.drawImage(mark, 220, 1162, 90, 90);
    ctx.drawImage(logo, 330, 1170, 530, 84);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG unavailable"))),
        "image/png",
      ),
    );
    return new File([png], `olena-conquista-${achievement.id}.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function paperBrandImage(theme: {
  face: string;
  depth: string;
  accent: string;
}): Promise<HTMLImageElement> {
  // O mesmo alfabeto facetado de PaperCardTitle, nunca uma fonte substituta.
  const response = await fetch("/paper-monochrome-alphabet.svg");
  if (!response.ok) throw new Error("Artwork unavailable");
  const alphabet = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
  const brand = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  brand.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  brand.setAttribute("viewBox", "0 0 660 104");
  brand.setAttribute(
    "style",
    `--digit-face:${theme.face};--digit-depth:${theme.depth};--digit-fold:${theme.accent};--digit-edge:${theme.depth}`,
  );
  [..."OLENASTUDY"].forEach((letter, index) => {
    const symbol = alphabet.getElementById("letter-" + letter);
    if (!symbol) throw new Error("Artwork missing");
    const glyph = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    glyph.setAttribute("x", String(index * 66));
    glyph.setAttribute("width", "66");
    glyph.setAttribute("height", "98");
    glyph.setAttribute("viewBox", symbol.getAttribute("viewBox") ?? "0 0 66 98");
    glyph.append(...[...symbol.childNodes].map((node) => document.importNode(node, true)));
    brand.append(glyph);
  });
  const logo = new Image();
  logo.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(brand))}`;
  await logo.decode();
  return logo;
}
