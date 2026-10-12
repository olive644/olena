import * as THREE from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
const stage = document.querySelector("#stage"),
  canvas = document.querySelector("#scene"),
  hint = document.querySelector("#hint"),
  pause = document.querySelector("#pause"),
  status = document.querySelector("#status"),
  progress = document.querySelector("#progress");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let hostReduced = false,
  hostVisible = true,
  hostOpen = false;
const clamp = THREE.MathUtils.clamp,
  lerp = THREE.MathUtils.lerp;
function smooth(a, b, x) {
  x = clamp((x - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}
function pulse(t, a, b, c, d) {
  return smooth(a, b, t) * (1 - smooth(c, d, t));
}
let software = false;
const mobile = matchMedia("(pointer: coarse)").matches;
let animationFrame = 0;
let notified = false;
let renderer,
  root,
  head,
  star,
  eyes = [],
  ready = false,
  paused = false,
  hover = false,
  drag = null;
let clock = 0,
  last = performance.now(),
  form = 0,
  formSince = 0,
  shape = 0,
  transition = null,
  activity = 0,
  releaseAt = -20;
let gazeX = 0,
  gazeY = 0,
  dragLean = 0,
  energy = 0,
  loadError = false;
const pointer = { x: 0, y: 0 },
  pos = { x: 0, y: 0, vx: 0, vy: 0 },
  target = { x: 0, y: 0 };
const scene = new THREE.Scene();
scene.background = null;
const camera = new THREE.OrthographicCamera(-1.38, 1.38, 1.38, -1.38, 0.1, 40);
camera.position.set(0.12, 1.05, 8.5);
camera.lookAt(0, 0.05, 0);
scene.add(new THREE.HemisphereLight(0xfff4e1, 0x736078, 1.75));
function light(color, intensity, p) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(...p);
  scene.add(l);
  return l;
}
light(0xffdfb6, 3, [-3, 4.5, 4]);
light(0xb495ff, 2.7, [3, 2, -3]);
light(0xfffaf0, 0.9, [3, 1, 4]);
// Soft layered contact shadow: concentrates as she comes down, spreads when lifted.
function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d"),
    g = x.createRadialGradient(128, 128, 0, 128, 128, 124);
  g.addColorStop(0, "rgba(69,35,82,.32)");
  g.addColorStop(0.28, "rgba(95,49,88,.16)");
  g.addColorStop(0.6, "rgba(123,90,100,.045)");
  g.addColorStop(1, "rgba(123,90,100,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(2.45, 0.55),
  new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.set(0, -0.8, 0);
scene.add(shadow);
const dark = new THREE.Color("#211829"),
  gold = new THREE.Color("#ffcd16");
// Small real 3D sparkles, kept around the silhouette rather than over the face.
const sparkGeometry = new THREE.BufferGeometry();
const points = [];
for (let i = 0; i < 10; i++) {
  const a = Math.PI / 2 + (i * Math.PI) / 5,
    r = i % 2 ? 0.052 : 0.11;
  points.push(Math.cos(a) * r, Math.sin(a) * r, 0);
}
const triangles = [];
for (let i = 0; i < 10; i++)
  triangles.push(
    0,
    0,
    0,
    ...points.slice(i * 3, i * 3 + 3),
    ...points.slice(((i + 1) % 10) * 3, ((i + 1) % 10) * 3 + 3),
  );
sparkGeometry.setAttribute("position", new THREE.Float32BufferAttribute(triangles, 3));
sparkGeometry.computeVertexNormals();
const sparks = Array.from({ length: 7 }, (_, i) => {
  const mesh = new THREE.Mesh(
    sparkGeometry,
    new THREE.MeshBasicMaterial({
      color: i % 2 ? 0xc399ff : 0xffd344,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
});
function velvet(mesh) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d"),
    data = x.createImageData(128, 128);
  let seed = 644;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = 155 + (seed >>> 24) * 0.32;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  x.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const position = mesh.geometry.attributes.position,
    uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const px = position.getX(i),
      py = position.getY(i),
      pz = position.getZ(i),
      r = Math.hypot(px, py, pz) || 1;
    uv[i * 2] = 0.5 + Math.atan2(pz, px) / (Math.PI * 2);
    uv[i * 2 + 1] = 0.5 + Math.asin(clamp(py / r, -1, 1)) / Math.PI;
  }
  mesh.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  mesh.material.bumpMap = texture;
  mesh.material.bumpScale = 0.004;
  mesh.material.needsUpdate = true;
}
function morph(mesh, name, value) {
  const i = mesh.morphTargetDictionary?.[name];
  if (i !== undefined) mesh.morphTargetInfluences[i] = value;
}
function blinkEye(e, c) {
  for (const o of e.children) {
    if (o.name.startsWith("Pálpebra")) {
      o.visible = c > 0.004 && c < 0.996;
      for (let i = 1; i <= 8; i++)
        morph(o, `Pálpebra ${i}/8`, Math.max(0, 1 - Math.abs(c - i / 8) * 8));
    } else if (o.name.startsWith("Contorno")) o.visible = c > 0.92;
    else o.visible = c < 0.93;
  }
}
function startTransform(to, manual = false) {
  if (!ready) return;
  activity = manual ? clock : activity;
  if (reduced.matches || hostReduced) {
    form = shape = to;
    transition = null;
    formSince = clock;
    apply(clock, 0);
    return;
  }
  transition = { at: clock, from: shape, to, duration: 0.94 };
  hint.textContent = to ? "Um brilho… e ela aparece ✨" : "Preparar… virar estrela! ✨";
  status.textContent = to ? "Helena aparece." : "Helena se transforma em estrela.";
}
function toggle() {
  const to = transition ? 1 - transition.to : shape > 0.5 ? 0 : 1;
  startTransform(to, true);
}
function apply(t, dt) {
  const quiet = t - activity,
    still = !drag && quiet > 1.3,
    idle = still ? Math.min(1, (quiet - 1.3) / 0.8) : 0;
  let tx = 1,
    ty = 1,
    tz = 1,
    turn = 0,
    lift = 0,
    anticipation = 0,
    burst = 0,
    transformBlink = 0;
  if (!hostOpen && !transition && !paused && !(reduced.matches || hostReduced) && !drag) {
    if (form === 0 && t - formSince > 2.8) startTransform(1);
    else if (form === 1 && t - formSince > 13 && quiet > 3.5 && !hover) startTransform(0);
  }
  if (transition) {
    const p = (t - transition.at) / transition.duration,
      to = transition.to;
    const squash = pulse(p, 0, 0.14, 0.18, 0.34);
    anticipation = squash;
    const morphTime = smooth(0.2, 0.68, p);
    shape = lerp(transition.from, to, morphTime);
    const pop = pulse(p, 0.45, 0.64, 0.7, 0.99);
    const settle = p > 0.68 ? Math.sin((p - 0.68) * Math.PI * 5) * Math.exp(-(p - 0.68) * 8) : 0;
    tx = 1 + 0.17 * squash - 0.1 * pop + 0.06 * settle;
    ty = 1 - 0.16 * squash + 0.19 * pop - 0.055 * settle;
    tz = 1 + 0.06 * squash;
    turn = (to ? -0.13 : 0.15) * squash + (to ? 0.08 : -0.12) * pop + 0.035 * settle;
    lift = 0.07 * pop;
    burst = pulse(p, 0.47, 0.63, 0.75, 1.18);
    transformBlink = to ? 1 - smooth(0.66, 0.88, p) : smooth(0, 0.16, p);
    if (p >= 1) {
      form = shape = to;
      formSince = t;
      transition = null;
      hint.textContent = "Passe o mouse · arraste para brincar";
    }
  } else shape = form;
  if (reduced.matches || hostReduced) {
    tx = ty = tz = 1;
    turn = lift = anticipation = burst = transformBlink = 0;
  }
  const headAmount = smooth(0.05, 0.95, shape),
    starAmount = 1 - headAmount;
  const idleTime = (t - formSince) % 12;
  const curious = pulse(idleTime, 0.7, 1.05, 1.8, 2.25) * idle;
  const nod = pulse(idleTime, 3.0, 3.25, 4.0, 4.35) * idle;
  const sleepy = pulse(idleTime, 6.3, 6.7, 7.65, 8.15) * idle;
  const happy = pulse(idleTime, 9.1, 9.4, 10.0, 10.45) * idle;
  const wake = pulse(idleTime, 8.05, 8.3, 8.5, 8.95) * idle;
  const breathe = reduced.matches || hostReduced ? 0 : Math.sin(t * 2.0);
  const released = pulse(t - releaseAt, 0, 0.07, 0.38, 0.85);
  const speed = clamp(Math.hypot(pos.vx, pos.vy), 0, 8);
  energy += ((drag ? speed / 8 : 0) - energy) * (1 - Math.exp(-12 * dt));
  dragLean += (clamp(pos.vx * 0.04, -0.34, 0.34) - dragLean) * (1 - Math.exp(-10 * dt));
  const wobble = drag
    ? 0.05 * Math.sin(t * 16) * energy
    : released * 0.055 * Math.sin((t - releaseAt) * 15);
  // Independent ear follow-through: delayed wobble, curious tilt and happy perk.
  const earLeft =
    shape *
    clamp(
      0.08 +
        0.64 * curious +
        0.65 * sleepy +
        0.24 * anticipation +
        (drag ? 0.6 + 0.25 * Math.sin(t * 11) : 0) +
        released * 0.45 * Math.sin((t - releaseAt) * 11),
      -0.2,
      1.15,
    );
  const earRight =
    shape *
    clamp(
      0.06 +
        0.48 * happy +
        0.56 * sleepy +
        0.2 * anticipation +
        (drag ? 0.45 + 0.22 * Math.sin(t * 11 - 1) : 0) +
        released * 0.35 * Math.sin((t - releaseAt) * 11 - 1),
      -0.2,
      1.15,
    );
  const cheek = reduced.matches || hostReduced ? 0 : 0.7 * happy;
  morph(
    head,
    "Cabeça da Helena, orelhas fundidas",
    shape - (reduced.matches || hostReduced ? 0 : earLeft + earRight) - cheek,
  );
  morph(head, "Orelhas, reação suave", 0);
  morph(head, "Orelha esquerda, cartoon", reduced.matches || hostReduced ? 0 : earLeft);
  morph(head, "Orelha direita, cartoon", reduced.matches || hostReduced ? 0 : earRight);
  morph(head, "Bochechas, sorriso sem boca", cheek);
  head.material.color.copy(gold).lerp(dark, smooth(0.22, 0.9, shape));
  head.material.roughness = lerp(0.29, 0.69, shape);
  if (head.material.isMeshPhysicalMaterial) {
    head.material.clearcoat = lerp(0.23, 0.025, shape);
    head.material.specularIntensity = lerp(0.4, 0.32, shape);
    head.material.sheen = 0.12 * headAmount;
    head.material.sheenColor.set("#77577c");
    head.material.sheenRoughness = 0.8;
  }
  head.material.metalness = 0.015;
  head.material.bumpScale = 0.004 * headAmount;
  let blinkL = 0,
    blinkR = 0;
  const b = (t + 0.45) % 3.45;
  if (b < 0.26) blinkL = blinkR = b < 0.095 ? smooth(0, 0.095, b) : 1 - smooth(0.125, 0.26, b);
  const double = idleTime - 2.35;
  if (idle && double > 0 && double < 0.52) {
    const p = double % 0.26;
    blinkL = blinkR = Math.max(
      blinkL,
      (p < 0.09 ? smooth(0, 0.09, p) : 1 - smooth(0.12, 0.26, p)) * idle,
    );
  }
  const sleepClose = smooth(0.05, 0.35, sleepy),
    winkClose = smooth(0.05, 0.35, happy);
  blinkL = Math.max(blinkL, sleepClose, winkClose);
  blinkR = Math.max(blinkR, sleepClose);
  // Drag expression uses a small eye stretch; blink geometry stays reserved for full blinks.
  if (transition || shape < 0.995)
    blinkL = blinkR = Math.max(transformBlink, shape < 0.985 ? 1 : 0);
  if (reduced.matches || hostReduced) blinkL = blinkR = 0;
  const targetGazeX =
    hover || drag
      ? pointer.x
      : idle
        ? lerp(-0.8, 0.7, smooth(0.6, 4.5, idleTime))
        : 0.22 * Math.sin(t * 0.9);
  const targetGazeY = drag ? 0.45 : curious * 0.4 + wake * 0.4 - sleepy * 0.18;
  const follow = reduced.matches || hostReduced ? 1 : 1 - Math.exp(-11 * dt);
  gazeX += (targetGazeX - gazeX) * follow;
  gazeY += (targetGazeY - gazeY) * follow;
  for (const e of eyes) {
    const left = e.name.includes("esquerda"),
      reveal = smooth(0.94, 0.995, shape),
      wide = 1 + 0.075 * wake + 0.025 * curious;
    e.scale.set(
      Math.max(0.00001, reveal * wide),
      Math.max(0.00001, reveal * (wide - 0.04 * happy - (drag ? 0.06 : 0))),
      Math.max(0.00001, reveal),
    );
    blinkEye(e, left ? blinkL : blinkR);
    for (const o of e.children) {
      morph(o, "Olhar esquerda", Math.max(0, -gazeX));
      morph(o, "Olhar direita", Math.max(0, gazeX));
      morph(o, "Olhar cima", Math.max(0, gazeY));
      morph(o, "Olhar baixo", Math.max(0, -gazeY));
    }
  }
  star.scale.setScalar(Math.max(0.00001, smooth(0.945, 0.995, shape)));
  star.position.copy(star.userData.anchor);
  star.position.x -= 0.075 * earRight;
  star.position.y -= 0.058 * earRight;
  if (!drag && dt > 0) {
    const steps = Math.ceil(dt / 0.016),
      step = dt / steps;
    for (let n = 0; n < steps; n++) {
      pos.vx += (target.x - pos.x) * 78 * step;
      pos.vy += (target.y - pos.y) * 78 * step;
      pos.vx *= Math.exp(-9 * step);
      pos.vy *= Math.exp(-9 * step);
      pos.x += pos.vx * step;
      pos.y += pos.vy * step;
    }
  }
  const hop =
    starAmount * (0.045 + 0.045 * Math.sin(t * 3.4)) +
    headAmount * (0.032 * breathe + 0.065 * nod * Math.sin(idleTime * 15) + 0.12 * wake);
  const spinPhase = (t - formSince) % 5.2;
  const starSpin =
    !transition && form === 0 && spinPhase > 0.75 && spinPhase < 1.45
      ? Math.PI * 2 * smooth(0.75, 1.45, spinPhase)
      : 0;
  const starSway = starAmount * (0.065 * Math.sin(t * 2.6) + 0.025 * Math.sin(t * 5.2));
  const idleRoll =
    headAmount * (-0.11 * curious + 0.095 * happy + 0.045 * sleepy * Math.sin(t * 0.8));
  root.position.set(
    pos.x,
    pos.y + (reduced.matches || hostReduced ? 0 : hop + lift - 0.045 * sleepy),
    0,
  );
  root.rotation.set(
    0.025 +
      (reduced.matches || hostReduced
        ? 0
        : headAmount * (0.07 * sleepy + 0.055 * nod * Math.sin(idleTime * 15))) +
      (hover ? gazeY * 0.05 : 0),
    0.045 + (hover || drag ? gazeX * 0.14 : headAmount * 0.055 * Math.sin(t * 0.65)),
    lerp(-0.548, -0.1, shape) +
      (reduced.matches || hostReduced
        ? 0
        : turn +
          starSway +
          starSpin +
          idleRoll +
          (drag ? dragLean : released * 0.08 * Math.sin((t - releaseAt) * 12)) +
          wobble),
    "XYZ",
  );
  const dragStretch = drag ? energy * 0.1 : 0,
    breathScale = reduced.matches || hostReduced ? 0 : headAmount * 0.012 * breathe;
  const starBounce = reduced.matches || hostReduced ? 0 : starAmount * 0.035 * Math.sin(t * 3.4);
  root.scale.set(
    0.63 * tx * (1 + breathScale - dragStretch + 0.05 * happy - starBounce),
    0.63 * ty * (1 - breathScale + dragStretch - 0.045 * happy + starBounce),
    0.63 * tz,
  );
  const height = root.position.y;
  shadow.position.x = pos.x * 0.65;
  shadow.scale.set(1 + Math.max(0, height) * 0.28, 1 + Math.max(0, height) * 0.25, 1);
  shadow.material.opacity = clamp(0.95 - height * 0.65, 0.25, 1);
  sparks.forEach((s, i) => {
    const twinkle = starAmount * 0.38 * pulse((t + i * 0.47) % 3.4, 0.1, 0.55, 0.65, 1.0),
      amount = reduced.matches || hostReduced ? 0 : Math.max(burst, twinkle);
    s.visible = amount > 0.015;
    if (!s.visible) return;
    const a = (i * Math.PI * 2) / 7 + t * 0.45,
      r = 0.95 + burst * 0.3;
    s.position.set(pos.x + Math.cos(a) * r, pos.y + 0.08 + Math.sin(a) * r, 0.25);
    s.scale.setScalar(amount * (i % 2 ? 0.5 : 0.7));
    s.rotation.z = t * (i % 2 ? 1 : -1);
    s.material.opacity = amount * 0.75;
  });
  progress.style.width = `${transition ? clamp((t - transition.at) / 0.94, 0, 1) * 100 : clamp((t - formSince) / (form ? 13 : 2.8), 0, 1) * 100}%`;
  stage.dataset.form = shape > 0.995 ? "helena" : shape < 0.005 ? "star" : "transforming";
  stage.dataset.behavior = drag
    ? "dragging"
    : transition
      ? "transforming"
      : hover && quiet < 1.3
        ? "following"
        : still
          ? "resting"
          : "idle";
  stage.dataset.pose = transition
    ? "transforming"
    : shape < 0.05
      ? "star"
      : drag
        ? "drag"
        : sleepy > 0.8
          ? "sleep"
          : happy > 0.8
            ? "wink"
            : curious > 0.5
              ? "curious"
              : nod > 0.3
                ? "nod"
                : wake > 0.4
                  ? "wake"
                  : "breathing";
  stage.dataset.offset = `${pos.x.toFixed(3)},${pos.y.toFixed(3)}`;
}
function resumeRendering() {
  if (!animationFrame && ready && hostVisible && !document.hidden) {
    last = performance.now();
    animationFrame = requestAnimationFrame(tick);
  }
}
function tick(now) {
  animationFrame = 0;
  if (!ready || !hostVisible || document.hidden) return;
  animationFrame = requestAnimationFrame(tick);
  const busy = hover || drag || transition;
  const fps = !busy && software ? 12 : !busy && mobile ? 18 : 30;
  if (now - last < 1000 / fps) return;
  const elapsed = Math.min(0.25, (now - last) / 1000),
    dt = elapsed;
  last = now;
  if (!ready || !hostVisible || document.hidden) return;
  if (!paused && !(reduced.matches || hostReduced)) clock += elapsed;
  apply(clock, paused || reduced.matches || hostReduced ? 0 : dt);
  renderer.render(scene, camera);
  stage.dataset.time = clock.toFixed(2);
  if (!notified) {
    notified = true;
    window.parent.postMessage({ type: "helena-ready", ready: true }, location.origin);
  }
}
function coords(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
  pointer.y = clamp(1 - ((e.clientY - r.top) / r.height) * 2, -1, 1);
  activity = clock;
  return r;
}
canvas.addEventListener("pointerenter", (e) => {
  if (e.pointerType === "mouse") {
    hover = true;
    coords(e);
    hint.textContent = "Ela está de olho em você 👀";
  }
});
canvas.addEventListener("pointerleave", () => {
  if (!drag) {
    hover = false;
    hint.textContent = "Passe o mouse · arraste para brincar";
  }
});
canvas.addEventListener("pointerdown", (e) => {
  if (!ready || e.button !== 0) return;
  coords(e);
  drag = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    startX: pos.x,
    startY: pos.y,
    moved: false,
  };
  canvas.setPointerCapture(e.pointerId);
  hint.textContent = "Segure… e solte!";
});
canvas.addEventListener("pointermove", (e) => {
  const r = coords(e);
  if (drag && drag.id === e.pointerId) {
    const dx = ((e.clientX - drag.x) / r.width) * 4.7,
      dy = (-(e.clientY - drag.y) / r.height) * 4.7;
    drag.moved ||= Math.abs(dx) + Math.abs(dy) > 0.075;
    const nx = clamp(drag.startX + dx, -0.88, 0.88),
      ny = clamp(drag.startY + dy, -0.3, 0.72);
    pos.vx = lerp(pos.vx, (nx - pos.x) * 25, 0.6);
    pos.vy = lerp(pos.vy, (ny - pos.y) * 25, 0.6);
    pos.x = nx;
    pos.y = ny;
  }
});
function release(e) {
  if (!drag || drag.id !== e.pointerId) return;
  const moved = drag.moved;
  drag = null;
  target.x = target.y = 0;
  pos.vx = clamp(pos.vx, -3, 3);
  pos.vy = clamp(pos.vy, -3, 3);
  releaseAt = clock;
  if (reduced.matches || hostReduced) pos.x = pos.y = pos.vx = pos.vy = 0;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  if (e.type !== "pointercancel" && !moved) toggle();
  else hint.textContent = "Boing! De volta ao lugar ✨";
  if (e.pointerType !== "mouse") hover = false;
  activity = clock;
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
canvas.addEventListener("lostpointercapture", () => {
  if (drag) {
    drag = null;
    target.x = target.y = 0;
    releaseAt = clock;
  }
});
canvas.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(e.key)) return;
  e.preventDefault();
  activity = clock;
  if (e.key === "Enter" || e.key === " ") toggle();
  else {
    pos.x = clamp(
      pos.x + (e.key === "ArrowLeft" ? -0.2 : e.key === "ArrowRight" ? 0.2 : 0),
      -0.88,
      0.88,
    );
    pos.y = clamp(
      pos.y + (e.key === "ArrowUp" ? 0.2 : e.key === "ArrowDown" ? -0.2 : 0),
      -0.3,
      0.72,
    );
    releaseAt = clock;
  }
});
pause.onclick = () => {
  paused = !paused;
  pause.textContent = paused ? "Continuar animação" : "Pausar animação";
  pause.setAttribute("aria-pressed", String(paused));
};
document.querySelector("#replay").onclick = () => {
  clock = formSince = activity = 0;
  form = shape = 0;
  transition = null;
  paused = false;
  releaseAt = -20;
  pos.x = pos.y = pos.vx = pos.vy = 0;
  gazeX = gazeY = 0;
  pause.textContent = "Pausar animação";
  pause.setAttribute("aria-pressed", "false");
  last = performance.now();
  if (ready) apply(0, 0);
  status.textContent = "Ciclo reiniciado.";
};
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const context = renderer.getContext();
  const debug = context.getExtension("WEBGL_debug_renderer_info");
  software =
    !!debug &&
    /swiftshader|llvmpipe|softpipe|software/i.test(
      String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL)),
    );
  renderer.setPixelRatio(software ? 1 : Math.min(devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const resize = () => renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  new ResizeObserver(resize).observe(stage);
  resize();
  const gltf = await new GLTFLoader().loadAsync("./helena.glb?v=1");
  root = gltf.scene.children[0];
  scene.add(root);
  root.traverse((o) => {
    if (o.name.startsWith("Cabeça")) head = o;
    if (o.name.startsWith("Estrela")) star = o;
    if (o.name.startsWith("Revelação")) eyes.push(o);
    if (o.isMesh) {
      o.frustumCulled = false;
      if (software) {
        const original = o.material;
        o.material = new THREE.MeshLambertMaterial({
          color: original.color,
          map: original.map,
          transparent: original.transparent,
          opacity: original.opacity,
          side: THREE.DoubleSide,
        });
        original.dispose();
      }
      if (mobile && !software) {
        const original = o.material;
        o.material = new THREE.MeshStandardMaterial({
          color: original.color,
          map: original.map,
          roughness: original.roughness,
          metalness: original.metalness,
          transparent: original.transparent,
          opacity: original.opacity,
        });
        original.dispose();
      }
      o.material.side = THREE.DoubleSide;
      if (o.name.startsWith("Pupila")) {
        o.material.roughness = 0.38;
        if (o.material.isMeshPhysicalMaterial) o.material.clearcoat = 0.09;
        if (o.material.isMeshPhysicalMaterial) o.material.specularIntensity = 0.16;
      }
      if (o.name.startsWith("Íris")) {
        o.material.color.set("#ffce13");
        o.material.roughness = 0.37;
        if (o.material.isMeshPhysicalMaterial) o.material.specularIntensity = 0.3;
        if (o.material.isMeshPhysicalMaterial) o.material.clearcoat = 0.09;
      }
      if (o.name.startsWith("Pálpebra")) {
        o.material.color.copy(dark);
        o.material.roughness = 0.69;
        if (o.material.isMeshPhysicalMaterial) o.material.clearcoat = 0.025;
        if (o.material.isMeshPhysicalMaterial) o.material.specularIntensity = 0.32;
      }
    }
  });
  if (!mobile && !software) velvet(head);
  star.userData.anchor = star.position.clone();
  ready = true;
  stage.classList.add("ready");
  stage.dataset.ready = "true";
  if (hostOpen) startTransform(1, true);
  reduced.addEventListener("change", () => {
    if (reduced.matches || hostReduced) {
      form = shape = shape > 0.5 ? 1 : 0;
      transition = null;
      pos.x = pos.y = pos.vx = pos.vy = 0;
    }
    formSince = clock;
  });
  resumeRendering();
} catch {
  canvas.hidden = true;
  window.parent.postMessage({ type: "helena-ready", ready: false }, location.origin);
}

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.source !== window.parent) return;
  const data = event.data;
  if (!data || data.type !== "helena-state") return;
  hostVisible = data.visible === true;
  if (hostVisible) resumeRendering();
  else {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
  hostReduced = data.reduced === true;
  if (typeof data.open === "boolean" && data.open !== hostOpen) {
    hostOpen = data.open;
    if (ready) startTransform(hostOpen ? 1 : 0, true);
  }
  hover = data.hover === true;
  const x = typeof data.x === "number" && Number.isFinite(data.x) ? clamp(data.x, -1, 1) : 0;
  const y = typeof data.y === "number" && Number.isFinite(data.y) ? clamp(data.y, -1, 1) : 0;
  if (x !== pointer.x || y !== pointer.y) {
    pointer.x = x;
    pointer.y = y;
    activity = clock;
  }
  const carried = data.motion === "dragging";
  if (carried) {
    drag = { virtual: true };
    pos.vx = x * 5;
    pos.vy = y * 5;
  } else if (drag) {
    drag = null;
    pos.vx = pos.vy = 0;
    releaseAt = clock;
  }
  if (hostReduced && ready) {
    form = shape = hostOpen ? 1 : 0;
    transition = null;
    pos.x = pos.y = pos.vx = pos.vy = 0;
  }
});
document.addEventListener("visibilitychange", resumeRendering);
canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  ready = false;
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  window.parent.postMessage({ type: "helena-ready", ready: false }, location.origin);
});
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(animationFrame);
  scene.traverse((object) => {
    if (object.isMesh) {
      object.geometry.dispose();
      if (object.material.map) object.material.map.dispose();
      if (object.material.bumpMap) object.material.bumpMap.dispose();
      object.material.dispose();
    }
  });
  renderer?.dispose();
});
