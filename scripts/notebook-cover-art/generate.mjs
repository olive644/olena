// Gera a capa única do caderno em WebP para a estante e a vitrine 2D, com o mesmo desenho que a
// cena 3D usa (src/components/notebook-3d/notebook-cover-paint.ts).
// Uso: node scripts/notebook-cover-art/generate.mjs
// Requer @napi-rs/canvas, que já vem como dependência opcional do leitor PDF (pdfjs-dist).
import { writeFileSync, statSync } from "node:fs";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import {
  COVER_UNITS,
  paintCoverArt,
} from "../../src/components/notebook-3d/notebook-cover-paint.ts";

GlobalFonts.registerFromPath("public/fonts/manrope-latin-800-normal.woff2", "Manrope");
const canvas = createCanvas(COVER_UNITS.width, COVER_UNITS.height);
// A vitrine 2D recorta os cantos com CSS; a arte sai com o fundo inteiro.
paintCoverArt(canvas.getContext("2d"), false);
const file = "public/notebook-covers/capa-estrelas.webp";
writeFileSync(file, canvas.toBuffer("image/webp", 86));
console.log(file, statSync(file).size, "bytes");
