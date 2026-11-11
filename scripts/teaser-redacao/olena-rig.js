// Boneco articulado da Olena, montado com as camadas do mascote aprovado (as mesmas do Rive):
// cabeça, duas orelhas, estrelinha, duas írises e duas pupilas. Cada peça gira ou escala em volta
// do próprio pivô, então ela respira, pisca, mexe as orelhas, olha para onde se pede e faz
// squash e stretch. Nada é redesenhado: é a arte original em movimento.
const BASE = "/scripts/teaser-redacao/assets/";

export async function loadOlena() {
  const meta = await (await fetch(BASE + "layers.json")).json();
  const images = {};
  await Promise.all(
    Object.entries(meta.layers).map(
      ([name, layer]) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            images[name] = image;
            resolve();
          };
          image.onerror = () => reject(new Error("camada: " + name));
          image.src = BASE + layer.file;
        }),
    ),
  );
  return { meta, images };
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/**
 * Pose: { x, y, size, rot, sx, sy, earL, earR, star, blink (0 a 1), lookX, lookY (-1 a 1) }
 * x e y são o centro da cabeça na tela; size é a largura da arte (512 = tamanho original).
 */
export function drawOlena(ctx, rig, pose) {
  const { meta, images } = rig;
  const p = { rot: 0, sx: 1, sy: 1, earL: 0, earR: 0, star: 1, blink: 0, lookX: 0, lookY: 0, ...pose };
  const k = p.size / 512;
  const piv = meta.pivots;
  const place = (name) => {
    const layer = meta.layers[name];
    ctx.drawImage(images[name], layer.x, layer.y);
  };
  const around = (cx, cy, fn) => {
    ctx.save();
    ctx.translate(cx, cy);
    fn();
    ctx.restore();
  };

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  // squash e stretch pelo queixo, para ela "pousar" no lugar
  const chin = [242, 470];
  ctx.translate(chin[0], chin[1]);
  ctx.scale(p.sx, p.sy);
  ctx.translate(-chin[0], -chin[1]);
  ctx.translate(-242, -285);
  ctx.shadowColor = "rgba(41,36,50,0.2)";
  ctx.shadowBlur = 24 / k;
  ctx.shadowOffsetY = 12 / k;

  around(piv.earL[0], piv.earL[1], () => {
    ctx.rotate(p.earL);
    ctx.translate(-piv.earL[0], -piv.earL[1]);
    place("earL");
  });
  around(piv.earR[0], piv.earR[1], () => {
    ctx.rotate(p.earR);
    ctx.translate(-piv.earR[0], -piv.earR[1]);
    place("earR");
  });
  place("head");
  ctx.shadowColor = "transparent";
  // a estrelinha fica na orelha direita: gira com ela e pulsa em volta do próprio centro
  around(piv.earR[0], piv.earR[1], () => {
    ctx.rotate(p.earR);
    const star = meta.layers.earStar;
    around(star.cx - piv.earR[0], star.cy - piv.earR[1], () => {
      ctx.scale(p.star, p.star);
      ctx.translate(-(star.cx - piv.earR[0]), -(star.cy - piv.earR[1]));
      ctx.translate(-piv.earR[0], -piv.earR[1]);
      place("earStar");
    });
  });

  // olhos: a írise fecha em Y; a pupila anda pelo olho e some quando o olho fecha
  const open = 1 - clamp(p.blink);
  for (const [eye, iris, pupil] of [
    ["eyeL", "irisL", "pupilL"],
    ["eyeR", "irisR", "pupilR"],
  ]) {
    const [ex, ey] = piv[eye];
    if (open < 0.12) continue;
    around(ex, ey, () => {
      ctx.scale(1, Math.max(0.05, open));
      ctx.translate(-ex, -ey);
      place(iris);
      ctx.save();
      ctx.translate(p.lookX * 15, p.lookY * 11);
      place(pupil);
      ctx.restore();
    });
  }
  ctx.restore();
}
