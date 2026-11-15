// Escritor mínimo de .riv (formato binário do runtime oficial do Rive, versão 7), sem o editor do
// Rive. Foi extraído do gerador da Olena lendo (scripts/olena-reading-rive/generate.cjs), que já
// roda no runtime 2.43 vendorizado: mesmos tipos, mesmas chaves e a mesma ordem de objetos.
// A saída é determinística. Só há o que as peças da prateleira usam: imagens rígidas dentro de nós,
// animações lineares de posição, rotação, escala e opacidade, e uma máquina de estados com camadas.
const fs = require("fs");
const path = require("path");

class Out {
  constructor() {
    this.b = [];
  }
  byte(v) {
    this.b.push(v & 255);
  }
  varuint(n) {
    n = Math.floor(n);
    do {
      let x = n % 128;
      n = Math.floor(n / 128);
      if (n > 0) x |= 128;
      this.byte(x);
    } while (n > 0);
  }
  f32(v) {
    const a = Buffer.alloc(4);
    a.writeFloatLE(v, 0);
    for (const x of a) this.byte(x);
  }
  str(s) {
    const a = Buffer.from(s, "utf8");
    this.varuint(a.length);
    for (const x of a) this.byte(x);
  }
  bytes(buf) {
    this.varuint(buf.length);
    for (const x of buf) this.byte(x);
  }
}

const U = "u";
const D = "d";
const S = "s";
const BY = "y";
const K = {
  name: 4,
  parentId: 5,
  width: 7,
  height: 8,
  x: 13,
  y: 14,
  rotation: 15,
  scaleX: 16,
  scaleY: 17,
  opacity: 18,
  animName: 55,
  fps: 56,
  duration: 57,
  loop: 59,
  objectId: 51,
  propertyKey: 53,
  frame: 67,
  interp: 68,
  value: 70,
  assetName: 203,
  assetId: 204,
  assetH: 207,
  assetW: 208,
  imageAssetId: 206,
  bytesKey: 212,
  smName: 138,
  numValue: 140,
  animationId: 149,
  stateToId: 151,
  flags: 152,
  tDuration: 158,
  exitTime: 160,
  inputId: 155,
  opValue: 156,
};
const T = {
  Backboard: 23,
  Artboard: 1,
  Node: 2,
  ImageAsset: 105,
  FileAssetContents: 106,
  Image: 100,
  LinearAnimation: 31,
  KeyedObject: 25,
  KeyedProperty: 26,
  KeyFrameDouble: 30,
  StateMachine: 53,
  StateMachineNumber: 56,
  StateMachineLayer: 57,
  EntryState: 63,
  AnyState: 62,
  ExitState: 64,
  AnimationState: 61,
  StateTransition: 65,
};
const NUMBER_CONDITION = 70;
const CONDITION_VALUE = 157;
// Propriedades animáveis, pelo nome curto usado nos geradores.
const P = { x: K.x, y: K.y, rot: K.rotation, sx: K.scaleX, sy: K.scaleY, op: K.opacity };

class RiveFile {
  constructor(artboardName, width, height) {
    this.fileObjects = [[T.Backboard, []]];
    this.assets = [];
    this.comps = [];
    this.animations = [];
    this.comp(T.Artboard, [
      [K.name, S, artboardName],
      [K.width, D, width],
      [K.height, D, height],
    ]);
  }
  comp(type, props) {
    this.comps.push({ type, props });
    return this.comps.length - 1;
  }
  node(parent, name, x = 0, y = 0) {
    return this.comp(T.Node, [
      [K.name, S, name],
      [K.parentId, U, parent],
      [K.x, D, x],
      [K.y, D, y],
    ]);
  }
  /** Registra uma imagem do arquivo (PNG) e devolve o índice do asset. */
  asset(name, png, w, h) {
    const index = this.assets.length;
    this.assets.push(name);
    this.fileObjects.push([
      T.ImageAsset,
      [
        [K.assetName, S, name],
        [K.assetId, U, index],
        [K.assetW, D, w],
        [K.assetH, D, h],
      ],
    ]);
    this.fileObjects.push([T.FileAssetContents, [[K.bytesKey, BY, png]]]);
    return index;
  }
  image(parent, name, assetIndex, x, y, opacity) {
    return this.comp(T.Image, [
      [K.name, S, name],
      [K.parentId, U, parent],
      [K.imageAssetId, U, assetIndex],
      [K.x, D, x],
      [K.y, D, y],
      ...(opacity === undefined ? [] : [[K.opacity, D, opacity]]),
    ]);
  }
  /** Animação linear. `tracks` é uma lista de [objeto, propriedade, (segundos) => valor]. */
  anim(name, seconds, fps, loop, tracks) {
    this.animations.push({
      name,
      frames: Math.max(1, Math.round(seconds * fps)),
      fps,
      loop,
      tracks,
    });
    return this.animations.length - 1;
  }
  /**
   * Máquina de estados. `inputs` são os nomes das entradas numéricas (na ordem dos ids).
   * Cada camada é { name, states: [{ anim, transitions: [...] }] }, e o primeiro estado é o inicial.
   * Uma transição é { to, input?, value?, onExit?, duration? }: `onExit` espera a animação acabar;
   * `input`+`value` dispara quando a entrada vale `value`.
   */
  stateMachine(name, inputs, layers) {
    this.machine = { name, inputs, layers };
  }
  serialize(outputPath, label) {
    const out = new Out();
    for (const ch of "RIVE") out.byte(ch.charCodeAt(0));
    out.varuint(7);
    out.varuint(0);
    out.varuint(0);
    out.varuint(0);
    const writeObj = (type, props) => {
      out.varuint(type);
      for (const [key, kind, value] of props) {
        out.varuint(key);
        if (kind === U) out.varuint(value);
        else if (kind === D) out.f32(value);
        else if (kind === S) out.str(value);
        else if (kind === BY) out.bytes(value);
      }
      out.varuint(0);
    };
    for (const [type, props] of this.fileObjects) writeObj(type, props);
    for (const c of this.comps) writeObj(c.type, c.props);
    let keyframes = 0;
    for (const a of this.animations) {
      writeObj(T.LinearAnimation, [
        [K.animName, S, a.name],
        [K.fps, U, a.fps],
        [K.duration, U, a.frames],
        [K.loop, U, a.loop],
      ]);
      const byObject = new Map();
      for (const t of a.tracks) {
        if (!byObject.has(t[0])) byObject.set(t[0], []);
        byObject.get(t[0]).push(t);
      }
      for (const [objectId, list] of byObject) {
        writeObj(T.KeyedObject, [[K.objectId, U, objectId]]);
        for (const [, prop, fn] of list) {
          writeObj(T.KeyedProperty, [[K.propertyKey, U, prop]]);
          const values = [];
          for (let f = 0; f <= a.frames; f++) values.push(fn(f / a.fps));
          for (let f = 0; f < values.length; f++) {
            const keep =
              f === 0 ||
              f === values.length - 1 ||
              Math.abs(values[f] - (values[f - 1] + values[f + 1]) / 2) > 1e-4;
            if (!keep) continue;
            writeObj(T.KeyFrameDouble, [
              [K.frame, U, f],
              [K.interp, U, 1],
              [K.value, D, values[f]],
            ]);
            keyframes++;
          }
        }
      }
    }
    const machine = this.machine;
    if (machine) {
      writeObj(T.StateMachine, [[K.animName, S, machine.name]]);
      for (const input of machine.inputs)
        writeObj(T.StateMachineNumber, [
          [K.smName, S, input],
          [K.numValue, D, 0],
        ]);
      for (const layer of machine.layers) {
        writeObj(T.StateMachineLayer, [[K.smName, S, layer.name]]);
        // 0 = entrada, 1 = qualquer estado, 2 = saída; os estados da camada começam no id 3
        writeObj(T.EntryState, []);
        writeObj(T.StateTransition, [
          [K.stateToId, U, 3],
          [K.tDuration, U, 0],
        ]);
        writeObj(T.AnyState, []);
        writeObj(T.ExitState, []);
        for (const state of layer.states) {
          writeObj(T.AnimationState, [[K.animationId, U, state.anim]]);
          for (const transition of state.transitions ?? []) {
            const props = [[K.stateToId, U, 3 + transition.to]];
            if (transition.onExit) props.push([K.flags, U, 4 | 8], [K.exitTime, U, 100]);
            props.push([K.tDuration, U, transition.duration ?? 0]);
            writeObj(T.StateTransition, props);
            if (transition.input !== undefined)
              writeObj(NUMBER_CONDITION, [
                [K.inputId, U, machine.inputs.indexOf(transition.input)],
                [K.opValue, U, 0],
                [CONDITION_VALUE, D, transition.value],
              ]);
          }
        }
      }
    }
    const file = Buffer.from(out.b);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, file);
    console.log(
      label ?? outputPath,
      file.length,
      "bytes;",
      this.comps.length,
      "componentes;",
      this.animations.length,
      "animações;",
      keyframes,
      "quadros-chave",
    );
    return file;
  }
}

module.exports = { RiveFile, P, K, T };
