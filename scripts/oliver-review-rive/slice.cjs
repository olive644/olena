// Prepara camadas da pose nova para Rive, preservando a arte de referência.
const fs = require("node:fs");
const path = require("node:path");
const T = require("../oliver-rive/image-tools.cjs");
const SOURCE = path.resolve(__dirname, "../../artifacts/math-oliver-review/oliver-tutor-v1.png");
const OUTPUT = path.resolve(__dirname, "../../public/oliver-math-review");
const LAYERS = path.join(__dirname, "layers");

(async () => {
  const { w, h, data } = await T.loadRGBA(SOURCE);
  fs.mkdirSync(LAYERS, { recursive: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  const visible = new Uint8Array(w * h);
  for (let i = 0; i < visible.length; i++) visible[i] = data[i * 4 + 3] > 30 ? 1 : 0;
  const cc = T.components(visible, w, h);
  const main = cc.list.sort((a, b) => b.n - a.n)[0];
  // Descarta resíduos desconectados durante a extração do personagem, sem editar a referência.
  const silhouette = T.and(
    T.dilate(T.maskOfLabel(cc.lab, main.id), w, h, 3),
    Uint8Array.from(visible, (_, i) => (data[i * 4 + 3] > 0 ? 1 : 0)),
  );
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < dark.length; i++) {
    const y = Math.floor(i / w),
      x = i % w;
    dark[i] =
      silhouette[i] &&
      y > 380 &&
      y < 760 &&
      x > 400 &&
      x < 900 &&
      Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < 70
        ? 1
        : 0;
  }
  const fc = T.components(dark, w, h);
  const face = fc.list.sort((a, b) => b.n - a.n).slice(0, 3);
  const mouth = face[0];
  const eyes = face.slice(1).sort((a, b) => a.x0 - b.x0);
  const masks = {
    mouth: T.and(silhouette, T.dilate(T.maskOfLabel(fc.lab, mouth.id), w, h, 4)),
    eyeL: T.and(silhouette, T.dilate(T.maskOfLabel(fc.lab, eyes[0].id), w, h, 4)),
    eyeR: T.and(silhouette, T.dilate(T.maskOfLabel(fc.lab, eyes[1].id), w, h, 4)),
  };
  let holes = new Uint8Array(w * h);
  for (const mask of Object.values(masks)) holes = T.or(holes, mask);
  const hand = T.and(
    silhouette,
    T.polyMask(w, h, [
      [928, 651],
      [950, 676],
      [967, 678],
      [991, 629],
      [1000, 530],
      [1253, 510],
      [1253, 818],
      [974, 818],
      [935, 793],
      [912, 762],
    ]),
  );
  const footL = T.and(
    silhouette,
    T.polyMask(w, h, [
      [344, 881],
      [383, 852],
      [438, 843],
      [486, 855],
      [517, 872],
      [541, 895],
      [565, 922],
      [585, 953],
      [611, 993],
      [635, 1030],
      [635, 1120],
      [350, 1120],
      [344, 1024],
      [344, 937],
    ]),
  );
  const footR = T.and(
    silhouette,
    T.polyMask(w, h, [
      [797, 884],
      [832, 854],
      [865, 836],
      [919, 823],
      [973, 824],
      [1028, 837],
      [1089, 872],
      [1145, 909],
      [1160, 1120],
      [759, 1120],
      [744, 1034],
      [757, 958],
    ]),
  );
  const feet = T.or(footL, footR);
  const handL = T.minus(
    T.and(
      silhouette,
      T.polyMask(w, h, [
        [0, 765],
        [270, 765],
        [365, 915],
        [325, 1120],
        [0, 1120],
      ]),
    ),
    feet,
  );
  const limbs = T.or(T.or(hand, handL), feet);
  const bodyMask = T.minus(silhouette, limbs);
  const tabs = T.and(T.erode(silhouette, w, h, 3), T.and(limbs, T.dilate(bodyMask, w, h, 30)));
  const bodyPixels = T.inpaint(data, w, h, holes, 40, T.minus(bodyMask, holes));
  const bodyWithTabs = T.inpaint(bodyPixels, w, h, tabs, 25, bodyMask);
  for (let i = 0; i < tabs.length; i++) if (holes[i] || tabs[i]) bodyWithTabs[i * 4 + 3] = 255;
  const meta = {
    width: w,
    height: h,
    source: "artifacts/math-oliver-review/oliver-tutor-v1.png",
    order: [],
    layers: {},
    mouthContour: [],
  };
  for (let point = 0; point < 18; point++) {
    const x = Math.round(mouth.x0 + 2 + ((mouth.x1 - mouth.x0 - 4) * point) / 17);
    const ys = [];
    for (let y = mouth.y0; y <= mouth.y1; y++)
      if (dark[y * w + x] && fc.lab[y * w + x] === mouth.id) ys.push(y);
    if (!ys.length) throw new Error(`No mouth sample at ${x}`);
    meta.mouthContour.push({
      x: x - (mouth.x0 + mouth.x1) / 2,
      top: Math.min(...ys) - (mouth.y0 + mouth.y1) / 2,
      bottom: Math.max(...ys) - (mouth.y0 + mouth.y1) / 2,
    });
  }
  function put(name, pixels, mask, pivot) {
    const cut = T.cutLayer(pixels, w, h, mask);
    if (!cut) throw new Error(`Empty layer: ${name}`);
    const file = `${name}.png`;
    T.savePNG(path.join(LAYERS, file), cut.w, cut.h, cut.data);
    meta.order.push(name);
    meta.layers[name] = { file, x0: cut.x0, y0: cut.y0, w: cut.w, h: cut.h, pivot };
  }
  put("body", bodyWithTabs, T.or(bodyMask, tabs), [630, 1050]);
  put("footL", data, footL, [460, 890]);
  put("footR", data, footR, [848, 900]);
  put("handL", data, handL, [345, 820]);
  put("handR", data, hand, [941, 746]);
  for (const [name, mask] of Object.entries(masks)) {
    const info = name === "mouth" ? mouth : name === "eyeL" ? eyes[0] : eyes[1];
    put(name, data, mask, [(info.x0 + info.x1) / 2, (info.y0 + info.y1) / 2]);
  }
  const clean = Uint8ClampedArray.from(data);
  for (let i = 0; i < silhouette.length; i++) if (!silhouette[i]) clean[i * 4 + 3] = 0;
  T.savePNG(path.join(OUTPUT, "oliver.png"), w, h, clean);
  fs.writeFileSync(path.join(LAYERS, "layers.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(JSON.stringify({ width: w, height: h, layers: meta.order, sourcePreserved: true }));
})();
