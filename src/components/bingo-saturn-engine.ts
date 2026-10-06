// Physics and paper geometry ported from the owner's approved Saturn prototype.
type Body = {
  n: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  roll: number;
  spinX: number;
  spinY: number;
  spinZ: number;
};
export function createApprovedSaturn(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const ctx: CanvasRenderingContext2D = context;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const colors = ["#facc15", "#50bdc4", "#a779ef", "#ff8e77", "#fff0c7"],
    shades = ["#d4a600", "#147b83", "#51259b", "#c95649", "#d7b84b"],
    lights = ["#ffe88d", "#a4e8eb", "#d7baff", "#ffd3c5", "#fff9ef"];
  let remaining = Array.from({ length: 75 }, (_, i) => i + 1),
    angle = 0,
    width = 500,
    height = 355,
    lastTime = 0,
    spinning = false,
    exitOpen = false,
    speed = 0,
    physicsAccumulator = 0,
    gate = 0,
    exitEffect = 0;
  let exiting: (Body & { progress: number }) | null = null;
  const bodies = new Map<number, Body>();
  const PHYSICS = { radius: 0.092, wall: 0.89, gravity: 3.1, restitution: 0.28, friction: 0.22 };
  const group = (n: number) => Math.floor((n - 1) / 15);
  function makeBodies() {
    bodies.clear();
    for (const n of remaining) {
      let x = 0,
        y = 0,
        z = 0,
        attempt = 0;
      do {
        const t = n * 2.39996 + attempt * 0.87;
        x = Math.sin(t * 1.7) * 0.72;
        y = Math.sin(t * 2.3) * 0.65;
        z = Math.cos(t * 1.1) * 0.7;
        attempt++;
      } while (
        attempt < 120 &&
        (Math.hypot(x, y, z) > 0.78 ||
          [...bodies.values()].some((b) => Math.hypot(x - b.x, y - b.y, z - b.z) < 0.19))
      );
      bodies.set(n, {
        n,
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        roll: n * 0.31,
        spinX: 0,
        spinY: 0,
        spinZ: 0,
      });
    }
    for (let i = 0; i < 220; i++) stepPhysics(1 / 120);
  }
  function stepPhysics(dt: number) {
    const list = remaining
        .map((n) => bodies.get(n))
        .filter((body): body is Body => body !== undefined),
      { radius, wall, gravity, restitution, friction } = PHYSICS;
    for (const b of list) {
      b.vy += gravity * dt;
      // Rotating ribs lift the back of the pile; gravity releases it at the top.
      const d = Math.hypot(b.x, b.y, b.z);
      if (speed > 0.05 && d > 0.63) {
        const contact = Math.min(1, (d - 0.63) / 0.18),
          grip = contact * 6 * dt;
        b.vy += (-(-speed) * b.z - b.vy) * grip;
        b.vz += (-speed * b.y - b.vz) * grip;
      }
      const drag = Math.exp(-dt * 0.45);
      b.vx *= drag;
      b.vy *= drag;
      b.vz *= drag;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      const angularDrag = Math.exp(-dt * 1.4);
      b.spinX *= angularDrag;
      b.spinY *= angularDrag;
      b.spinZ *= angularDrag;
      b.roll += b.spinX * dt;
    }
    for (let iteration = 0; iteration < 3; iteration++) {
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]!,
            b = list[j]!,
            dx = b.x - a.x,
            dy = b.y - a.y,
            dz = b.z - a.z,
            d = Math.hypot(dx, dy, dz),
            minimum = radius * 2;
          if (d >= minimum || d < 0.00001) continue;
          const nx = dx / d,
            ny = dy / d,
            nz = dz / d,
            overlap = (minimum - d) * 0.5;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          a.z -= nz * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          b.z += nz * overlap;
          const rvx = b.vx - a.vx,
            rvy = b.vy - a.vy,
            rvz = b.vz - a.vz;
          const relative = rvx * nx + rvy * ny + rvz * nz;
          if (relative < 0) {
            const bounce = relative < -0.15 ? restitution : 0,
              impulse = -relative * (1 + bounce) * 0.5;
            a.vx -= nx * impulse;
            a.vy -= ny * impulse;
            a.vz -= nz * impulse;
            b.vx += nx * impulse;
            b.vy += ny * impulse;
            b.vz += nz * impulse;
            // Tangential impulses exchange momentum and make the paper balls roll.
            const tx = rvx - relative * nx,
              ty = rvy - relative * ny,
              tz = rvz - relative * nz,
              tangent = Math.hypot(tx, ty, tz);
            if (tangent > 0.00001) {
              const slide = Math.min(tangent * 0.5, friction * impulse),
                jx = (tx / tangent) * slide,
                jy = (ty / tangent) * slide,
                jz = (tz / tangent) * slide;
              a.vx += jx;
              a.vy += jy;
              a.vz += jz;
              b.vx -= jx;
              b.vy -= jy;
              b.vz -= jz;
              const torque = 2.5 / radius,
                sx = (ny * jz - nz * jy) * torque,
                sy = (nz * jx - nx * jz) * torque,
                sz = (nx * jy - ny * jx) * torque;
              a.spinX += sx;
              b.spinX += sx;
              a.spinY += sy;
              b.spinY += sy;
              a.spinZ += sz;
              b.spinZ += sz;
            }
          }
        }
      for (const b of list) {
        const d = Math.hypot(b.x, b.y, b.z);
        if (d > wall) {
          const nx = b.x / d,
            ny = b.y / d,
            nz = b.z / d;
          b.x = nx * wall;
          b.y = ny * wall;
          b.z = nz * wall;
          const outward = b.vx * nx + b.vy * ny + b.vz * nz;
          let impulse = 0;
          if (outward > 0) {
            impulse = outward * (1 + (outward > 0.15 ? restitution : 0));
            b.vx -= nx * impulse;
            b.vy -= ny * impulse;
            b.vz -= nz * impulse;
          }
          const wallY = speed * b.z,
            wallZ = -speed * b.y;
          const rx = b.vx,
            ry = b.vy - wallY,
            rz = b.vz - wallZ,
            normal = rx * nx + ry * ny + rz * nz;
          const tx = rx - normal * nx,
            ty = ry - normal * ny,
            tz = rz - normal * nz,
            tangent = Math.hypot(tx, ty, tz);
          if (tangent > 0.00001) {
            const slide = Math.min(
              tangent * 0.18,
              friction * (impulse + gravity * Math.max(0, ny) * dt),
            );
            const jx = (-tx / tangent) * slide,
              jy = (-ty / tangent) * slide,
              jz = (-tz / tangent) * slide;
            b.vx += jx;
            b.vy += jy;
            b.vz += jz;
            b.spinX += ((ny * jz - nz * jy) * 2.5) / radius;
            b.spinY += ((nz * jx - nx * jz) * 2.5) / radius;
            b.spinZ += ((nx * jy - ny * jx) * 2.5) / radius;
          }
        }
      }
    }
  }

  function geometry(w: number, h: number) {
    return { R: Math.min(w * 0.265, h * 0.315), cx: w * 0.48, cy: h * 0.4 };
  }
  function polygon(points: readonly number[][], color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0]!, p[1]!) : ctx.moveTo(p[0]!, p[1]!)));
    ctx.closePath();
    ctx.fill();
  }
  // Saturn is drawn in separate back-ring, globe and front-ring paper layers.
  function paint() {
    ctx.clearRect(0, 0, width, height);
    const { R, cx, cy } = geometry(width, height);
    const project = (x: number, y: number, z: number): number[] => {
      const tilt = 0.2,
        X = x * Math.cos(tilt) + z * Math.sin(tilt),
        Z = z * Math.cos(tilt) - x * Math.sin(tilt),
        scale = 1 / (1 - Z / (R * 5));
      return [cx + X * scale, cy + y * scale, Z, scale];
    };
    const rotate = (x: number, y: number, z: number) =>
      project(
        x,
        y * Math.cos(angle) - z * Math.sin(angle),
        y * Math.sin(angle) + z * Math.cos(angle),
      );
    function line(points: readonly number[][], color: string, w: number) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.lineJoin = "bevel";
      ctx.lineCap = "butt";
      ctx.beginPath();
      points.forEach((p, i) => (i ? ctx.lineTo(p[0]!, p[1]!) : ctx.moveTo(p[0]!, p[1]!)));
      ctx.stroke();
    }
    function shape(x: number, y: number, r: number, n: number, color: string, phase = 0) {
      polygon(
        Array.from({ length: n }, (_, i) => [
          x + Math.cos((i * Math.PI * 2) / n + phase) * r,
          y + Math.sin((i * Math.PI * 2) / n + phase) * r,
        ]),
        color,
      );
    }
    const ringPoint = (t: number, outer = true) => {
      const x = Math.cos(t) * R * (outer ? 1.57 : 1.25),
        y = Math.sin(t) * R * (outer ? 0.46 : 0.29),
        tilt = -0.24;
      return [
        cx + x * Math.cos(tilt) - y * Math.sin(tilt),
        cy + x * Math.sin(tilt) + y * Math.cos(tilt),
      ];
    };
    // Quiet paper stars leave the machine silhouette as the main focus.
    for (const [x, y, s] of [
      [cx - R * 1.65, cy - R * 0.86, 6],
      [cx + R * 1.35, cy - R * 1.04, 8],
      [cx - R * 1.25, cy + R * 0.75, 4],
    ] as const) {
      polygon(
        [
          [x, y - s],
          [x + s * 0.3, y - s * 0.3],
          [x + s, y],
          [x + s * 0.3, y + s * 0.3],
          [x, y + s],
          [x - s * 0.3, y + s * 0.3],
          [x - s, y],
          [x - s * 0.3, y - s * 0.3],
        ],
        "#d6c3ee",
      );
    }
    // One folded base and two broad paper brackets attach directly to the ring.
    polygon(
      [
        [cx - R * 1.04, cy + R * 1.38],
        [cx + R * 1.18, cy + R * 1.38],
        [cx + R * 1.32, cy + R * 1.56],
        [cx - R * 1.18, cy + R * 1.56],
      ],
      "#51259b",
    );
    polygon(
      [
        [cx - R * 1.04, cy + R * 1.38],
        [cx + R * 1.18, cy + R * 1.38],
        [cx + R * 0.99, cy + R * 1.46],
        [cx - R * 0.89, cy + R * 1.46],
      ],
      "#a779ef",
    );
    polygon(
      [
        [cx - R * 1.18, cy + R * 1.56],
        [cx + R * 1.32, cy + R * 1.56],
        [cx + R * 1.25, cy + R * 1.63],
        [cx - R * 1.12, cy + R * 1.63],
      ],
      "#292432",
    );
    for (const [side, top] of [
      [-1, 0.18],
      [1, -0.38],
    ] as const) {
      const x = cx + side * R * 1.22,
        y = cy + R * top;
      polygon(
        [
          [x - R * 0.1, y],
          [x + R * 0.12, y],
          [cx + side * R * 0.87 + R * 0.13, cy + R * 1.39],
          [cx + side * R * 0.87 - R * 0.17, cy + R * 1.39],
        ],
        "#7c3aed",
      );
      polygon(
        [
          [x - R * 0.1, y],
          [x - R * 0.02, y],
          [cx + side * R * 0.87 - R * 0.06, cy + R * 1.39],
          [cx + side * R * 0.87 - R * 0.17, cy + R * 1.39],
        ],
        "#51259b",
      );
      polygon(
        [
          [x - R * 0.02, y],
          [x + R * 0.12, y],
          [cx + side * R * 0.87 + R * 0.13, cy + R * 1.39],
          [cx + side * R * 0.87 - R * 0.06, cy + R * 1.39],
        ],
        "#a779ef",
      );
    }
    function ring(front: boolean) {
      const begin = front ? 0 : Math.PI;
      for (let j = 0; j < 32; j++) {
        const a = begin + (j / 32) * Math.PI,
          b = begin + ((j + 1) / 32) * Math.PI;
        polygon(
          [ringPoint(a), ringPoint(b), ringPoint(b, false), ringPoint(a, false)],
          j % 6 === 0 ? "#ffe88d" : front ? "#facc15" : "#d4a600",
        );
        if (front && j % 4 === 0) {
          const p = ringPoint(a),
            q = ringPoint(b),
            u = ringPoint(a, false);
          polygon([p, q, [(p[0]! + u[0]!) / 2, (p[1]! + u[1]!) / 2]], "#fff0c7");
        }
      }
      const arc = Array.from({ length: 33 }, (_, i) => ringPoint(begin + (i / 32) * Math.PI));
      line(arc, front ? "#d4a600" : "#b68800", R * 0.025);
    }
    ring(false);
    // Faceted rim and cream paper core, not a plastic sphere.
    shape(cx, cy, R * 1.045, 24, "#51259b", Math.PI / 24);
    shape(cx, cy, R * 1.012, 24, "#a779ef", Math.PI / 24);
    shape(cx, cy, R * 0.973, 24, "#fff9ef", Math.PI / 24);
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 25; i++) {
      const a = (i * Math.PI) / 12 + Math.PI / 24,
        x = cx + Math.cos(a) * R * 0.968,
        y = cy + Math.sin(a) * R * 0.968;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.clip();
    polygon(
      [
        [cx - R, cy - R],
        [cx + R * 0.2, cy - R],
        [cx - R * 0.58, cy - R * 0.46],
        [cx - R, cy + R * 0.35],
      ],
      "#ede2ff",
    );
    polygon(
      [
        [cx + R * 0.73, cy - R * 0.63],
        [cx + R, cy - R * 0.2],
        [cx + R, cy + R],
        [cx - R * 0.15, cy + R],
      ],
      "#e3d3f3",
    );
    const wires: number[][][] = [];
    for (let j = -1; j <= 1; j++) {
      const x = R * j * 0.49,
        r = Math.sqrt(R * R - x * x);
      const wire = [];
      for (let i = 0; i <= 48; i++) {
        const t = (i * Math.PI * 2) / 48;
        wire.push(rotate(x, r * Math.cos(t), r * Math.sin(t)));
      }
      wires.push(wire);
    }
    for (let j = 0; j < 5; j++) {
      const a = (j * Math.PI) / 5,
        wire = [];
      for (let i = 0; i <= 48; i++) {
        const t = (i * Math.PI * 2) / 48;
        wire.push(
          rotate(R * Math.cos(t), R * Math.sin(t) * Math.cos(a), R * Math.sin(t) * Math.sin(a)),
        );
      }
      wires.push(wire);
    }
    function cage(front: boolean) {
      for (const wire of wires) {
        let run: number[][] = [];
        for (const p of wire) {
          if (p[2]! >= 0 === front) run.push(p);
          else {
            if (run.length > 1) line(run, front ? "#9d7db9" : "#d9c8e8", front ? 1.5 : 1);
            run = [];
          }
        }
        if (run.length > 1) line(run, front ? "#9d7db9" : "#d9c8e8", front ? 1.5 : 1);
      }
    }
    cage(false);
    const scene = remaining
      .map((n) => bodies.get(n))
      .filter((body): body is Body => body !== undefined)
      .map(({ n, x, y, z, roll }) => ({ n, x, y, z, roll }));
    if (exiting) {
      const t = Math.min(1, exiting.progress),
        ease = t * t * (3 - 2 * t);
      scene.push({
        n: exiting.n,
        x: exiting.x * (1 - ease),
        y: exiting.y * (1 - ease) + 0.97 * ease,
        z: exiting.z * (1 - ease) + 0.14 * ease,
        roll: exiting.roll,
      });
    }
    const balls = scene
      .map((b) => ({ n: b.n, roll: b.roll, p: project(b.x * R, b.y * R, b.z * R) }))
      .sort((a, b) => a.p[2]! - b.p[2]!);
    for (const { n, p, roll } of balls) {
      const r = R * PHYSICS.radius * p[3]!,
        g = group(n);
      shape(p[0]!, p[1]!, r, 10, colors[g]!, roll);
      polygon(
        [
          [p[0]! - r * 0.85, p[1]! + r * 0.3],
          [p[0]! - r * 0.2, p[1]! + r * 0.94],
          [p[0]! + r * 0.68, p[1]! + r * 0.67],
          [p[0]! + r * 0.97, p[1]! - r * 0.12],
          [p[0]! + r * 0.2, p[1]! + r * 0.35],
        ],
        shades[g]!,
      );
      polygon(
        [
          [p[0]! - r * 0.89, p[1]! - r * 0.29],
          [p[0]! - r * 0.43, p[1]! - r * 0.86],
          [p[0]! + r * 0.45, p[1]! - r * 0.83],
          [p[0]! - r * 0.19, p[1]! - r * 0.55],
        ],
        lights[g]!,
      );
      shape(p[0]!, p[1]!, r * 0.61, 8, "#fff9ef", Math.PI / 8);
      ctx.fillStyle = "#292432";
      ctx.font = "800 " + Math.max(8, r * 0.88) + "px Manrope,system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n), p[0]!, p[1]! + 0.5);
    }
    cage(true);
    ctx.restore();
    ring(true);
    // Small faceted axle caps sit in the ring, no crank or character.
    for (const [side, top] of [
      [-1, 0.18],
      [1, -0.38],
    ] as const) {
      shape(cx + side * R * 1.22, cy + R * top, R * 0.1, 8, "#51259b");
      shape(cx + side * R * 1.22, cy + R * top, R * 0.06, 6, "#ffe88d");
    }
    const open = reduced ? (exitOpen ? 1 : 0) : gate;
    polygon(
      [
        [cx - R * 0.16, cy + R * 0.91],
        [cx + R * 0.16, cy + R * 0.91],
        [cx + R * 0.18, cy + R * 1.12],
        [cx - R * 0.18, cy + R * 1.12],
      ],
      "#51259b",
    );
    polygon(
      [
        [cx - R * 0.12, cy + R * 0.94],
        [cx + R * 0.12, cy + R * 0.94],
        [cx + R * 0.1, cy + R * (1.1 - 0.13 * open)],
        [cx - R * 0.1, cy + R * (1.1 - 0.13 * open)],
      ],
      "#facc15",
    );
    // Three folded panels form a continuous chute below the outlet.
    const endX = cx + R * 1.12,
      endY = cy + R * 1.43;
    const a = [cx - R * 0.14, cy + R * 1.06],
      b = [cx + R * 0.16, cy + R * 1.06],
      c = [cx + R * 0.41, cy + R * 1.18],
      d = [endX + R * 0.12, endY - R * 0.05],
      e = [endX - R * 0.12, endY + R * 0.05],
      f = [cx + R * 0.24, cy + R * 1.29];
    polygon([a, b, c, d, e, f], "#fff0c7");
    polygon(
      [a, f, e, [e[0]!, e[1]! + R * 0.075], [f[0]!, f[1]! + R * 0.075], [a[0]!, a[1]! + R * 0.075]],
      "#51259b",
    );
    polygon(
      [[b[0]!, b[1]! - R * 0.05], [c[0]!, c[1]! - R * 0.05], [d[0]!, d[1]! - R * 0.05], d, c, b],
      "#a779ef",
    );
    polygon(
      [[a[0]!, a[1]! - R * 0.05], [f[0]!, f[1]! - R * 0.05], [e[0]!, e[1]! - R * 0.05], e, f, a],
      "#7c3aed",
    );
    polygon([e, d, [d[0]!, d[1]! + R * 0.06], [e[0]!, e[1]! + R * 0.075]], "#292432");
    if (speed > 0.5 && !reduced) {
      for (let i = 0; i < 3; i++) {
        const t = angle * 0.25 + i * 1.8,
          p = ringPoint(t);
        shape(p[0]!, p[1]!, R * 0.025, 4, "#fff9ef", t);
      }
    }
    if (exitEffect > 0 && !reduced) {
      const t = 1 - exitEffect;
      ctx.save();
      ctx.globalAlpha = exitEffect;
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI) / 4,
          x = cx + Math.cos(a) * R * 0.3 * t,
          y = cy + R * 1.05 - Math.sin(a) * R * 0.2 * t;
        shape(x, y, 3, 4, i % 2 ? "#a779ef" : "#facc15", a);
      }
      ctx.restore();
    }
  }

  let disposed = false,
    frameId = 0,
    activeUntil = 0;
  function frame(time: number) {
    if (disposed) return;
    const dt = Math.min((time - lastTime || 16) / 1000, 0.04);
    lastTime = time;
    if (!reduced && !document.hidden && (spinning || time < activeUntil)) {
      speed += ((spinning ? 3.8 : 0) - speed) * (1 - Math.exp(-dt * (spinning ? 3.8 : 7)));
      angle -= speed * dt;
      gate += ((exitOpen ? 1 : 0) - gate) * (1 - Math.exp(-dt * 12));
      exitEffect = Math.max(0, exitEffect - dt / 1.1);
      physicsAccumulator += dt;
      while (physicsAccumulator >= 1 / 120) {
        stepPhysics(1 / 120);
        physicsAccumulator -= 1 / 120;
      }
      if (exiting) exiting.progress = Math.min(1, exiting.progress + dt / 0.6);
      paint();
    }
    frameId = requestAnimationFrame(frame);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * d;
    canvas.height = height * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    paint();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  makeBodies();
  resize();
  if (!reduced) frameId = requestAnimationFrame(frame);
  return {
    setDrawn(ids: readonly string[]) {
      const excluded = new Set(ids.map(Number));
      if (
        remaining.some((n) => !excluded.has(n) && !bodies.has(n)) ||
        ids.length < 75 - remaining.length
      ) {
        remaining = Array.from({ length: 75 }, (_, i) => i + 1).filter((n) => !excluded.has(n));
        makeBodies();
      } else {
        remaining = remaining.filter((n) => !excluded.has(n));
        for (const n of excluded) bodies.delete(n);
      }
      canvas.dataset["remaining"] = String(remaining.length);
      paint();
    },
    spin(value: boolean) {
      spinning = value;
      activeUntil = performance.now() + 2500;
      if (reduced) paint();
    },
    beginExit(n: number) {
      const body = bodies.get(n);
      if (body) exiting = { ...body, progress: 0 };
      remaining = remaining.filter((value) => value !== n);
      bodies.delete(n);
      exitOpen = true;
      exitEffect = 1;
      activeUntil = performance.now() + 2500;
      paint();
    },
    finishExit() {
      exiting = null;
      exitOpen = false;
      activeUntil = performance.now() + 1600;
      paint();
    },
    releaseBall() {
      exiting = null;
      paint();
    },
    outlet() {
      const rect = canvas.getBoundingClientRect();
      const { R, cx, cy } = geometry(rect.width, rect.height);
      return { x: cx, y: cy + R * 0.98, radius: R, rampX: R * 1.12, rampY: R * 0.45 };
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      bodies.clear();
    },
  };
}
export type ApprovedSaturn = NonNullable<ReturnType<typeof createApprovedSaturn>>;
