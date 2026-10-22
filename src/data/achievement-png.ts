import { uiLocale, uiText } from "../i18n/runtime";
import type { Achievement } from "../domain/math-achievements";

// Rasteriza somente a arte estática do próprio app. Nenhum dado sai no preparo do card.
export async function achievementPng(
  source: SVGSVGElement,
  achievement: Achievement,
  owner: string,
  earnedAt?: string,
): Promise<File> {
  await document.fonts?.ready;
  const svg = source.cloneNode(true) as SVGSVGElement;
  const uses = [...svg.querySelectorAll("use")];
  if (uses.length) {
    const response = await fetch("/navigation-icons/paper/achievement-objects.svg");
    if (!response.ok) throw new Error("Artwork unavailable");
    const symbols = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
    for (const use of uses) {
      const id = use.getAttribute("href")?.split("#")[1];
      const symbol = id ? symbols.getElementById(id) : null;
      if (!symbol) throw new Error("Artwork missing");
      const group = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      group.setAttribute("viewBox", "0 0 160 180");
      for (const attr of ["x", "y", "width", "height"]) {
        const value = use.getAttribute(attr);
        if (value) group.setAttribute(attr, value);
      }
      group.append(...[...symbol.childNodes].map((node) => document.importNode(node, true)));
      use.replaceWith(group);
    }
  }
  for (const image of svg.querySelectorAll("image")) {
    const response = await fetch("/oliver-math-islands.png");
    if (!response.ok) throw new Error("Oliver unavailable");
    const blob = await response.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Oliver unavailable"));
      reader.readAsDataURL(blob);
    });
    image.setAttribute("href", data);
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
    ctx.fillStyle = "#FFF9EF";
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = "#7C3AED";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1080, 0);
    ctx.lineTo(1080, 110);
    ctx.lineTo(0, 185);
    ctx.fill();
    ctx.fillStyle = "#FACC15";
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
    ctx.drawImage(image, 300, 190, 480, 540);
    ctx.textAlign = "center";
    ctx.fillStyle = "#292432";
    function line(text: string, y: number, size: number, weight = 700) {
      ctx!.font = `${weight} ${size}px Manrope, sans-serif`;
      ctx!.fillText(text, 540, y, 920);
    }
    line(uiText("Eu alcancei a conquista"), 820, 40);
    line(`${uiText(achievement.name)} ${achievement.target}`, 895, 48, 800);
    const description = uiText(achievement.description, [achievement.target]);
    line(description, 965, 28, 500);
    if (owner) line(owner.slice(0, 80), 1030, 30);
    if (earnedAt) line(new Date(earnedAt).toLocaleDateString(uiLocale()), 1080, 26, 500);
    ctx.fillStyle = "#7C3AED";
    line("OlenaStudy", 1230, 48, 800);
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
