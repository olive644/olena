import { arcanaThumbnailPng } from "./arcana-png";
import { paperBrandImage } from "./achievement-png";
import { COSMIC_RARITIES, oliverRarity } from "./oliver-rarity";
import type { ArcanaId } from "./arcana-ids";
import { uiLocale, uiText } from "../i18n/runtime";
let preparing = false;

export async function arcanaSharePng(
  source: HTMLElement,
  id: ArcanaId,
  owner: string,
  earnedAt?: number,
): Promise<File> {
  if (preparing) throw Error("Card export already in progress");
  preparing = true;
  try {
    await Promise.all(
      ["800 30px Manrope", "700 28px Manrope", "500 23px Manrope"].map((font) =>
        document.fonts.load(font),
      ),
    );
    const [card, brand] = await Promise.all([
      arcanaThumbnailPng(source),
      paperBrandImage({ face: "#facc15", depth: "#6d28d9", accent: "#8b5cf6" }),
    ]);
    const favicon = new Image();
    favicon.src = "/olena-favicon-180.png";
    await favicon.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable");
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#17151c";
    ctx.fillRect(0, 0, 1080, 1350);
    const cut = (points: number[][], color: string) => {
      ctx.beginPath();
      for (const [index, point] of points.entries())
        if (index === 0) ctx.moveTo(point[0]!, point[1]!);
        else ctx.lineTo(point[0]!, point[1]!);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    cut(
      [
        [0, 0],
        [310, 0],
        [0, 300],
      ],
      "#51259b",
    );
    cut(
      [
        [0, 0],
        [155, 0],
        [0, 150],
      ],
      "#8b5cf6",
    );
    cut(
      [
        [1080, 1050],
        [1080, 1350],
        [770, 1350],
      ],
      "#51259b",
    );
    cut(
      [
        [1080, 1200],
        [1080, 1350],
        [925, 1350],
      ],
      "#6d28d9",
    );
    for (const [x, y, size] of [
      [136, 415, 20],
      [937, 670, 26],
      [149, 902, 15],
      [928, 245, 17],
    ]) {
      cut(
        [
          [x!, y! - size!],
          [x! + size! * 0.3, y! - size! * 0.3],
          [x! + size!, y!],
          [x! + size! * 0.3, y! + size! * 0.3],
          [x!, y! + size!],
          [x! - size! * 0.3, y! + size! * 0.3],
          [x! - size!, y!],
          [x! - size! * 0.3, y! - size! * 0.3],
        ],
        "#facc15",
      );
    }
    const width = 500,
      height = (width * 598) / 348,
      x = (1080 - width) / 2,
      y = 126;
    ctx.fillStyle = "#6d28d9";
    ctx.fillRect(x + 4, y + 9, width, height);
    ctx.drawImage(card, x, y, width, height);
    const rarity = COSMIC_RARITIES[oliverRarity(id)]!;
    ctx.textAlign = "center";
    ctx.fillStyle = "#facc15";
    ctx.font = "800 30px Manrope,sans-serif";
    ctx.fillText(rarity.name, 540, 1050);
    ctx.fillStyle = "#fff9ef";
    ctx.font = "700 28px Manrope,sans-serif";
    if (owner) ctx.fillText(owner.slice(0, 80), 540, 1103, 840);
    ctx.font = "500 23px Manrope,sans-serif";
    const date =
      earnedAt !== undefined && Number.isFinite(earnedAt)
        ? new Intl.DateTimeFormat(uiLocale()).format(new Date(earnedAt))
        : uiText("Data não registrada");
    ctx.fillText(uiText("Obtida em") + ": " + date, 540, 1143, 840);
    ctx.drawImage(favicon, 222, 1211, 78, 78);
    ctx.drawImage(brand, 325, 1219, 530, 84);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(Error("PNG unavailable"))),
        "image/png",
      ),
    );
    return new File([blob], `olenastudy-arcano-${id}.png`, { type: "image/png" });
  } finally {
    preparing = false;
  }
}
