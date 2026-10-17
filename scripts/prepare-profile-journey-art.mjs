import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Ferramenta de preparo opcional, sem dependência de runtime do aplicativo.
const sharp = createRequire(import.meta.url)("sharp");

const names = ["identity", "avatar", "cover", "complete"];
const inputs = process.argv.slice(2);
if (inputs.length !== names.length) throw new Error("Informe os quatro PNGs originais da jornada.");
const directory = new URL("../public/profile-journey/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const [index, name] of names.entries()) {
  const image = sharp(inputs[index]);
  if (!(await image.metadata()).hasAlpha)
    throw new Error(`A arte ${name} precisa de transparência.`);
  await image
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(fileURLToPath(new URL(`helena-${name}.webp`, directory)));
  console.log(`Arte preparada: helena-${name}.webp`);
}
