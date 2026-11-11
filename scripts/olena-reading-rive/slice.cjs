// Fatia a Olena lendo do onboarding (public/helena-onboarding-step-1-cutout.webp, 640 x 640) nas
// camadas que o Rive anima: corpo e cabeça, duas orelhas, estrelinha, olhos, pupilas, livro, patas,
// pés e cauda. A arte é uma imagem só; cada peça sai por cor, por componente conexo ou por polígono
// medido na arte (sempre seguindo uma aresta de faceta, onde um deslocamento pequeno parece papel).
// Regras que evitam frestas quando uma peça se mexe:
//  1. O que uma peça de cima escondia é refeito na de baixo por difusão de cor (cabeça sob olhos,
//     orelha sob a estrela, olho sob a pupila, corpo sob livro e pata).
//  2. Cada junta tem uma aba escondida: a cabeça avança sob as orelhas, a cauda avança sob o corpo e
//     o livro avança sob pés e patas, então um giro pequeno nunca abre buraco.
//  3. A borda suavizada (alfa parcial) é da peça dona do pixel opaco mais próximo.
// No repouso a soma das camadas é a arte original (conferido ao fim).
// Uso: node scripts/olena-reading-rive/slice.cjs
const fs = require("fs");
const path = require("path");
const T = require("../oliver-rive/image-tools.cjs");

const SOURCE = path.join(__dirname, "..", "..", "public", "helena-onboarding-step-1-cutout.webp");
const LAYERS = path.join(__dirname, "layers");
const DEBUG = process.env["OLENA_DEBUG"];
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Polígonos em px da arte. O lado de fora da silhueta é folgado; o lado de dentro segue arestas.
const POLY = {
  earL: [[60, 200], [88, 192], [130, 170], [170, 148], [215, 128], [255, 117], [300, 121], [330, 100], [330, 0], [60, 0]],
  earR: [[400, 100], [428, 106], [452, 140], [478, 170], [505, 205], [528, 240], [545, 272], [640, 272], [640, 40], [400, 40]],
  tail: [[452, 505], [463, 497], [478, 472], [495, 440], [505, 395], [640, 330], [640, 640], [474, 640], [470, 565], [469, 512]],
  pawR: [[368, 428], [388, 419], [400, 414], [420, 416], [445, 421], [463, 433], [484, 468], [464, 500], [455, 513], [420, 514], [395, 502], [366, 482]],
  footL: [[60, 560], [90, 500], [140, 476], [200, 466], [232, 500], [226, 540], [224, 585], [214, 640], [60, 640]],
  footR: [[289, 522], [300, 500], [345, 474], [380, 486], [400, 503], [455, 515], [469, 512], [471, 565], [478, 640], [280, 640], [292, 585]],
  // fundo escuro entre as páginas abertas: é sombra de dentro do livro
  bookGap: [[205, 372], [266, 372], [244, 402], [230, 402]],
  // fora da borda direita da orelha direita (onde a ponta da estrela sai da silhueta)
  earROutside: [[553, 60], [640, 60], [640, 300], [521, 262], [549, 205], [553, 140]],
  // parte de cima da cauda (a curva que sobe), cortada na aresta da dobra
  tailTip: [[495, 330], [640, 330], [640, 470], [612, 470], [560, 462], [503, 453]],
  // onde o livro continua por baixo das patas (a borda do livro segue reta por trás delas)
  bookUnderPawR: [[240, 330], [426, 342], [428, 420], [424, 520], [240, 545]],
  bookUnderPawL: [[88, 318], [100, 380], [112, 430], [122, 478], [300, 478], [300, 318]],
};

(async () => {
  const { w, h, data } = await T.loadRGBA(SOURCE);
  const original = Uint8ClampedArray.from(data);
  const N = w * h;
  fs.mkdirSync(LAYERS, { recursive: true });
  for (const f of fs.readdirSync(LAYERS)) if (f.endsWith(".png")) fs.unlinkSync(path.join(LAYERS, f));

  const opaque = new Uint8Array(N);
  const any = new Uint8Array(N);
  const yellow = new Uint8Array(N);
  const purple = new Uint8Array(N);
  const pale = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const a = data[i * 4 + 3];
    if (a > 0) any[i] = 1;
    if (a < 250) continue;
    opaque[i] = 1;
    const [hh, s, v] = T.hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (hh > 30 && hh < 70 && s > 0.5 && v > 0.6) yellow[i] = 1;
    else if (hh > 235 && hh < 295 && s > 0.38 && v > 0.5) purple[i] = 1;
    else if (s < 0.3 && v > 0.7) pale[i] = 1;
  }
  const poly = (name) => T.and(opaque, T.polyMask(w, h, POLY[name]));
  const biggest = (mask) => {
    const c = T.components(mask, w, h);
    return [...c.list].sort((a, b) => b.n - a.n).map((x) => ({ ...x, mask: T.maskOfLabel(c.lab, x.id) }));
  };

  // ---- amarelos: dois olhos e a estrela ----
  const ys = biggest(yellow).slice(0, 3);
  const star = ys.find((c) => c.x0 > 440);
  const eyesY = ys.filter((c) => c !== star).sort((a, b) => a.x0 - b.x0);
  if (!star || eyesY.length !== 2) throw new Error("amarelos inesperados");
  const eyeCore = eyesY.map((c) => T.fillHoles(c.mask, w, h));
  // o contorno escuro do olho (2 a 3 px) vai junto com o olho
  const eyeMaskRaw = eyeCore.map((m) => T.and(T.dilate(m, w, h, 3), opaque));
  const pupilMask = eyeCore.map((core, k) => {
    const inner = T.minus(core, eyesY[k].mask);
    return T.and(T.dilate(inner, w, h, 1), core);
  });
  // contorno escuro e brilho da borda da estrela vão com ela (4 px)
  const starMask = T.and(T.dilate(T.fillHoles(star.mask, w, h), w, h, 4), opaque);
  // por baixo da estrela, a orelha e a cabeça só continuam até a borda de fora da orelha; a ponta
  // da estrela que passa dessa borda fica vazia, senão o preenchimento mostraria o formato da
  // estrela parado no lugar enquanto ela gira
  const starFill = T.minus(starMask, T.polyMask(w, h, POLY.earROutside));

  // ---- livro: roxo, páginas, etiqueta e a sombra entre as páginas ----
  const pages = biggest(pale).filter((c) => c.y0 > 300 && c.y1 < 460 && c.n > 1000);
  let book = purple;
  for (const p of pages) book = T.or(book, p.mask);
  book = T.fillHoles(book, w, h);
  book = T.or(book, poly("bookGap"));
  // contorno do livro: na faixa de 4 px em volta, tudo o que não é pelo (roxo escuro, creme
  // antisserrilhado) é do livro, senão ficaria colado no corpo quando o livro se mexe
  {
    const ring = T.minus(T.dilate(book, w, h, 4), book);
    for (let i = 0; i < N; i++) {
      if (!ring[i] || !opaque[i]) continue;
      const [hh, s2, v] = T.hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      if (v > 0.45 || (hh > 235 && hh < 295 && s2 > 0.45)) book[i] = 1;
    }
  }
  book = T.and(book, opaque);

  // o olho direito some atrás das páginas: o contorno não pode levar pixels do livro
  const eyeMask = eyeMaskRaw.map((m) => T.minus(m, book));

  // ---- patas, pés, cauda, orelhas ----
  const dark = T.minus(opaque, T.or(T.or(yellow, purple), pale));
  const pawL = biggest(T.minus(dark, book)).find((c) => c.x0 < 100 && c.y0 > 360 && c.n > 3000);
  if (!pawL) throw new Error("faltou a pata esquerda");
  const pawLMask = pawL.mask;
  const pawR = T.minus(poly("pawR"), book);
  const front = T.or(T.or(book, pawLMask), pawR);
  const footL = T.minus(poly("footL"), front);
  const footR = T.minus(poly("footR"), front);
  const tail = T.minus(T.minus(poly("tail"), pawR), footR);
  const earL = poly("earL");
  const earR = T.minus(poly("earR"), starMask);

  // ---- donos dos pixels opacos (o último a reclamar vence) ----
  // 1 corpo, 2 orelhaE, 3 orelhaD, 4 estrela, 5 olhoE, 6 olhoD, 7 pupilaE, 8 pupilaD,
  // 9 livro, 10 pataE, 11 pataD, 12 péE, 13 péD, 14 cauda
  const owner = new Int32Array(N);
  const claim = (m, k) => {
    for (let i = 0; i < N; i++) if (m[i] && opaque[i]) owner[i] = k;
  };
  claim(opaque, 1);
  claim(earL, 2);
  claim(earR, 3);
  claim(tail, 14);
  claim(T.and(tail, T.polyMask(w, h, POLY.tailTip)), 15);
  claim(footL, 12);
  claim(footR, 13);
  claim(book, 9);
  claim(pawLMask, 10);
  claim(pawR, 11);
  claim(starMask, 4);
  claim(eyeMask[0], 5);
  claim(eyeMask[1], 6);
  claim(pupilMask[0], 7);
  claim(pupilMask[1], 8);
  // Contorno escuro das patas no livro. O primeiro pixel é a borda suavizada da própria pata e vai
  // com ela. O resto é a sombra que a pata faz na capa: a da direita vira uma camada própria (16)
  // que fica no livro e some quando a pata levanta; a da esquerda, que mal sai do lugar, vai com a
  // pata.
  for (const k of [10, 11]) {
    const m = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (owner[i] === k) m[i] = 1;
    const edge = T.dilate(m, w, h, 1);
    const ring = T.dilate(m, w, h, 3);
    for (let i = 0; i < N; i++) {
      if (!ring[i] || owner[i] !== 9) continue;
      if (T.hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])[2] >= 0.75) continue;
      owner[i] = edge[i] || k === 10 ? k : 16;
    }
  }
  // Sombra que os pés fazem na beirada de baixo do livro: fica com os pés (que não se mexem),
  // senão sobe junto com o livro e deixa um fio escuro solto em cima do pé.
  for (const k of [12, 13]) {
    const m = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (owner[i] === k) m[i] = 1;
    const ring = T.dilate(m, w, h, 3);
    for (let i = 0; i < N; i++)
      if (ring[i] && owner[i] === 9 && T.hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])[2] < 0.62) owner[i] = k;
  }
  // lascas opacas do corpo soltas do resto (borda clara do livro, por exemplo) vão para o vizinho
  {
    const body = new Uint8Array(N);
    for (let i = 0; i < N; i++) body[i] = owner[i] === 1 ? 1 : 0;
    const parts = biggest(body);
    for (const part of parts.slice(1)) {
      if (part.n > 400) continue;
      const votes = new Map();
      const ring = T.minus(T.dilate(part.mask, w, h, 2), part.mask);
      for (let i = 0; i < N; i++) if (ring[i] && owner[i] > 1) votes.set(owner[i], (votes.get(owner[i]) ?? 0) + 1);
      const winner = [...votes].sort((a, b) => b[1] - a[1])[0];
      if (winner) for (let i = 0; i < N; i++) if (part.mask[i]) owner[i] = winner[0];
    }
  }
  // bordas suavizadas: do opaco mais próximo
  let frontier = [];
  for (let i = 0; i < N; i++) if (owner[i]) frontier.push(i);
  for (let step = 0; step < 200 && frontier.length; step++) {
    const claims = new Map();
    for (const i of frontier) {
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (owner[q] || !any[q] || claims.has(q)) continue;
        claims.set(q, owner[i]);
      }
    }
    frontier = [];
    for (const [q, k] of claims) {
      owner[q] = k;
      frontier.push(q);
    }
  }
  // grãos soltos, longe de tudo: vão para o dono mais próximo
  for (let i = 0; i < N; i++) {
    if (data[i * 4 + 3] <= 2 || owner[i]) continue;
    const x = i % w;
    const y = (i / w) | 0;
    let best = 0;
    let bestD = Infinity;
    for (let q = 0; q < N; q++) {
      if (!owner[q] || !opaque[q]) continue;
      const d = (q % w - x) ** 2 + (((q / w) | 0) - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = owner[q];
      }
    }
    owner[i] = best;
  }
  const own0 = (k) => {
    const m = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (owner[i] === k) m[i] = 1;
    return m;
  };
  // Borda suavizada do corpo e dos pés encostada numa peça que gira (orelhas, cauda): vai com a
  // peça. Parada, ela é igual; girando, a peça passaria por trás dela e o tom claro da borda
  // apareceria como um risco ou pontinhos no meio do pelo escuro.
  // (a arte tem halo claro opaco na silhueta, então conta também o que encosta no fundo)
  const nearBg = T.dilate(T.minus(new Uint8Array(N).fill(1), any), w, h, 2);
  for (const k of [2, 3, 14, 15]) {
    const m = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (owner[i] === k && opaque[i] && !nearBg[i]) m[i] = 1;
    const ring = T.dilate(m, w, h, 7);
    for (let i = 0; i < N; i++)
      if (ring[i] && (!opaque[i] || nearBg[i]) && (owner[i] === 1 || owner[i] === 11 || owner[i] === 12 || owner[i] === 13)) owner[i] = k;
  }
  const own = (k) => {
    const m = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (owner[i] === k) m[i] = 1;
    return m;
  };
  const opaqueOwn = (k) => T.and(own(k), opaque);
  const inner = T.erode(opaque, w, h, 1);
  // Halo claro da silhueta: a arte foi recortada de um fundo branco e guardou na borda pixels
  // claros opacos (mistura do pelo com o branco). Parados não aparecem; quando uma peça gira, a
  // borda clara passa por cima do pelo e vira risco. Cada pixel desses é separado em cor da peça
  // (a do interior vizinho) e transparência: sobre o fundo claro do app fica igual, e sobre o pelo
  // escuro some.
  {
    const MATTE = [255, 255, 255];
    const nearBg2 = T.dilate(T.minus(new Uint8Array(N).fill(1), any), w, h, 2);
    let fixedHalo = 0;
    // só nas peças de pelo; a estrela e o livro têm contorno próprio na borda
    for (const k of [1, 2, 3, 10, 11, 12, 13, 14, 15]) {
      const mine = own(k);
      const halo = T.and(T.and(mine, nearBg2), any);
      const core = T.minus(T.and(mine, opaque), nearBg2);
      if (!T.count(halo) || !T.count(core)) continue;
      const F = T.inpaint(data, w, h, T.or(halo, T.minus(mine, core)), 20, core);
      for (let i = 0; i < N; i++) {
        if (!halo[i]) continue;
        const a = data[i * 4 + 3] / 255;
        const eff = [0, 1, 2].map((c) => data[i * 4 + c] * a + MATTE[c] * (1 - a));
        const lumE = eff[0] + eff[1] + eff[2];
        const lumF = F[i * 4] + F[i * 4 + 1] + F[i * 4 + 2];
        if (lumE <= lumF + 24) continue; // não é halo claro
        let num = 0;
        let den = 0;
        for (let c = 0; c < 3; c++) {
          const d = F[i * 4 + c] - MATTE[c];
          num += (eff[c] - MATTE[c]) * d;
          den += d * d;
        }
        const alpha = den ? clamp01(num / den) : a;
        for (let c = 0; c < 3; c++) data[i * 4 + c] = F[i * 4 + c];
        data[i * 4 + 3] = Math.round(alpha * 255);
        fixedHalo++;
      }
    }
    console.log("halo claro separado em cor e transparência:", fixedHalo, "px");
  }

  // camada = pixels próprios com a cor da arte + pixels escondidos (abas e buracos) por difusão
  function build(k, hidden, sample) {
    const mine = own(k);
    const hole = T.minus(T.and(hidden, inner), mine);
    // a difusão atravessa também os pixels próprios fora da amostra (bordas, sombras), senão um
    // buraco separado da amostra por eles ficaria sem cor; esses pixels mantêm a cor da arte
    const known = sample ?? opaqueOwn(k);
    const rgba = T.inpaint(data, w, h, T.or(hole, T.minus(mine, known)), 400, known);
    const out = Uint8ClampedArray.from(rgba);
    const mask = T.or(mine, hole);
    for (let i = 0; i < N; i++) {
      if (!mask[i]) out[i * 4 + 3] = 0;
      else if (mine[i]) {
        out[i * 4] = data[i * 4];
        out[i * 4 + 1] = data[i * 4 + 1];
        out[i * 4 + 2] = data[i * 4 + 2];
        out[i * 4 + 3] = data[i * 4 + 3];
      } else out[i * 4 + 3] = 255;
    }
    return { rgba: out, mask };
  }

  const TAB = 12;
  const near = (m, r) => T.dilate(m, w, h, r);
  // Borda do livro encostada no olho direito: cada pixel é uma mistura de creme (página) com
  // amarelo (olho). Ela vira creme com alfa parcial no livro, e o olho continua por baixo em
  // amarelo: no repouso a soma é a arte, e quando o olho pisca a borda fica sobre o pelo, sem
  // lasca amarela solta na página.
  const rim = new Uint8Array(N);
  {
    const nearEye = T.dilate(eyeMask[1], w, h, 5);
    for (let i = 0; i < N; i++) {
      if (owner[i] !== 9 || !nearEye[i]) continue;
      const [hh, s2] = T.hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
      if (hh > 20 && hh < 75 && s2 > 0.16) rim[i] = 1;
    }
    console.log("borda do livro no olho:", T.count(rim), "px");
  }
  const bodyCore = opaqueOwn(1);
  // corpo: sob olhos e estrela (inteiros), sob as orelhas, o livro e a pata direita (aba), e sob
  // a borda do livro no olho
  const pawRAll = opaqueOwn(11);
  const pawLAll = opaqueOwn(10);
  const underPawRBook = T.and(pawRAll, T.polyMask(w, h, POLY.bookUnderPawR));
  const underPawLBook = T.and(pawLAll, T.polyMask(w, h, POLY.bookUnderPawL));
  // o corpo continua por baixo de toda a pata direita fora do livro, com o contorno da própria pata:
  // quando ela sobe, o que aparece embaixo é o braço saindo do corpo, sem degrau nem coluna solta
  const underPawRBody = T.minus(pawRAll, underPawRBook);
  const bodyHidden0 = T.or(
    T.or(T.or(T.and(T.or(eyeMask[0], eyeMask[1]), opaque), T.and(near(rim, 4), opaque)), T.and(starFill, near(bodyCore, 60))),
    T.and(T.or(T.or(T.or(opaqueOwn(2), opaqueOwn(3)), T.or(opaqueOwn(9), opaqueOwn(11))), opaqueOwn(10)), near(bodyCore, TAB)),
  );
  // as patas se mexem bastante: o corpo continua inteiro por baixo da pata direita
  // e por baixo da borda dos pés (o corpo respira e inclina; os pés ficam parados)
  const bodyHidden = T.or(T.or(bodyHidden0, underPawRBody), T.and(T.or(opaqueOwn(12), opaqueOwn(13)), near(bodyCore, TAB)));
  const layersOut = {};
  // amostra só do pelo escuro: o brilho das arestas e a borda clara da silhueta mancham a difusão
  const furDark = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (opaque[i] && T.hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])[2] < 0.33) furDark[i] = 1;
  layersOut.body = build(1, bodyHidden, T.and(T.erode(bodyCore, w, h, 2), furDark));
  layersOut.earL = build(2, new Uint8Array(N));
  layersOut.earR = build(3, T.and(starFill, near(opaqueOwn(3), 40)));
  layersOut.star = build(4, new Uint8Array(N));
  layersOut.eyeL = build(5, pupilMask[0], T.and(opaqueOwn(5), yellow));
  layersOut.eyeR = build(6, T.or(pupilMask[1], rim), T.and(opaqueOwn(6), yellow));
  // cor da borda no livro: com o amarelo que o olho tem por baixo (Y), acha alfa e cor (B) tais
  // que alfa * B + (1 - alfa) * Y = arte; começa pela mistura com o creme vizinho e só sobe o alfa
  // quando a cor sairia da faixa
  {
    const cream = T.inpaint(data, w, h, rim, 20, T.minus(opaqueOwn(9), rim));
    const Y = layersOut.eyeR.rgba;
    for (let i = 0; i < N; i++) {
      if (!rim[i]) continue;
      let num = 0;
      let den = 0;
      for (let c = 0; c < 3; c++) {
        const d = cream[i * 4 + c] - Y[i * 4 + c];
        num += (data[i * 4 + c] - Y[i * 4 + c]) * d;
        den += d * d;
      }
      let alpha = Math.max(0.05, den ? clamp01(num / den) : 1);
      const colorAt = (al) => [0, 1, 2].map((c) => (data[i * 4 + c] - (1 - al) * Y[i * 4 + c]) / al);
      while (alpha < 1 && colorAt(alpha).some((v) => v < 0 || v > 255)) alpha = Math.min(1, alpha + 0.01);
      const col = colorAt(alpha);
      for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.round(Math.max(0, Math.min(255, col[c])));
      data[i * 4 + 3] = Math.round(alpha * 255);
    }
  }
  // o olho direito continua por trás das páginas numa peça própria, que não pisca: o livro desce
  // sem abrir fresta, e a piscada não puxa amarelo de baixo das páginas para o rosto (longe da
  // borda e das bordas do livro que não encostam no olho, senão o amarelo apareceria nelas)
  const outsideEye = T.minus(T.minus(T.minus(new Uint8Array(N).fill(1), own(9)), own(6)), own(8));
  layersOut.eyeRBack = build(-1, T.minus(T.minus(T.and(opaqueOwn(9), near(opaqueOwn(6), TAB)), near(outsideEye, 3)), near(rim, 1)), T.and(opaqueOwn(6), yellow));
  layersOut.pupilL = build(7, new Uint8Array(N));
  layersOut.pupilR = build(8, new Uint8Array(N));
  // livro: avança sob pés e patas; a pata esquerda e os pés ficam por cima no repouso
  // e o livro continua inteiro por baixo das duas patas
  // amostra só do roxo da capa, longe da sombra que as patas e os pés deixam na borda
  // Borda entre uma peça da frente e uma de trás que se mexem uma em relação à outra (pés e patas
  // na frente do livro, livro na frente do corpo): cada pixel é uma mistura das duas cores. Ele
  // fica com a peça da frente, na cor dela e com a transparência da mistura, calculada contra a
  // cor que a camada de trás realmente tem ali por baixo. Parada, a soma é a arte; mexendo, a borda
  // vai junto com a peça certa e nada gruda na outra.
  const bgNear = T.dilate(T.minus(new Uint8Array(N).fill(1), any), w, h, 3);
  function unmixEdge(front, back, backRGBA) {
    const fm = own(front);
    const edge = T.and(T.and(T.and(fm, T.dilate(own(back), w, h, 2)), opaque), T.minus(new Uint8Array(N).fill(1), bgNear));
    const fcore = T.minus(T.and(fm, opaque), T.dilate(own(back), w, h, 3));
    const F = T.inpaint(data, w, h, T.minus(fm, fcore), 20, fcore);
    let mixed = 0;
    for (let i = 0; i < N; i++) {
      if (!edge[i] || rim[i] || data[i * 4 + 3] < 255 || backRGBA[i * 4 + 3] < 250) continue;
      let num = 0;
      let den = 0;
      for (let c = 0; c < 3; c++) {
        const d = F[i * 4 + c] - backRGBA[i * 4 + c];
        num += (data[i * 4 + c] - backRGBA[i * 4 + c]) * d;
        den += d * d;
      }
      if (den < 900) continue;
      const alpha = clamp01(num / den);
      if (alpha > 0.97) continue;
      let res = 0;
      for (let c = 0; c < 3; c++) res = Math.max(res, Math.abs(alpha * F[i * 4 + c] + (1 - alpha) * backRGBA[i * 4 + c] - data[i * 4 + c]));
      if (res > 22) continue;
      for (let c = 0; c < 3; c++) data[i * 4 + c] = F[i * 4 + c];
      data[i * 4 + 3] = Math.round(alpha * 255);
      mixed++;
    }
    return mixed;
  }
  console.log("borda livro/corpo separada:", unmixEdge(9, 1, layersOut.body.rgba), "px");
  layersOut.book = build(9, T.or(T.or(T.or(underPawRBook, underPawLBook), opaqueOwn(16)), T.and(T.or(T.or(opaqueOwn(10), opaqueOwn(11)), T.or(opaqueOwn(12), opaqueOwn(13))), near(opaqueOwn(9), TAB))), T.and(T.erode(opaqueOwn(9), w, h, 3), purple));
  let edgeMixed = 0;
  for (const k of [10, 11, 12, 13]) edgeMixed += unmixEdge(k, 9, layersOut.book.rgba);
  console.log("borda patas e pés/livro separada:", edgeMixed, "px");
  layersOut.pawL = build(10, new Uint8Array(N));
  layersOut.pawR = build(11, new Uint8Array(N));
  layersOut.pawRShadow = build(16, new Uint8Array(N));
  layersOut.footL = build(12, new Uint8Array(N));
  // o pé fica por cima do livro: só preenche sob a pata onde não há livro por trás
  layersOut.footR = build(13, T.minus(T.and(pawRAll, near(opaqueOwn(13), 24)), T.polyMask(w, h, POLY.bookUnderPawR)), T.and(opaqueOwn(13), furDark));
  // cauda: avança sob o corpo e o pé direito
  layersOut.tail = build(14, T.or(T.and(T.or(bodyCore, opaqueOwn(13)), near(opaqueOwn(14), TAB)), T.and(opaqueOwn(15), near(opaqueOwn(14), TAB))));
  // ponta da cauda: por cima da base, que tem a aba por baixo da junta
  layersOut.tailTip = build(15, new Uint8Array(N));
  // e leva por cima uma faixa de 10 px da base com a cor original: no repouso coincide com a base,
  // e quando a ponta gira ela cobre a cunha que abriria na junta
  {
    // longe 4 px da silhueta, senão a faixa aparece como um calombo na borda quando a ponta gira
    const lap = T.and(T.and(opaqueOwn(14), near(opaqueOwn(15), 10)), T.erode(opaque, w, h, 4));
    const L = layersOut.tailTip;
    for (let i = 0; i < N; i++)
      if (lap[i]) {
        for (let c = 0; c < 4; c++) L.rgba[i * 4 + c] = data[i * 4 + c];
        L.mask[i] = 1;
      }
  }

  // ---- exporta (de trás para a frente) ----
  const manifest = { source: "public/helena-onboarding-step-1-cutout.webp", width: w, height: h, order: [], layers: {} };
  const centroid = (mask) => {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let i = 0; i < N; i++)
      if (mask[i]) {
        sx += i % w;
        sy += (i / w) | 0;
        n++;
      }
    return [Math.round(sx / n), Math.round(sy / n)];
  };
  const PIVOT = {
    body: [300, 592],
    earL: [205, 136],
    earR: [482, 178],
    star: centroid(starMask),
    eyeL: centroid(eyeCore[0]),
    eyeR: centroid(eyeCore[1]),
    eyeRBack: centroid(eyeCore[1]),
    pupilL: centroid(pupilMask[0]),
    pupilR: centroid(pupilMask[1]),
    book: [262, 560],
    pawL: centroid(pawLMask),
    pawR: centroid(pawR),
    pawRShadow: centroid(pawR),
    footL: [160, 595],
    footR: [380, 595],
    tail: [462, 510],
    tailTip: [560, 462],
  };
  const ORDER = ["tail", "tailTip", "body", "earL", "earR", "star", "eyeL", "pupilL", "eyeRBack", "eyeR", "pupilR", "book", "pawRShadow", "footL", "footR", "pawL", "pawR"];
  for (const name of ORDER) {
    const L = layersOut[name];
    const cut = T.cutLayer(L.rgba, w, h, L.mask);
    if (!cut) throw new Error("camada vazia: " + name);
    const file = name + ".png";
    T.savePNG(path.join(LAYERS, file), cut.w, cut.h, cut.data);
    manifest.layers[name] = { file, x0: cut.x0, y0: cut.y0, w: cut.w, h: cut.h, pivot: PIVOT[name] };
    manifest.order.push(name);
  }
  // ---- pálpebras: não estão na arte; feitas da mesma pelagem que fica atrás dos olhos ----
  // Cada olho ganha uma pálpebra de cima e uma de baixo, que se encontram numa curva levemente
  // caída (o olho fechado sorri um pouco). A de cima leva o risco escuro do olho fechado. O Rive
  // as estica a partir da borda do olho: de cima para baixo e de baixo para cima. Nascem
  // invisíveis, então não entram na recomposição.
  {
    const { createCanvas, loadImage } = require("@napi-rs/canvas");
    const fur = layersOut.body.rgba;
    for (const [k, side] of [[0, "L"], [1, "R"]]) {
      const region = T.dilate(eyeMaskRaw[k], w, h, 2);
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let i = 0; i < N; i++)
        if (region[i]) {
          const x = i % w;
          const y = (i / w) | 0;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      const cx = (x0 + x1) / 2;
      const hw = (x1 - x0) / 2;
      const hh = y1 - y0;
      const meet = (x) => y0 + 0.5 * hh + 0.07 * hh * (1 - ((x - cx) / hw) ** 2);
      for (const part of ["Up", "Low"]) {
        const lw = x1 - x0 + 1;
        const lh = y1 - y0 + 1;
        const c = createCanvas(lw, lh);
        const g = c.getContext("2d");
        const img = g.createImageData(lw, lh);
        for (let y = y0; y <= y1; y++)
          for (let x = x0; x <= x1; x++) {
            const i = y * w + x;
            if (!region[i]) continue;
            const m = meet(x);
            if (part === "Up" ? y > m + 1.5 : y < m - 1.5) continue;
            const o = ((y - y0) * lw + (x - x0)) * 4;
            for (let ch = 0; ch < 3; ch++) img.data[o + ch] = fur[i * 4 + ch];
            img.data[o + 3] = 255;
          }
        g.putImageData(img, 0, 0);
        if (part === "Up") {
          // risco do olho fechado, só dentro da pálpebra
          const line = createCanvas(lw, lh);
          const lg = line.getContext("2d");
          // o risco ocupa só o miolo (76% da largura) e afina nas pontas: com a pálpebra a meio
          // caminho ele não passa da largura do olho
          const xa = x0 + 0.12 * (x1 - x0);
          const xb = x1 - 0.12 * (x1 - x0);
          lg.fillStyle = "#141018";
          lg.beginPath();
          for (let x = xa; x <= xb; x += 1) {
            const u = (x - xa) / (xb - xa);
            const half = 0.6 + 2.2 * Math.sin(Math.PI * u);
            if (x === xa) lg.moveTo(x - x0, meet(x) - y0 - half); else lg.lineTo(x - x0, meet(x) - y0 - half);
          }
          for (let x = xb; x >= xa; x -= 1) {
            const u = (x - xa) / (xb - xa);
            const half = 0.6 + 2.2 * Math.sin(Math.PI * u);
            lg.lineTo(x - x0, meet(x) - y0 + half);
          }
          lg.closePath();
          lg.fill();
          lg.globalCompositeOperation = "destination-in";
          lg.drawImage(c, 0, 0);
          g.drawImage(line, 0, 0);
        }
        const name = "lid" + part + side;
        T.savePNG(path.join(LAYERS, name + ".png"), lw, lh, g.getImageData(0, 0, lw, lh).data);
        manifest.layers[name] = { file: name + ".png", x0, y0, w: lw, h: lh, pivot: [Math.round(cx), part === "Up" ? y0 : y1 + 1], hidden: true };
      }
      const pupil = "pupil" + side;
      manifest.order.splice(manifest.order.indexOf(pupil) + 1, 0, "lidLow" + side, "lidUp" + side);
    }
  }
  // ---- folha que vira: não está na arte, é desenhada aqui no papel creme das páginas ----
  // Três gomos encadeados (lombada, meio e ponta), para a folha curvar enquanto vira. Cada gomo
  // sai deitado em +x a partir do próprio pivô, com ponta arredondada que cobre a junta seguinte.
  // Nasce invisível; o Rive a acende só durante a virada, então não entra na recomposição.
  {
    const { createCanvas } = require("@napi-rs/canvas");
    const SEG = 62;
    const PH = 40;
    const MID = 24; // a linha da lombada fica em y = MID da imagem
    const thick = (x) => 7 + (x / (3 * SEG)) * 22; // a folha engrossa da lombada para a ponta
    for (let k = 0; k < 3; k++) {
      const PW = SEG + 10;
      const c = createCanvas(PW, PH);
      const g = c.getContext("2d");
      const x0 = k * SEG;
      const top = (x) => MID - thick(x0 + x);
      g.beginPath();
      g.moveTo(0, MID + 3);
      for (let x = 0; x <= SEG; x += 2) g.lineTo(x, top(x));
      g.arc(SEG, MID - thick(x0 + SEG) / 2 + 1.5, thick(x0 + SEG) / 2 + 1.5, -Math.PI / 2, Math.PI / 2);
      g.lineTo(0, MID + 3);
      g.closePath();
      g.fillStyle = "#f6e8d5";
      g.fill();
      // face de cima mais clara e um fio de sombra na beirada de baixo
      g.beginPath();
      g.moveTo(0, MID - 1);
      for (let x = 0; x <= SEG; x += 2) g.lineTo(x, top(x));
      for (let x = SEG; x >= 0; x -= 2) g.lineTo(x, top(x) + thick(x0 + x) * 0.45);
      g.closePath();
      g.fillStyle = "#fdf6ec";
      g.fill();
      g.fillStyle = "#e2cdb2";
      g.fillRect(0, MID + 1, SEG, 2);
      const name = "page" + (k + 1);
      T.savePNG(path.join(LAYERS, name + ".png"), PW, PH, g.getImageData(0, 0, PW, PH).data);
      manifest.layers[name] = { file: name + ".png", x0: 240 + x0, y0: 383 - MID, w: PW, h: PH, pivot: [240 + x0, 383], hidden: true };
    }
    manifest.order.splice(manifest.order.indexOf("book") + 1, 0, "page1", "page2", "page3");
  }
  fs.writeFileSync(path.join(LAYERS, "layers.json"), JSON.stringify(manifest, null, 2) + "\n");

  // ---- recomposição em repouso contra a arte original, as duas sobre o fundo creme do app ----
  const { createCanvas, loadImage } = require("@napi-rs/canvas");
  const c = createCanvas(w, h);
  const g = c.getContext("2d");
  for (const name of manifest.order) {
    const L = manifest.layers[name];
    if (L.hidden) continue;
    g.drawImage(await loadImage(path.join(LAYERS, L.file)), L.x0, L.y0);
  }
  const re = g.getImageData(0, 0, w, h).data;
  let maxd = 0;
  let bad = 0;
  for (let i = 0; i < N; i++) {
    const a0 = original[i * 4 + 3] / 255;
    const a1 = re[i * 4 + 3] / 255;
    const CREAM = [255, 249, 239];
    const d = Math.max(...[0, 1, 2].map((c) => Math.abs(original[i * 4 + c] * a0 + CREAM[c] * (1 - a0) - (re[i * 4 + c] * a1 + CREAM[c] * (1 - a1)))));
    if (d > 20) bad++;
    maxd = Math.max(maxd, d);
  }
  console.log("camadas:", manifest.order.length, "| diferença máxima sobre o creme:", maxd.toFixed(1), "| pixels > 20:", bad);
  if (DEBUG) {
    T.savePNG(path.join(DEBUG, "recomposed.png"), w, h, re);
    // mapa de donos, para conferir os cortes
    const pal = [[0, 0, 0], [60, 50, 70], [230, 80, 80], [80, 200, 230], [250, 220, 0], [255, 150, 0], [255, 120, 40], [20, 20, 20], [40, 40, 40], [150, 80, 255], [80, 230, 120], [230, 80, 200], [120, 120, 255], [255, 255, 255], [80, 160, 60], [40, 120, 40], [255, 0, 0]];
    const map = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      const col = pal[owner[i]];
      map[i * 4] = col[0];
      map[i * 4 + 1] = col[1];
      map[i * 4 + 2] = col[2];
      map[i * 4 + 3] = owner[i] ? 255 : 0;
    }
    T.savePNG(path.join(DEBUG, "owners.png"), w, h, map);
  }
  // o halo separado muda pixels soltos da borda em até ~30 níveis sobre o creme (era branco por
  // baixo); mais que isso, ou muitos pixels, é corte errado
  if (maxd > 40 || bad > 60) throw new Error("a recomposição difere da arte em " + bad + " pixels");
})();
