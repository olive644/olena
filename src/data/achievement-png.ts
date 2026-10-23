import { uiLocale, uiText } from "../i18n/runtime";
import type { Achievement } from "../domain/math-achievements";
import {
  ACHIEVEMENT_MATERIALS,
  ACHIEVEMENT_THEMES,
  achievementTheme,
} from "../domain/achievement-presentation";

// Rasteriza somente a arte estática do próprio app. Nenhum dado sai no preparo do card.
export async function achievementPng(
  source: SVGSVGElement,
  achievement: Achievement,
  owner: string,
  earnedAt?: string,
): Promise<File> {
  await document.fonts?.ready;
  const svg = source.cloneNode(true) as SVGSVGElement;
  for (const badge of svg.querySelectorAll("image")) {
    const path = badge.getAttribute("href") ?? "";
    if (
      ![
        `/achievement-badges/math/${achievement.id}.webp`,
        `/achievement-badges/general/${achievement.id}.webp`,
      ].includes(path)
    )
      throw new Error("Artwork unavailable");
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
    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = theme.face;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1080, 0);
    ctx.lineTo(1080, 110);
    ctx.lineTo(0, 185);
    ctx.fill();
    ctx.fillStyle = theme.depth;
    ctx.beginPath();
    ctx.moveTo(0, 185);
    ctx.lineTo(1080, 110);
    ctx.lineTo(1080, 125);
    ctx.lineTo(0, 200);
    ctx.fill();
    ctx.fillStyle = theme.accent;
    ctx.font = "700 28px Manrope, sans-serif";
    ctx.fillText(uiText(theme.label), 55, 70);
    // Cada assunto carrega seu próprio vocabulário visual, sem substituir as artes.
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = theme.face;
    ctx.lineWidth = 9;
    const kind = achievementTheme(achievement);
    for (const x of [65, 915]) {
      if (kind === "notebooks") {
        ctx.strokeRect(x, 420, 95, 140);
        for (const y of [450, 480, 510]) {
          ctx.beginPath();
          ctx.moveTo(x + 20, y);
          ctx.lineTo(x + 75, y);
          ctx.stroke();
        }
      } else if (kind === "focus") {
        ctx.beginPath();
        ctx.arc(x + 48, 480, 45, 0, Math.PI * 2);
        ctx.moveTo(x + 48, 445);
        ctx.lineTo(x + 48, 480);
        ctx.lineTo(x + 73, 490);
        ctx.stroke();
      } else if (kind === "friends") {
        for (const dx of [25, 70]) {
          ctx.beginPath();
          ctx.arc(x + dx, 450, 20, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(x, 520);
        ctx.quadraticCurveTo(x + 48, 465, x + 95, 520);
        ctx.stroke();
      } else if (kind === "routine") {
        ctx.strokeRect(x, 430, 95, 100);
        ctx.beginPath();
        ctx.moveTo(x + 15, 480);
        ctx.lineTo(x + 37, 505);
        ctx.lineTo(x + 80, 455);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(x, 480);
        ctx.lineTo(x + 95, 480);
        ctx.moveTo(x + 48, 430);
        ctx.lineTo(x + 48, 530);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.fillStyle = theme.accent;
    for (const [x, y, size] of [
      [115, 370, 25],
      [930, 690, 40],
      [170, 780, 16],
      [920, 235, 18],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x!, y! - size!);
      ctx.lineTo(x! + size!, y!);
      ctx.lineTo(x!, y! + size!);
      ctx.lineTo(x! - size!, y!);
      ctx.fill();
    }
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
    const logoUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(brand)], { type: "image/svg+xml" }),
    );
    try {
      logo.src = logoUrl;
      await logo.decode();
      ctx.drawImage(logo, 290, 1170, 500, 79);
    } finally {
      URL.revokeObjectURL(logoUrl);
    }
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
