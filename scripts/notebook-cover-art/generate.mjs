// Fontes originais de papel recortado, sem dependências de renderização WebGL.
import { writeFileSync } from "node:fs";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import {
  COVER_UNITS,
  paintCoverArt,
  paintBackArt,
  paintPrideArt,
} from "../../src/components/notebook-cover-paint.ts";
GlobalFonts.registerFromPath("public/fonts/manrope-latin-800-normal.woff2", "Manrope");
for (const theme of ["stars", "mathematics", "english", "pride"]) {
  const canvas = createCanvas(COVER_UNITS.width, COVER_UNITS.height);
  if (theme === "stars") paintCoverArt(canvas.getContext("2d"), false);
  else if (theme === "pride") paintPrideArt(canvas.getContext("2d"));
  else {
    const image = await loadImage(`scripts/notebook-cover-art/sources/${theme}.png`);
    canvas.getContext("2d").drawImage(image, 0, 0, COVER_UNITS.width, COVER_UNITS.height);
  }
  writeFileSync(
    `public/notebook-covers/capa-${theme === "stars" ? "estrelas" : theme}.webp`,
    canvas.toBuffer("image/webp", 86),
  );
  if (theme !== "stars") {
    const spine = createCanvas(96, COVER_UNITS.height);
    spine
      .getContext("2d")
      .drawImage(canvas, 0, 0, 96, COVER_UNITS.height, 0, 0, 96, COVER_UNITS.height);
    writeFileSync(`public/notebook-covers/lombada-${theme}.webp`, spine.toBuffer("image/webp", 90));
  }
  if (theme === "pride") paintPrideArt(canvas.getContext("2d"), true);
  else paintBackArt(canvas.getContext("2d"), theme);
  writeFileSync(`public/notebook-covers/verso-${theme}.webp`, canvas.toBuffer("image/webp", 86));
}
