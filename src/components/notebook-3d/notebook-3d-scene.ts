// Cena WebGL do caderno 3D. Carregada sob demanda: só baixa quando o caderno abre em 3D.
import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Quaternion,
  Euler,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShadowMaterial,
  Shape,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from "three";
import type { NotebookTab } from "../../domain/workspace";
import { uiText } from "../../i18n/runtime";
import type { NotebookSoundCue } from "../../data/notebook-sound";
import {
  BOOK,
  DIVIDER,
  RIBBON,
  bendSheet,
  bookmarkDistance,
  clamp,
  dividerCenterZ,
  easeInOut,
  flippedFor,
  leafOfPage,
  peekFan,
  placeTab,
  pointAlong,
  restHeight,
  sheetCount,
  sheetThickness,
  spreadCount,
  stepLeaf,
  viewFor,
  visiblePages,
  type BendPoint,
  type BookView,
  type PlacementResult,
} from "./notebook-3d-model";
import {
  PAGE_UNITS,
  drawBackCover,
  drawClaspStrap,
  drawCover,
  drawCreateCard,
  drawDivider,
  drawEndpaper,
  drawPage,
  drawPageEdges,
  drawSpine,
  paperStar,
} from "./notebook-3d-art";

export type ScenePage = { id: string; title: string; content: string; preview: string };
export type SceneTab = NotebookTab & { pageIndex: number };
export type SceneAssets = {
  bookmarkSprite: string;
};
export type SceneHint = { text: string; x: number; y: number; warn?: boolean };
export type SceneCallbacks = {
  onView: (view: BookView) => void;
  onOpenPage: (index: number) => void;
  onCreatePage: () => void;
  onTabActivate: (tabId: string) => void;
  onTabMoved: (tabId: string, result: PlacementResult) => void;
  onPlace: (kind: "divider" | "bookmark", result: PlacementResult) => void;
  /** Dica curta junto do ponteiro: o que o toque faz ali (abrir, espiar, pôr marca, editar). */
  onHint: (hint: SceneHint | null) => void;
  onSound: (cue: NotebookSoundCue) => void;
};

const {
  pageWidth: W,
  pageHeight: H,
  boardThickness: BT,
  boardWidth: BW,
  boardHeight: BH,
  segmentsX: NX,
  segmentsZ: NZ,
} = BOOK;
const TEXTURE = { width: 1280, height: Math.round((1280 * PAGE_UNITS.height) / PAGE_UNITS.width) };
const CLASP = { z: -H / 2 + 0.56 * H + 0.34, depth: 0.68, length: 0.86 };

type Board = {
  kind: "front" | "back";
  pivot: Group;
  tabs: Group;
  theta: number;
  omega: number;
  curl: number;
  curlSpeed: number;
  target: number;
  drive: Drive | null;
  dragTheta: number | undefined;
  peek: number | undefined;
  hingeY: number;
};
type Sheet = Omit<Board, "kind" | "pivot"> & {
  kind: "sheet";
  index: number;
  group: Group;
  geometry: BufferGeometry;
  front: Mesh;
  back: Mesh;
  frontMaterial: MeshLambertMaterial;
  backMaterial: MeshLambertMaterial;
  rows: BendPoint[][];
  bias: number;
  lead: number;
  dirty: boolean;
};
type Leaf = Board | Sheet;
type Drive = { from: number; to: number; start: number; duration: number };
type PageTexture = {
  canvas: HTMLCanvasElement;
  front: CanvasTexture;
  key: string;
};
type Spark = { mesh: Mesh; velocity: Vector3; spin: number; life: number };

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return element;
}
function texture(source: HTMLCanvasElement, anisotropy: number) {
  const value = new CanvasTexture(source);
  value.colorSpace = SRGBColorSpace;
  value.anisotropy = anisotropy;
  return value;
}
/** Papel e couro são foscos: Lambert dá o mesmo difuso do PBR com bem menos custo por pixel. */
function standard(options: ConstructorParameters<typeof MeshLambertMaterial>[0]) {
  return new MeshLambertMaterial(options);
}
function quad(
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
  up: boolean,
  uv: (x: number, z: number) => [number, number],
) {
  const geometry = new BufferGeometry();
  const corners: [number, number][] = [
    [x0, z0],
    [x1, z0],
    [x0, z1],
    [x1, z1],
  ];
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(corners.flatMap(([x, z]) => [x, y, z])), 3),
  );
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array(corners.flatMap(([x, z]) => uv(x, z))), 2),
  );
  geometry.setIndex(up ? [0, 2, 1, 1, 2, 3] : [0, 1, 2, 1, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}
/** Corpo da capa: retângulo com os dois cantos de fora arredondados, extrudado na espessura. */
function boardGeometry() {
  const radius = (BOOK.boardWidth * 46) / 1200;
  const x0 = -0.04;
  const x1 = BOOK.boardWidth - 0.04;
  const z0 = -BOOK.boardHeight / 2;
  const z1 = BOOK.boardHeight / 2;
  const shape = new Shape();
  shape.moveTo(x0, z0);
  shape.lineTo(x1 - radius, z0);
  shape.quadraticCurveTo(x1, z0, x1, z0 + radius);
  shape.lineTo(x1, z1 - radius);
  shape.quadraticCurveTo(x1, z1, x1 - radius, z1);
  shape.lineTo(x0, z1);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: BOOK.boardThickness,
    bevelEnabled: false,
    curveSegments: 6,
  });
  // A forma é desenhada em x/z; a extrusão vira a espessura (y).
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, BOOK.boardThickness / 2, 0);
  return geometry;
}
function sheetGeometry() {
  const geometry = new BufferGeometry();
  const count = (NX + 1) * (NZ + 1);
  const uv = new Float32Array(count * 2);
  const index: number[] = [];
  for (let i = 0; i <= NX; i++)
    for (let r = 0; r <= NZ; r++) {
      const k = i * (NZ + 1) + r;
      uv[k * 2] = i / NX;
      uv[k * 2 + 1] = 1 - r / NZ;
    }
  for (let i = 0; i < NX; i++)
    for (let r = 0; r < NZ; r++) {
      const a = i * (NZ + 1) + r;
      const b = a + 1;
      const c = a + NZ + 1;
      index.push(a, b, c, c, b, c + 1);
    }
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}
function mirroredUv(source: BufferAttribute) {
  const uv = new Float32Array(source.array.length);
  for (let i = 0; i < uv.length; i += 2) {
    uv[i] = 1 - (source.array[i] as number);
    uv[i + 1] = source.array[i + 1] as number;
  }
  return new BufferAttribute(uv, 2);
}
function disposeTree(root: Object3D) {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const map = (material as MeshLambertMaterial).map;
      if (map && map.userData["owned"]) map.dispose();
      material.dispose();
    }
  });
}

export class NotebookScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(20, 1, 0.1, 200);
  private readonly probe = new PerspectiveCamera(20, 1, 0.1, 200);
  private readonly book = new Group();
  private readonly ray = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly table = new Plane(new Vector3(0, 1, 0), -0.1);
  private readonly anisotropy: number;
  private readonly onVisibility = () => {
    if (!document.hidden) this.wake();
  };
  private leaves: Leaf[] = [];
  private pages: ScenePage[] = [];
  private tabs: SceneTab[] = [];
  private flipped = 0;
  private editingTabs = false;
  private placing: "divider" | "bookmark" | null = null;
  private reduced = false;
  private selected = 1;
  private frame = 0;
  private last = 0;
  private disposed = false;
  /** Só há quadros enquanto algo se move: parado, a cena não gasta CPU nem GPU. */
  private running = false;
  private moving = false;
  private idleFrames = 0;
  private size = { width: 1, height: 1 };
  private ratio = 1;
  private maxRatio = 1;
  private slowFrames = 0;
  private averageDelta = 0;
  private shadows = true;
  private releaseTimer = 0;
  private fitKey = "";
  private fitCache = { high: 14, targetX: 0, targetZ: 0 };
  private readonly corners = Array.from({ length: 16 }, () => new Vector3());
  private readonly scratch = { right: new Vector3(), up: new Vector3(), point: new Vector3() };
  private sun!: DirectionalLight;
  private lights: { light: { intensity: number }; base: number }[] = [];
  /** Folha que sai do caderno até a frente da câmera (ou volta para ele). */
  private flight: {
    mesh: Mesh;
    shadow: Mesh;
    start: number;
    duration: number;
    from: { position: Vector3; quaternion: Quaternion };
    to: { position: Vector3; quaternion: Quaternion };
    entering: boolean;
    resolve: (() => void) | null;
    hidden: { material: MeshLambertMaterial; map: CanvasTexture | null } | null;
    wobble: number;
  } | null = null;
  private settleWaiters: (() => void)[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private readonly stars: { map: CanvasTexture; material: MeshBasicMaterial }[] = [];
  private readonly starGeometry = new PlaneGeometry(0.22, 0.22);
  /** Altura do topo de cada pilha, para a moldura de destaque e o fantasma das marcas. */
  private stackTop = { left: 0, right: 0 };
  private hoverPage: number | null = null;
  private hoverTab: string | null = null;
  private selectedTab: string | null = null;
  private readonly ghosts = new Map<"divider" | "bookmark", Group>();
  /** Recorte amarelo por baixo da marca apontada (claro) e da escolhida (forte). */
  private readonly marks = {
    selected: new MeshBasicMaterial({ color: "#FACC15", side: DoubleSide }),
  };
  private flapOpen = 0;
  private readonly pageTextures = new Map<string, PageTexture>();
  private readonly previews = new Map<string, HTMLImageElement>();
  private readonly ribbons = new Map<string, HTMLImageElement>();
  private readonly sparks: Spark[] = [];
  private readonly coverTexture: CanvasTexture;
  private readonly backTexture: CanvasTexture;
  private readonly endTexture: CanvasTexture;
  private readonly spineTexture: CanvasTexture;
  private readonly edgeTexture: CanvasTexture;
  private readonly createTexture: CanvasTexture;
  private readonly blank: CanvasTexture;
  private readonly boardSide = standard({ color: "#51259b" });
  private readonly spineGeometry = new BufferGeometry();
  private readonly spine: Mesh;
  private readonly rightBlock: Mesh;
  private readonly leftBlock: Mesh;
  private readonly flapA = new Group();
  private readonly flapB = new Group();
  private flapMeshes: Mesh[] = [];
  private readonly createCard: Mesh;
  private leaf0: Mesh | null = null;
  private readonly leaf0Material = standard({});
  private title = "";
  private camState = {
    yaw: 0,
    tilt: 0.3,
    zoom: 1,
    x: 0,
    z: 0,
    distance: 14,
    tiltNow: 0.3,
    yawNow: 0,
    ready: false,
  };
  private focus: {
    index: number;
    amount: number;
    target: number;
    resolve: (() => void) | null;
  } | null = null;
  private drag: {
    x: number;
    y: number;
    moved: boolean;
    mode: "tab" | "place" | "cover" | "backcover" | "fwd" | "back" | "none" | "peek";
    alternate?: "fwd" | "back" | "none";
    tab?: SceneTab;
    leaf?: Leaf;
    bias: number;
    yaw: number;
    tilt: number;
    peek?: number;
  } | null = null;
  private peekState: { spread: number } | null = null;

  constructor(
    private readonly canvasElement: HTMLCanvasElement,
    private readonly assets: SceneAssets,
    private readonly callbacks: SceneCallbacks,
  ) {
    const device = window.devicePixelRatio || 1;
    // Telas de celular passam de 2,5x; acima de 2 o ganho some e a placa de vídeo paga por isso.
    this.maxRatio = this.ratio = Math.min(2, device);
    this.renderer = new WebGLRenderer({
      canvas: canvasElement,
      antialias: device < 2,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(this.ratio);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.setClearColor(new Color(0x000000), 0);
    this.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.book);
    const desk = new Mesh(
      new PlaneGeometry(80, 80),
      new ShadowMaterial({ color: 0x2a1650, opacity: 0.22 }),
    );
    desk.rotation.x = -Math.PI / 2;
    desk.receiveShadow = true;
    this.scene.add(desk);
    const hemisphere = new HemisphereLight(0xffffff, 0xd9ccb6, 1.6);
    const ambient = new AmbientLight(0xffffff, 0.35);
    this.scene.add(hemisphere, ambient);
    const sun = new DirectionalLight(0xfff4e2, 1.9);
    sun.position.set(-5, 11, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 4, far: 26 });
    sun.shadow.bias = -0.0005;
    sun.shadow.radius = 3;
    this.sun = sun;
    const fill = new DirectionalLight(0xd9c8ff, 0.6);
    fill.position.set(6, 4, -4);
    this.scene.add(sun, fill);
    this.lights = [hemisphere, ambient, sun, fill].map((light) => ({
      light,
      base: light.intensity,
    }));
    const owned = (value: CanvasTexture) => ((value.userData["owned"] = false), value);
    const coverCanvas = canvas(1400, Math.round((1400 * BH) / BW));
    this.coverTexture = owned(texture(coverCanvas, this.anisotropy));
    const backCanvas = canvas(1400, Math.round((1400 * BH) / BW));
    drawBackCover(backCanvas.getContext("2d")!, backCanvas.width, backCanvas.height);
    this.backTexture = owned(texture(backCanvas, this.anisotropy));
    const end = canvas(512, Math.round((512 * BH) / BW));
    drawEndpaper(end.getContext("2d")!, end.width, end.height);
    this.endTexture = owned(texture(end, this.anisotropy));
    const spineCanvas = canvas(128, 1024);
    drawSpine(spineCanvas.getContext("2d")!, spineCanvas.width, spineCanvas.height);
    this.spineTexture = owned(texture(spineCanvas, this.anisotropy));
    const edges = canvas(32, 64);
    drawPageEdges(edges.getContext("2d")!, edges.width, edges.height);
    this.edgeTexture = owned(texture(edges, this.anisotropy));
    this.edgeTexture.wrapS = this.edgeTexture.wrapT = RepeatWrapping;
    this.createTexture = owned(
      texture(
        canvas(768, Math.round((768 * PAGE_UNITS.height) / PAGE_UNITS.width)),
        this.anisotropy,
      ),
    );
    const blankCanvas = canvas(16, 16);
    const blankContext = blankCanvas.getContext("2d")!;
    blankContext.fillStyle = "#fffdf7";
    blankContext.fillRect(0, 0, 16, 16);
    this.blank = owned(texture(blankCanvas, this.anisotropy));
    // lombada curva entre as dobradiças das duas capas
    const points = 19;
    this.spineGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(points * 2 * 3), 3),
    );
    const spineUv = new Float32Array(points * 4);
    const spineIndex: number[] = [];
    for (let i = 0; i < points; i++)
      for (let r = 0; r < 2; r++) {
        spineUv[(i * 2 + r) * 2] = i / (points - 1);
        spineUv[(i * 2 + r) * 2 + 1] = r ? 0 : 1;
      }
    for (let i = 0; i < points - 1; i++)
      spineIndex.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    this.spineGeometry.setAttribute("uv", new BufferAttribute(spineUv, 2));
    this.spineGeometry.setIndex(spineIndex);
    this.spine = new Mesh(
      this.spineGeometry,
      standard({ map: this.spineTexture, side: DoubleSide }),
    );
    this.spine.castShadow = true;
    this.book.add(this.spine);
    const edge = standard({ map: this.edgeTexture });
    const cream = standard({ color: "#fbf4e6" });
    this.rightBlock = new Mesh(new BoxGeometry(1, 1, 1), [edge, cream, cream, cream, edge, edge]);
    this.leftBlock = new Mesh(new BoxGeometry(1, 1, 1), [cream, edge, cream, cream, edge, edge]);
    for (const block of [this.rightBlock, this.leftBlock]) {
      block.castShadow = block.receiveShadow = true;
      this.book.add(block);
    }
    this.flapA.add(this.flapB);
    this.createCard = new Mesh(
      quad(0.04, W, -H / 2, H / 2, BT / 2 + 0.004, true, (x, z) => [
        (x - 0.04) / (W - 0.04),
        0.5 - z / H,
      ]),
      new MeshBasicMaterial({ map: this.createTexture, transparent: true }),
    );
    this.drawCoverTexture();
    this.canvasElement.addEventListener("pointerdown", this.pointerDown);
    this.canvasElement.addEventListener("pointermove", this.pointerMove);
    this.canvasElement.addEventListener("pointerup", this.pointerUp);
    this.canvasElement.addEventListener("pointercancel", this.pointerCancel);
    this.canvasElement.addEventListener("pointerleave", this.pointerLeave);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.syncSize();
    this.resizeObserver = new ResizeObserver(() => this.syncSize());
    this.resizeObserver.observe(canvasElement);
    this.wake();
    // Contadores da cena (quadros, chamadas de desenho, texturas) para medir desempenho e testar.
    Object.assign(canvasElement, {
      nb3dStats: () => this.stats(),
      nb3dProject: (x: number, y: number, z: number) => this.projectToScreen(x, y, z),
    });
  }
  frames = 0;
  private compiled = false;
  private paintWaiters: Array<() => void> = [];
  /** Resolve quando o primeiro quadro já foi desenhado (shaders compilados e livro na tela). */
  firstFrame(): Promise<void> {
    if (this.frames > 0) return Promise.resolve();
    return new Promise((resolve) => this.paintWaiters.push(resolve));
  }
  /** Acorda o laço de quadros; ele volta a dormir sozinho quando nada mais se move. */
  private wake() {
    if (this.disposed || this.running) return;
    this.running = true;
    this.idleFrames = 0;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }
  /** Ponto do caderno em coordenadas da tela: usado pelos testes para tocar no lugar certo. */
  projectToScreen(x: number, y: number, z: number) {
    const rect = this.canvasElement.getBoundingClientRect();
    const point = new Vector3(x, y, z).project(this.camera);
    return {
      x: rect.x + ((point.x + 1) / 2) * rect.width,
      y: rect.y + ((1 - point.y) / 2) * rect.height,
    };
  }
  stats() {
    const info = this.renderer.info;
    return {
      frames: this.frames,
      calls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
      programs: info.programs?.length ?? 0,
    };
  }

  // ------------------------------------------------------------------ dados
  setTitle(title: string) {
    if (title === this.title) return;
    this.title = title;
    this.drawCoverTexture();
    this.wake();
  }
  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
  }
  setPlacing(kind: "divider" | "bookmark" | null) {
    this.placing = kind;
    this.clearPeek();
    this.clearHover();
    this.wake();
  }
  setPages(pages: ScenePage[]) {
    const countChanged = pages.length !== this.pages.length || !this.leaves.length;
    this.pages = pages;
    if (countChanged) this.rebuildLeaves();
    else {
      // Mesma quantidade de folhas: só as texturas mudam (uma miniatura nova, um título editado).
      this.syncPages();
      this.wake();
    }
  }
  /** Marca escolhida na edição: fica maior e acesa para a pessoa saber qual vai mudar ou sair. */
  setSelectedTab(id: string | null) {
    if (id === this.selectedTab) return;
    this.selectedTab = id;
    this.highlightTabs();
    this.wake();
  }
  setTabs(tabs: SceneTab[], editing: boolean) {
    this.tabs = tabs;
    this.editingTabs = editing;
    this.rebuildTabs();
    this.wake();
  }
  /** Leva o caderno ao estado pedido. Pular várias folhas folheia em sequência, uma atrás da outra. */
  setView(view: BookView, options: { instant?: boolean } = {}) {
    const next = flippedFor(view, this.pages.length);
    if (next === this.flipped && !options.instant) return;
    const from = this.flipped;
    this.flipped = next;
    this.clearPeek();
    this.syncPages();
    this.wake();
    const selectedSide = visiblePages(next, this.pages.length);
    this.selected = selectedSide[1] ?? selectedSide[0] ?? 0;
    if (options.instant || this.reduced) {
      this.leaves.forEach((leaf, index) => {
        leaf.target = leaf.theta = index < next ? Math.PI : 0;
        leaf.drive = null;
        leaf.omega = 0;
        if (leaf.kind === "sheet") leaf.dirty = true;
      });
      this.flapOpen = next >= 1 ? 1 : 0;
      this.rebuildTabs();
      return;
    }
    const direction = next > from ? 1 : -1;
    const list: number[] = [];
    if (direction > 0) for (let k = from; k < next; k++) list.push(k);
    else for (let k = from - 1; k >= next; k--) list.push(k);
    const many = list.length > 1;
    const coverWait = from === 0 && direction > 0 ? 240 : 0;
    const now = performance.now();
    list.forEach((k, order) => {
      const leaf = this.leaves[k];
      if (!leaf) return;
      if (leaf.kind === "sheet") {
        leaf.lead = 0.45 * direction;
        leaf.bias = 0.5;
      }
      const delay = coverWait + (many ? order * 85 : 0);
      leaf.drive = {
        from: leaf.target,
        to: direction > 0 ? Math.PI : 0,
        start: now + delay,
        duration: leaf.kind !== "sheet" ? 820 : many ? 520 : 760,
      };
      window.setTimeout(() => {
        if (this.disposed) return;
        if (leaf.kind !== "sheet") {
          this.callbacks.onSound("cover");
          if (direction > 0 && leaf.kind === "front") this.burst();
        } else this.callbacks.onSound(many ? "riffle" : "turn");
      }, delay);
    });
    if (coverWait) this.callbacks.onSound("clasp");
    this.rebuildTabs();
  }

  // ------------------------------------------------------------------ entrar e sair da folha
  /** Resolve quando nada mais se move (folheio, câmera, estrelas). */
  whenSettled(): Promise<void> {
    if (!this.running) return Promise.resolve();
    return new Promise((resolve) => this.settleWaiters.push(resolve));
  }
  /**
   * Entrar na folha: ela se solta do caderno, sobe girando até ficar de frente para a pessoa e
   * o caderno escurece atrás. Resolve com o retângulo da folha na tela, de onde o editor continua.
   */
  liftPage(index: number): Promise<DOMRect | null> {
    const pose = this.pagePose(index);
    if (!pose) return Promise.resolve(null);
    this.selected = index;
    this.clearPeek();
    this.clearHover();
    this.callbacks.onHint(null);
    const map = this.pageMap(index);
    this.startFlight(index, map, pose, this.frontPose(), true, this.reduced ? 1 : 620);
    this.burst(new Vector3(pose.position.x, pose.position.y + 0.1, pose.position.z), 10);
    return new Promise((resolve) => {
      this.flight!.resolve = () => resolve(this.flightRect());
    });
  }
  /** Voltar da folha: ela desce da frente da câmera e se encaixa no lugar dela no caderno. */
  returnPage(index: number) {
    const pose = this.pagePose(index);
    if (!pose) return;
    this.selected = index;
    this.startFlight(
      index,
      this.pageMap(index),
      this.frontPose(),
      pose,
      false,
      this.reduced ? 1 : 680,
    );
  }
  private pagePose(index: number) {
    const [left, right] = visiblePages(this.flipped, this.pages.length);
    if (index !== left && index !== right) return null;
    const side = index === right ? 1 : 0;
    const top = side ? this.stackTop.right : this.stackTop.left;
    return {
      position: new Vector3(side ? W / 2 : -W / 2, top + 0.02, 0),
      quaternion: new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0)),
    };
  }
  /** De frente para a câmera, ocupando quase toda a altura (ou largura) da área do caderno. */
  private frontPose() {
    this.camera.updateMatrixWorld();
    const half = Math.tan((this.camera.fov * Math.PI) / 360);
    const distance = Math.max(H / (0.86 * 2 * half), W / (0.9 * 2 * half * this.camera.aspect));
    const forward = new Vector3();
    this.camera.getWorldDirection(forward);
    return {
      position: this.camera.position.clone().addScaledVector(forward, distance),
      quaternion: this.camera.quaternion.clone(),
    };
  }
  private pageMap(index: number) {
    const page = this.pages[index];
    if (!page) return this.blank;
    this.paintPage(page);
    return this.pageTextures.get(page.id)?.front ?? this.blank;
  }
  private materialOf(index: number): MeshLambertMaterial | null {
    if (index === 0) return this.leaf0Material;
    const leaf = this.leaves[1 + Math.floor((index - 1) / 2)];
    if (!leaf || leaf.kind !== "sheet") return null;
    return index % 2 === 1 ? leaf.frontMaterial : leaf.backMaterial;
  }
  private startFlight(
    index: number,
    map: CanvasTexture,
    from: { position: Vector3; quaternion: Quaternion },
    to: { position: Vector3; quaternion: Quaternion },
    entering: boolean,
    duration: number,
  ) {
    this.endFlight(true);
    const mesh = new Mesh(
      new PlaneGeometry(W, H),
      new MeshBasicMaterial({ map, side: DoubleSide }),
    );
    mesh.position.copy(from.position);
    mesh.quaternion.copy(from.quaternion);
    mesh.renderOrder = 3;
    const shadowArt = canvas(128, 160);
    const context = shadowArt.getContext("2d")!;
    const gradient = context.createRadialGradient(64, 80, 10, 64, 80, 80);
    gradient.addColorStop(0, "rgba(41,20,80,0.55)");
    gradient.addColorStop(1, "rgba(41,20,80,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 160);
    const shadowMap = texture(shadowArt, 1);
    shadowMap.userData["owned"] = true;
    const shadow = new Mesh(
      new PlaneGeometry(W * 1.1, H * 1.06),
      new MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: 0 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    const pose = this.pagePose(index);
    shadow.position.copy(pose ? pose.position : from.position);
    shadow.position.y -= 0.01;
    this.scene.add(shadow, mesh);
    // Enquanto a folha está fora, o lugar dela no caderno mostra o papel de baixo.
    const material = this.materialOf(index);
    const hidden = material ? { material, map: material.map as CanvasTexture | null } : null;
    if (material) {
      material.map = this.blank;
      material.needsUpdate = true;
    }
    this.flight = {
      mesh,
      shadow,
      start: performance.now(),
      duration,
      from,
      to,
      entering,
      resolve: null,
      hidden,
      wobble: index % 2 ? 1 : -1,
    };
    this.callbacks.onSound(entering ? "enter" : "exit");
    this.wake();
  }
  private updateFlight(now: number) {
    const flight = this.flight;
    if (!flight) return;
    this.moving = true;
    const t = clamp((now - flight.start) / flight.duration, 0, 1);
    // Sobe rápido e desacelera no fim, com um leve balanço do papel no meio do caminho.
    const eased = flight.entering
      ? 1 - (1 - t) ** 3
      : t < 0.5
        ? 4 * t ** 3
        : 1 - (-2 * t + 2) ** 3 / 2;
    const arc = Math.sin(t * Math.PI);
    flight.mesh.position.lerpVectors(flight.from.position, flight.to.position, eased);
    flight.mesh.position.y += arc * 0.9;
    flight.mesh.quaternion.slerpQuaternions(flight.from.quaternion, flight.to.quaternion, eased);
    flight.mesh.rotateZ(arc * 0.12 * flight.wobble);
    const lifted = flight.entering ? eased : 1 - eased;
    (flight.shadow.material as MeshBasicMaterial).opacity =
      Math.min(1, lifted * 2.2) * (1 - lifted * 0.6);
    // O caderno escurece atrás da folha que sai.
    for (const { light, base } of this.lights) light.intensity = base * (1 - 0.38 * lifted);
    if (t < 1) return;
    const resolve = flight.resolve;
    if (flight.entering) {
      flight.resolve = null;
      resolve?.();
    } else this.endFlight(false);
  }
  /** Tira a folha voadora; ao voltar, ela devolve a textura ao lugar dela no caderno. */
  private endFlight(abort: boolean) {
    const flight = this.flight;
    if (!flight) return;
    this.flight = null;
    this.scene.remove(flight.mesh, flight.shadow);
    flight.mesh.geometry.dispose();
    (flight.mesh.material as MeshBasicMaterial).dispose();
    disposeTree(flight.shadow);
    if (flight.hidden) {
      flight.hidden.material.map = flight.hidden.map;
      flight.hidden.material.needsUpdate = true;
    }
    for (const { light, base } of this.lights) light.intensity = base;
    if (abort) flight.resolve?.();
    this.wake();
  }
  private flightRect() {
    const flight = this.flight;
    if (!flight) return null;
    flight.mesh.updateMatrixWorld();
    const rect = this.canvasElement.getBoundingClientRect();
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [x, y] of [
      [-W / 2, -H / 2],
      [W / 2, -H / 2],
      [-W / 2, H / 2],
      [W / 2, H / 2],
    ] as const) {
      const point = new Vector3(x, y, 0).applyMatrix4(flight.mesh.matrixWorld).project(this.camera);
      xs.push(rect.x + ((point.x + 1) / 2) * rect.width);
      ys.push(rect.y + ((1 - point.y) / 2) * rect.height);
    }
    return new DOMRect(
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    );
  }
  /** Retângulo da capa fechada na tela, de onde a capa segue até a estante. */
  coverScreenRect() {
    const rect = this.canvasElement.getBoundingClientRect();
    const top = restHeight(0, false, this.leaves.length) + BT / 2;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [x, z] of [
      [-0.04, -BH / 2],
      [BW - 0.04, -BH / 2],
      [-0.04, BH / 2],
      [BW - 0.04, BH / 2],
    ] as const) {
      const point = new Vector3(x, top, z).project(this.camera);
      xs.push(rect.x + ((point.x + 1) / 2) * rect.width);
      ys.push(rect.y + ((1 - point.y) / 2) * rect.height);
    }
    return new DOMRect(
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    );
  }
  /** Foto do quadro atual (para o fundo da jornada da folha não ficar em branco). */
  snapshot(): Promise<string> {
    if (this.flight) this.flight.mesh.visible = false;
    this.renderer.render(this.scene, this.camera);
    if (this.flight) this.flight.mesh.visible = true;
    return new Promise((resolve) =>
      this.canvasElement.toBlob(
        (blob) => resolve(blob ? URL.createObjectURL(blob) : ""),
        "image/png",
      ),
    );
  }
  /** Imagem da folha para a jornada ao editor. O codec roda fora da thread principal (toBlob). */
  pageImageUrl(index: number): Promise<string> {
    const page = this.pages[index];
    if (!page) return Promise.resolve("");
    this.paintPage(page);
    const entry = this.textureFor(page);
    return new Promise((resolve) =>
      entry.canvas.toBlob(
        (blob) => resolve(blob ? URL.createObjectURL(blob) : ""),
        "image/webp",
        0.85,
      ),
    );
  }
  /** Brilho de estrelas de papel quando a capa abre ou uma folha nova aparece. */
  burst(at: Vector3 = new Vector3(W * 0.9, 0.4, CLASP.z), count = 18) {
    if (this.reduced) return;
    if (!this.stars.length)
      for (const [seed, fill] of [
        [0.3, "#FACC15"],
        [1.1, "#ffe88d"],
        [1.7, "#FACC15"],
      ] as const) {
        const star = canvas(64, 64);
        paperStar(star.getContext("2d")!, 32, 32, 26, seed, fill, "#B88C13");
        const map = texture(star, 1);
        this.stars.push({
          map,
          material: new MeshBasicMaterial({
            map,
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
          }),
        });
      }
    for (let index = 0; index < count; index++) {
      const mesh = new Mesh(this.starGeometry, this.stars[index % 3]!.material);
      mesh.position.copy(at);
      mesh.rotation.x = -Math.PI / 2;
      this.scene.add(mesh);
      const angle = Math.random() * Math.PI * 2;
      this.sparks.push({
        mesh,
        velocity: new Vector3(
          Math.cos(angle) * (1 + Math.random() * 2),
          2 + Math.random() * 2.5,
          Math.sin(angle) * (1 + Math.random() * 2),
        ),
        spin: (Math.random() - 0.5) * 8,
        life: 1,
      });
    }
    this.wake();
  }
  newPageBurst() {
    const [left, right] = visiblePages(this.flipped, this.pages.length);
    const index = right ?? left;
    if (index === null) return;
    this.burst(new Vector3(index % 2 ? W / 2 : -W / 2, 0.35, 0), 14);
    this.callbacks.onSound("page");
  }

  dispose() {
    this.disposed = true;
    this.endFlight(true);
    cancelAnimationFrame(this.frame);
    this.canvasElement.removeEventListener("pointerdown", this.pointerDown);
    this.canvasElement.removeEventListener("pointermove", this.pointerMove);
    this.canvasElement.removeEventListener("pointerup", this.pointerUp);
    this.canvasElement.removeEventListener("pointercancel", this.pointerCancel);
    this.canvasElement.removeEventListener("pointerleave", this.pointerLeave);
    disposeTree(this.scene);
    for (const value of this.pageTextures.values()) value.front.dispose();
    for (const star of this.stars) {
      star.map.dispose();
      star.material.dispose();
    }
    this.starGeometry.dispose();
    this.marks.selected.dispose();
    window.clearTimeout(this.releaseTimer);
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    for (const value of [
      this.coverTexture,
      this.backTexture,
      this.endTexture,
      this.spineTexture,
      this.edgeTexture,
      this.createTexture,
      this.blank,
    ])
      value.dispose();
    this.renderer.dispose();
  }

  // ------------------------------------------------------------------ texturas
  private drawCoverTexture() {
    const source = this.coverTexture.image as HTMLCanvasElement;
    drawCover(source.getContext("2d")!, source.width, source.height, this.title);
    this.coverTexture.needsUpdate = true;
  }
  private loadPreview(page: ScenePage) {
    if (!page.preview || this.previews.get(page.id)?.src === page.preview) return;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      // A folha pode ter saído da janela enquanto a imagem carregava.
      if (this.disposed || !this.pageTextures.has(page.id)) return;
      this.previews.set(page.id, image);
      this.paintPage(page);
      this.wake();
    };
    image.src = page.preview;
  }
  private textureFor(page: ScenePage) {
    let entry = this.pageTextures.get(page.id);
    if (!entry) {
      const element = canvas(TEXTURE.width, TEXTURE.height);
      entry = { canvas: element, front: texture(element, this.anisotropy), key: "" };
      this.pageTextures.set(page.id, entry);
    }
    return entry;
  }
  /**
   * Só as folhas perto da dupla aberta têm textura (de 1024 por 1365 pixels cada uma). As demais
   * usam o papel em branco até o caderno chegar perto delas: a memória não cresce com as folhas.
   */
  private pageWindow(margin: number): Set<number> {
    const total = this.pages.length;
    const first = this.flipped >= 1 ? (this.flipped - 1) * 2 : 0;
    const near = new Set<number>();
    for (let index = first - margin; index <= first + 1 + margin; index++)
      if (index >= 0 && index < total) near.add(index);
    if (first - margin <= 2 && total) near.add(0);
    return near;
  }
  private syncPages() {
    for (const index of this.pageWindow(2)) {
      const page = this.pages[index]!;
      this.loadPreview(page);
      this.paintPage(page);
    }
    this.assignPages();
    window.clearTimeout(this.releaseTimer);
    // Depois que o folheio assenta, libera a memória das folhas que ficaram longe.
    this.releaseTimer = window.setTimeout(() => this.releaseFar(), 1500);
  }
  private releaseFar() {
    if (this.disposed) return;
    const keep = new Set([...this.pageWindow(4)].map((index) => this.pages[index]?.id));
    for (const [id, entry] of this.pageTextures) {
      if (keep.has(id)) continue;
      entry.front.dispose();
      entry.canvas.width = entry.canvas.height = 0;
      this.pageTextures.delete(id);
      this.previews.delete(id);
    }
    this.assignPages();
    this.wake();
  }
  private assignPages() {
    const mapFor = (page: ScenePage | undefined) =>
      (page && this.pageTextures.get(page.id)?.front) ?? this.blank;
    for (const leaf of this.leaves) {
      if (leaf.kind !== "sheet") continue;
      leaf.frontMaterial.map = mapFor(this.pages[2 * leaf.index + 1]);
      leaf.backMaterial.map = mapFor(this.pages[2 * leaf.index + 2]);
      leaf.frontMaterial.needsUpdate = leaf.backMaterial.needsUpdate = true;
    }
    const first = this.pages[0];
    if (this.leaf0) {
      this.leaf0.visible = Boolean(first);
      this.leaf0Material.map = mapFor(first);
      this.leaf0Material.needsUpdate = true;
    }
  }
  private paintPage(page: ScenePage) {
    const index = this.pages.indexOf(page);
    if (index < 0) return;
    const entry = this.textureFor(page);
    const preview = this.previews.get(page.id) ?? null;
    const key = `${index}|${page.title}|${page.content}|${preview?.src ?? ""}`;
    if (entry.key === key) return;
    entry.key = key;
    const context = entry.canvas.getContext("2d")!;
    context.setTransform(
      TEXTURE.width / PAGE_UNITS.width,
      0,
      0,
      TEXTURE.height / PAGE_UNITS.height,
      0,
      0,
    );
    drawPage(context, { title: page.title, index, content: page.content, preview });
    entry.front.needsUpdate = true;
  }
  private refreshTextures() {
    this.syncPages();
    const context = (this.createTexture.image as HTMLCanvasElement).getContext("2d")!;
    drawCreateCard(
      context,
      this.createTexture.image.width,
      this.createTexture.image.height,
      this.pages.length === 0,
    );
    this.createTexture.needsUpdate = true;
    this.rebuildTabs();
    this.wake();
  }

  // ------------------------------------------------------------------ geometria
  private makeBoard(kind: "front" | "back"): Board {
    const pivot = new Group();
    this.book.add(pivot);
    // Capa dura com os cantos de fora arredondados (a lombada fica reta) e as faces recortadas
    // pela transparência das texturas, no mesmo raio.
    const body = new Mesh(boardGeometry(), this.boardSide);
    body.castShadow = body.receiveShadow = true;
    const faceUv = (x: number, z: number, mirror: boolean): [number, number] => {
      const u = (x + 0.04) / BW;
      return [mirror ? 1 - u : u, 0.5 - z / BH];
    };
    const top = new Mesh(
      quad(-0.04, BW - 0.04, -BH / 2, BH / 2, BT / 2 + 0.001, true, (x, z) => faceUv(x, z, false)),
      standard({ map: kind === "front" ? this.coverTexture : this.endTexture, alphaTest: 0.5 }),
    );
    const bottom = new Mesh(
      quad(-0.04, BW - 0.04, -BH / 2, BH / 2, -BT / 2 - 0.001, false, (x, z) =>
        faceUv(x, z, kind === "back"),
      ),
      standard({ map: kind === "back" ? this.backTexture : this.endTexture, alphaTest: 0.5 }),
    );
    top.receiveShadow = bottom.receiveShadow = true;
    const tabs = new Group();
    pivot.add(body, top, bottom, tabs);
    return {
      kind,
      pivot,
      tabs,
      theta: 0,
      omega: 0,
      curl: 0,
      curlSpeed: 0,
      target: 0,
      drive: null,
      dragTheta: undefined,
      peek: undefined,
      hingeY: 0,
    };
  }
  private makeSheet(index: number): Sheet {
    const geometry = sheetGeometry();
    const frontMaterial = standard({});
    const backMaterial = standard({ side: BackSide });
    // O verso divide posições e normais com a frente e só espelha o UV: uma textura por folha.
    const backGeometry = new BufferGeometry();
    backGeometry.setAttribute("position", geometry.getAttribute("position"));
    backGeometry.setAttribute("normal", geometry.getAttribute("normal"));
    backGeometry.setAttribute("uv", mirroredUv(geometry.getAttribute("uv") as BufferAttribute));
    backGeometry.setIndex(geometry.getIndex());
    const front = new Mesh(geometry, frontMaterial);
    const back = new Mesh(backGeometry, backMaterial);
    back.frustumCulled = false;
    front.castShadow = back.castShadow = front.receiveShadow = back.receiveShadow = true;
    front.userData["page"] = 2 * index + 1;
    back.userData["page"] = 2 * index + 2;
    const group = new Group();
    const tabs = new Group();
    group.add(front, back, tabs);
    this.book.add(group);
    return {
      kind: "sheet",
      index,
      group,
      geometry,
      front,
      back,
      frontMaterial,
      backMaterial,
      tabs,
      rows: [],
      theta: 0,
      omega: 0,
      curl: 0,
      curlSpeed: 0,
      target: 0,
      drive: null,
      dragTheta: undefined,
      peek: undefined,
      hingeY: 0,
      bias: 0.4,
      lead: 0,
      dirty: true,
    };
  }
  private rebuildLeaves() {
    for (const leaf of this.leaves) {
      const root = leaf.kind === "sheet" ? leaf.group : leaf.pivot;
      if (this.leaf0 && root === this.leaf0.parent) root.remove(this.leaf0);
      root.remove(this.createCard, this.flapA);
      this.book.remove(root);
      disposeTree(root);
    }
    const front = this.makeBoard("front");
    const back = this.makeBoard("back");
    this.leaves = [front];
    for (let index = 0; index < sheetCount(this.pages.length); index++)
      this.leaves.push(this.makeSheet(index));
    this.leaves.push(back);
    this.leaf0 = new Mesh(
      quad(0, W, -H / 2, H / 2, -BT / 2 - 0.004, false, (x, z) => [1 - x / W, 0.5 - z / H]),
      this.leaf0Material,
    );
    this.leaf0.receiveShadow = true;
    this.leaf0.userData["page"] = 0;
    front.pivot.add(this.leaf0);
    back.pivot.add(this.createCard, this.flapA);
    this.flapA.position.set(BW - 0.02, 0, CLASP.z);
    this.flipped = Math.min(this.flipped, this.leaves.length);
    this.leaves.forEach((leaf, index) => {
      leaf.theta = leaf.target = index < this.flipped ? Math.PI : 0;
      if (leaf.kind === "sheet") leaf.dirty = true;
    });
    this.buildFlap();
    this.refreshTextures();
    this.layout(true);
  }
  private buildFlap() {
    for (const mesh of this.flapMeshes) {
      mesh.parent?.remove(mesh);
      disposeTree(mesh);
    }
    let total = 0;
    for (let k = 0; k < this.leaves.length; k++)
      total += k === 0 || k === this.leaves.length - 1 ? BT : sheetThickness(this.leaves.length);
    const length = total - BT / 2 + 0.03;
    const material = standard({ color: "#51259b" });
    const strap = new Mesh(new BoxGeometry(length, 0.04, CLASP.depth), material);
    strap.position.x = length / 2;
    strap.castShadow = true;
    this.flapA.add(strap);
    this.flapB.position.x = length;
    const shape = new Shape();
    shape.moveTo(0, -CLASP.depth / 2);
    shape.lineTo(CLASP.length * 0.8, -CLASP.depth / 2);
    shape.lineTo(CLASP.length, 0);
    shape.lineTo(CLASP.length * 0.8, CLASP.depth / 2);
    shape.lineTo(0, CLASP.depth / 2);
    shape.closePath();
    const plateGeometry = new ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
    plateGeometry.rotateX(Math.PI / 2);
    plateGeometry.translate(0, 0.02, 0);
    const uv = plateGeometry.attributes["uv"] as BufferAttribute;
    const position = plateGeometry.attributes["position"] as BufferAttribute;
    for (let index = 0; index < uv.count; index++)
      uv.setXY(
        index,
        position.getX(index) / CLASP.length,
        position.getZ(index) / CLASP.depth + 0.5,
      );
    const strapArt = canvas(256, 200);
    drawClaspStrap(strapArt.getContext("2d")!, strapArt.width, strapArt.height);
    const strapTexture = texture(strapArt, this.anisotropy);
    strapTexture.userData["owned"] = true;
    const plate = new Mesh(plateGeometry, [standard({ map: strapTexture }), material]);
    plate.castShadow = true;
    this.flapB.add(plate);
    const size = 0.27;
    const octagon = new Shape();
    (
      [
        [0.28, 0],
        [0.72, 0],
        [1, 0.28],
        [1, 0.72],
        [0.72, 1],
        [0.28, 1],
        [0, 0.72],
        [0, 0.28],
      ] as const
    ).forEach(([u, v], index) =>
      index
        ? octagon.lineTo((u - 0.5) * size, (v - 0.5) * size)
        : octagon.moveTo((u - 0.5) * size, (v - 0.5) * size),
    );
    octagon.closePath();
    const buttonGeometry = new ExtrudeGeometry(octagon, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 1,
    });
    buttonGeometry.rotateX(Math.PI / 2);
    const button = new Mesh(buttonGeometry, [
      standard({ color: "#FACC15", flatShading: true }),
      standard({ color: "#b68b16", flatShading: true }),
    ]);
    button.position.set(CLASP.length * 0.55, -0.02, 0);
    button.castShadow = true;
    this.flapB.add(button);
    this.flapMeshes = [strap, plate, button];
  }

  // ------------------------------------------------------------------ marcações
  private ribbonImage(tab: SceneTab) {
    const motif = tab.motif ?? "moon";
    const key = motif + tab.color;
    let image = this.ribbons.get(key);
    if (!image) {
      const symbol = new DOMParser()
        .parseFromString(this.assets.bookmarkSprite, "image/svg+xml")
        .getElementById(`${motif}-ribbon-stitched`);
      image = new Image();
      if (symbol) {
        const inner = symbol.innerHTML.replace(/var\(--tab-color, #FACC15\)/g, tab.color);
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.getAttribute("viewBox") ?? "0 0 64 180"}" width="256" height="720">${inner}</svg>`)}`;
      }
      this.ribbons.set(key, image);
    }
    return image;
  }
  private rebuildTabs() {
    if (!this.leaves.length) return;
    for (const leaf of this.leaves) {
      for (const child of [...leaf.tabs.children]) {
        leaf.tabs.remove(child);
        disposeTree(child);
      }
    }
    const [left, right] = visiblePages(this.flipped, this.pages.length);
    for (const tab of this.tabs) {
      if (tab.pageIndex < 0 || tab.pageIndex >= this.pages.length) continue;
      const host = leafOfPage(tab.pageIndex);
      const leaf = this.leaves[host.leaf];
      if (!leaf) continue;
      const buried = tab.pageIndex !== left && tab.pageIndex !== right;
      const onCover = host.leaf === 0;
      const object = this.makeTab(tab, buried, onCover);
      object.userData["tab"] = tab;
      object.userData["front"] = host.front;
      leaf.tabs.add(object);
      if (onCover) {
        const distance = tab.kind === "divider" ? W : bookmarkDistance(tab.position, false);
        object.position.set(
          distance,
          -BT / 2 - 0.007,
          tab.kind === "divider" ? dividerCenterZ(tab.position) : 0,
        );
        object.scale.set(1, -1, 1);
      }
    }
    for (const leaf of this.leaves) if (leaf.kind === "sheet") this.placeTabs(leaf);
    this.highlightTabs();
  }
  private makeTab(tab: SceneTab, buried: boolean, onCover: boolean) {
    const group = new Group();
    const pick: Mesh[] = [];
    if (tab.kind === "divider") {
      const label = tab.label || "";
      const make = (mirror: boolean) => {
        const element = canvas(384, 192);
        drawDivider(
          element.getContext("2d")!,
          element.width,
          element.height,
          label,
          tab.color,
          buried,
          mirror,
        );
        const map = texture(element, this.anisotropy);
        map.userData["owned"] = true;
        return map;
      };
      const geometry = quad(
        -DIVIDER.inside,
        DIVIDER.outside,
        -DIVIDER.height / 2,
        DIVIDER.height / 2,
        0,
        true,
        (x, z) => [
          (x + DIVIDER.inside) / (DIVIDER.inside + DIVIDER.outside),
          0.5 - z / DIVIDER.height,
        ],
      );
      const front = new Mesh(geometry, standard({ map: make(onCover), transparent: true }));
      const back = new Mesh(
        geometry.clone(),
        standard({ map: make(!onCover), transparent: true, side: BackSide }),
      );
      front.castShadow = true;
      group.add(front, back);
      pick.push(front, back);
    } else {
      const image = this.ribbonImage(tab);
      const element = canvas(256, 720);
      const map = texture(element, this.anisotropy);
      map.userData["owned"] = true;
      const paint = () => {
        element.getContext("2d")!.drawImage(image, 0, 0, 256, 720);
        map.needsUpdate = true;
      };
      if (image.complete && image.naturalWidth) paint();
      else image.addEventListener("load", paint, { once: true });
      const z1 = H / 2 + RIBBON.outside;
      const z0 = z1 - RIBBON.length;
      const geometry = quad(-RIBBON.width / 2, RIBBON.width / 2, z0, z1, 0, true, (x, z) => [
        (x + RIBBON.width / 2) / RIBBON.width,
        1 - (z - z0) / RIBBON.length,
      ]);
      const mesh = new Mesh(
        geometry,
        standard({
          map,
          transparent: true,
          alphaTest: 0.05,
          side: DoubleSide,
          color: buried ? "#c9c2d6" : "#ffffff",
        }),
      );
      mesh.castShadow = true;
      group.add(mesh);
      pick.push(mesh);
    }
    group.userData["pick"] = pick;
    return group;
  }
  private placeTabs(leaf: Sheet) {
    if (!leaf.rows.length) return;
    for (const object of leaf.tabs.children) {
      const tab = object.userData["tab"] as SceneTab;
      const front = object.userData["front"] as boolean;
      const z = tab.kind === "divider" ? dividerCenterZ(tab.position) : H / 2 - 0.2;
      const row = leaf.rows[clamp(Math.round(((z + H / 2) / H) * NZ), 0, NZ)]!;
      const [x, y, angle] = pointAlong(
        row,
        tab.kind === "divider" ? W : bookmarkDistance(tab.position, front),
      );
      const lift = (front ? 1 : -1) * (tab.kind === "bookmark" ? 0.005 : 0.002);
      object.position.set(
        x - Math.sin(angle) * lift,
        y + Math.cos(angle) * lift,
        tab.kind === "divider" ? z : 0,
      );
      object.rotation.set(0, 0, angle);
    }
  }

  // ------------------------------------------------------------------ quadro a quadro
  private readonly tick = (now: number) => {
    if (this.disposed) return;
    if (document.hidden) {
      this.running = false;
      return;
    }
    if (!this.compiled) {
      // Os shaders compilam em paralelo, sem travar a tela, antes do primeiro quadro.
      this.compiled = true;
      const resume = () => {
        if (this.disposed) return;
        this.last = performance.now();
        this.frame = requestAnimationFrame(this.tick);
      };
      this.renderer.compileAsync(this.scene, this.camera).then(resume, resume);
      return;
    }
    const delta = (now - this.last) / 1000;
    const dt = Math.min(0.05, delta);
    this.last = now;
    this.moving = false;
    this.step(dt, now);
    this.layout(false);
    this.updateSparks(dt);
    this.updateCamera(dt);
    this.updateFlight(now);
    this.renderer.render(this.scene, this.camera);
    this.frames++;
    if (this.paintWaiters.length) {
      const waiters = this.paintWaiters;
      this.paintWaiters = [];
      for (const resolve of waiters) resolve();
    }
    if (this.moving || this.sparks.length) {
      this.idleFrames = 0;
      this.watchSpeed(delta);
    } else {
      this.slowFrames = 0;
      // Dois quadros extras deixam texturas e sombras assentarem antes de dormir.
      if (++this.idleFrames >= 2) {
        this.running = false;
        // Parado, o quadro volta à resolução cheia: a baixa só vale enquanto algo se move.
        if (this.ratio !== this.maxRatio) {
          this.ratio = this.maxRatio;
          this.renderer.setPixelRatio(this.ratio);
          this.renderer.setSize(this.size.width, this.size.height, false);
          this.renderer.render(this.scene, this.camera);
        }
        const waiters = this.settleWaiters;
        this.settleWaiters = [];
        for (const resolve of waiters) resolve();
        return;
      }
    }
    this.frame = requestAnimationFrame(this.tick);
  };
  /** Aparelho fraco: baixa a resolução e depois as sombras, em vez de entregar quadros lentos. */
  private watchSpeed(delta: number) {
    if (delta > 0.25) return;
    this.averageDelta = this.averageDelta ? this.averageDelta * 0.9 + delta * 0.1 : delta;
    if (this.averageDelta < 0.027) {
      this.slowFrames = 0;
      return;
    }
    if (++this.slowFrames < 24) return;
    this.slowFrames = 0;
    this.averageDelta = 0;
    if (this.ratio > 1.25) {
      this.ratio = Math.max(1.25, this.ratio - 0.25);
      this.renderer.setPixelRatio(this.ratio);
      this.renderer.setSize(this.size.width, this.size.height, false);
    } else if (this.shadows) {
      this.shadows = false;
      this.renderer.shadowMap.enabled = false;
      this.sun.castShadow = false;
      this.scene.traverse((object) => {
        const material = (object as Mesh).material;
        for (const item of Array.isArray(material) ? material : material ? [material] : [])
          item.needsUpdate = true;
      });
    }
  }
  private step(dt: number, now: number) {
    for (const leaf of this.leaves) {
      let goal = leaf.target;
      if (leaf.drive) {
        const drive = leaf.drive;
        if (now >= drive.start) {
          const progress = clamp((now - drive.start) / drive.duration, 0, 1);
          goal = drive.from + (drive.to - drive.from) * easeInOut(progress);
          if (progress >= 1) {
            leaf.drive = null;
            leaf.target = drive.to;
          }
        } else goal = drive.from;
      }
      if (leaf.dragTheta !== undefined) goal = leaf.dragTheta;
      else if (leaf.peek !== undefined && !leaf.drive) goal = leaf.peek;
      if (leaf.drive || leaf.dragTheta !== undefined) this.moving = true;
      const sheet = leaf.kind === "sheet";
      const next = stepLeaf(leaf, goal, dt, {
        dragging: leaf.dragTheta !== undefined,
        sheet,
        lead: sheet ? leaf.lead : 0,
      });
      if (
        sheet &&
        (Math.abs(next.theta - leaf.theta) > 1e-5 || Math.abs(next.curl - leaf.curl) > 1e-5)
      )
        leaf.dirty = true;
      if (
        Math.abs(goal - next.theta) > 1e-3 ||
        Math.abs(next.omega) > 1e-2 ||
        Math.abs(next.curlSpeed) > 1e-2 ||
        Math.abs(next.curl - leaf.curl) > 1e-4
      )
        this.moving = true;
      Object.assign(leaf, next);
    }
    const front = this.leaves[0];
    const wantOpen = this.flipped >= 1 || (front !== undefined && front.theta > 0.04) ? 1 : 0;
    this.flapOpen += (wantOpen - this.flapOpen) * Math.min(1, dt * 9);
    if (Math.abs(wantOpen - this.flapOpen) > 1e-3) this.moving = true;
    if (this.focus) {
      if (this.focus.amount !== this.focus.target) this.moving = true;
      const focus = this.focus;
      const speed = dt * 3.2;
      focus.amount += clamp(focus.target - focus.amount, -speed, speed);
      if (Math.abs(focus.target - focus.amount) < 0.002) {
        focus.amount = focus.target;
        if (focus.resolve) {
          const resolve = focus.resolve;
          focus.resolve = null;
          resolve();
        }
        if (focus.target === 0) this.focus = null;
      }
    }
  }
  private layout(force: boolean) {
    const count = this.leaves.length;
    if (!count) return;
    this.leaves.forEach((leaf, k) => {
      const progress = clamp(leaf.theta / Math.PI, 0, 1);
      const right = restHeight(k, false, count);
      const left = restHeight(k, true, count);
      leaf.hingeY =
        right +
        (left - right) * progress +
        Math.sin(progress * Math.PI) * (leaf.kind === "sheet" ? 0.06 : 0.03);
      if (leaf.kind !== "sheet") {
        leaf.pivot.position.set(0, leaf.hingeY, 0);
        leaf.pivot.rotation.z = leaf.theta;
        return;
      }
      if (!leaf.dirty && !force) return;
      leaf.dirty = false;
      leaf.rows = bendSheet(leaf.theta, leaf.curl, leaf.bias, leaf.hingeY, leaf.rows);
      const position = leaf.geometry.attributes["position"] as BufferAttribute;
      for (let i = 0; i <= NX; i++)
        for (let r = 0; r <= NZ; r++) {
          const point = leaf.rows[r]![i]!;
          position.setXYZ(i * (NZ + 1) + r, point[0], point[1], -H / 2 + (r / NZ) * H);
        }
      position.needsUpdate = true;
      leaf.geometry.computeVertexNormals();
      leaf.geometry.computeBoundingSphere();
      this.placeTabs(leaf);
    });
    const sheets = this.leaves.filter((leaf): leaf is Sheet => leaf.kind === "sheet");
    const restRight = sheets.filter((leaf) => leaf.theta < 0.004 && leaf.target === 0);
    const restLeft = sheets.filter(
      (leaf) => leaf.theta > Math.PI - 0.004 && leaf.target === Math.PI,
    );
    // Folhas paradas sob a de cima não aparecem (o bloco de papel já as representa): menos desenho.
    const topRest = restRight.length ? Math.min(...restRight.map((leaf) => leaf.index)) : -1;
    const topLeftRest = restLeft.length ? Math.max(...restLeft.map((leaf) => leaf.index)) : -1;
    for (const sheet of sheets) {
      const buried =
        (sheet.theta < 0.004 && sheet.target === 0 && sheet.index !== topRest) ||
        (sheet.theta > Math.PI - 0.004 && sheet.target === Math.PI && sheet.index !== topLeftRest);
      sheet.front.visible = sheet.back.visible = !buried;
    }
    const back = this.leaves[count - 1]!;
    const front = this.leaves[0]!;
    const baseRight = back.theta < 0.01 ? BT : 0;
    const baseLeft = front.theta > Math.PI - 0.01 ? BT : 0;
    const topRight = restRight.length
      ? restHeight(1 + Math.min(...restRight.map((leaf) => leaf.index)), false, count) -
        sheetThickness(count) * 0.5
      : baseRight;
    const topLeft = restLeft.length
      ? restHeight(1 + Math.max(...restLeft.map((leaf) => leaf.index)), true, count) -
        sheetThickness(count) * 0.5
      : baseLeft;
    this.stackTop = {
      right: restRight.length ? topRight + sheetThickness(count) * 0.5 : baseRight + BT,
      left: restLeft.length ? topLeft + sheetThickness(count) * 0.5 : baseLeft + BT,
    };
    const heightRight = Math.max(0.0001, topRight - baseRight);
    const heightLeft = Math.max(0.0001, topLeft - baseLeft);
    this.rightBlock.visible = restRight.length > 1;
    this.rightBlock.scale.set(W - 0.03, heightRight, H - 0.01);
    this.rightBlock.position.set(W / 2 + 0.005, baseRight + heightRight / 2, 0);
    this.leftBlock.visible = restLeft.length > 1;
    this.leftBlock.scale.set(W - 0.03, heightLeft, H - 0.01);
    this.leftBlock.position.set(-W / 2 - 0.005, baseLeft + heightLeft / 2, 0);
    this.edgeTexture.repeat.set(1, Math.max(1, Math.round(heightRight / sheetThickness(count))));
    this.flapA.rotation.z = (Math.PI / 2) * (1 - this.flapOpen);
    this.flapB.rotation.z = (Math.PI / 2) * (1 - this.flapOpen);
    const pages = this.pages.length;
    this.createCard.visible =
      this.flipped === 1 + sheetCount(pages) &&
      this.flipped < count &&
      (pages === 0 || pages % 2 === 1) &&
      back.theta < 0.01;
    this.layoutSpine();
  }
  private layoutSpine() {
    const front = this.leaves[0];
    const back = this.leaves[this.leaves.length - 1];
    if (!front || !back) return;
    const directionFront = [Math.cos(front.theta), Math.sin(front.theta)];
    const directionBack = [Math.cos(back.theta), Math.sin(back.theta)];
    const outward = [
      -(directionFront[0]! + directionBack[0]!),
      -(directionFront[1]! + directionBack[1]!),
    ];
    const length = Math.hypot(outward[0]!, outward[1]!);
    const gap = Math.abs(front.hingeY - back.hingeY) + BT;
    const bulge = (gap * 0.5 + 0.02) * (length / 2);
    const normal = length > 1e-3 ? [outward[0]! / length, outward[1]! / length] : [0, -1];
    const control = [
      normal[0]! * bulge * 1.3,
      (front.hingeY + back.hingeY) / 2 + normal[1]! * bulge * 1.3,
    ];
    const position = this.spineGeometry.attributes["position"] as BufferAttribute;
    const points = position.count / 2;
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      const x = 2 * (1 - t) * t * control[0]!;
      const y =
        (1 - t) * (1 - t) * front.hingeY + 2 * (1 - t) * t * control[1]! + t * t * back.hingeY;
      position.setXYZ(i * 2, x, y, -BH / 2);
      position.setXYZ(i * 2 + 1, x, y, BH / 2);
    }
    position.needsUpdate = true;
    this.spineGeometry.computeVertexNormals();
    this.spineGeometry.computeBoundingSphere();
    this.spine.visible = length > 0.05;
  }
  private updateSparks(dt: number) {
    for (let index = this.sparks.length - 1; index >= 0; index--) {
      const spark = this.sparks[index]!;
      spark.life -= dt * 0.9;
      spark.velocity.y -= 6 * dt;
      spark.mesh.position.addScaledVector(spark.velocity, dt);
      spark.mesh.rotation.z += spark.spin * dt;
      // Material e geometria são compartilhados: a estrela some encolhendo, sem alterar os outros.
      spark.mesh.scale.setScalar(clamp(spark.life * 1.4, 0, 1));
      if (spark.life <= 0 || spark.mesh.position.y < 0) {
        this.scene.remove(spark.mesh);
        this.sparks.splice(index, 1);
      }
    }
  }

  // ------------------------------------------------------------------ câmera
  private syncSize() {
    const rect = this.canvasElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (rect.width === this.size.width && rect.height === this.size.height) return;
    this.size = { width: rect.width, height: rect.height };
    this.renderer.setSize(rect.width, rect.height, false);
    this.fitKey = "";
    this.wake();
  }
  /** Procura a distância em que o caderno inteiro cabe na tela; de perto, a folha escolhida fica de frente. */
  private updateCamera(dt: number) {
    const aspect = Math.max(0.3, this.size.width / Math.max(1, this.size.height));
    if (this.camera.aspect !== aspect) {
      this.camera.aspect = this.probe.aspect = aspect;
      this.probe.fov = this.camera.fov;
      this.probe.updateProjectionMatrix();
    }
    const count = this.leaves.length;
    const closedFront = this.flipped === 0;
    const closedBack = this.flipped === count && count > 0;
    // Marcas que saem do caderno entram no enquadramento: o marcador pende por baixo e as
    // divisórias saem pelo lado de fora das folhas (direita ou, nas já viradas, esquerda).
    const hasRibbon = this.tabs.some((tab) => tab.kind === "bookmark" && tab.pageIndex >= 0);
    const firstVisible = this.flipped >= 1 ? (this.flipped - 1) * 2 : 0;
    const hasLeftDivider =
      !closedFront &&
      !closedBack &&
      this.tabs.some(
        (tab) => tab.kind === "divider" && tab.pageIndex >= 0 && tab.pageIndex < firstVisible,
      );
    const bottom = hasRibbon ? RIBBON.outside + 0.36 : 0.2;
    let xr: [number, number] = closedFront
      ? [-0.4, BW + 0.75]
      : closedBack
        ? [-BW - 0.75, 0.4]
        : [-BW - (hasLeftDivider ? DIVIDER.outside + 0.15 : 0.2), BW + 0.95];
    let zr: [number, number] =
      closedFront || closedBack
        ? [-BH / 2 - 0.1, BH / 2 + (hasRibbon ? 0.9 : 0.3)]
        : [-H / 2 - 0.2, H / 2 + bottom];
    const focus = this.focus ? easeInOut(this.focus.amount) : 0;
    if (focus > 0 && this.focus) {
      const side = this.focus.index % 2 === 0 ? -1 : 1;
      const pageX: [number, number] = side < 0 ? [-W - 0.05, 0.05] : [-0.05, W + 0.05];
      xr = [xr[0] + (pageX[0] - xr[0]) * focus, xr[1] + (pageX[1] - xr[1]) * focus];
      zr = [zr[0] + (-H / 2 - 0.05 - zr[0]) * focus, zr[1] + (H / 2 + 0.05 - zr[1]) * focus];
    }
    const smoothing = 1 - Math.exp(-dt * (this.focus ? 14 : 6));
    const tilt = this.camState.tilt + (0.02 - this.camState.tilt) * focus;
    const yaw = this.camState.yaw * (1 - focus);
    if (!this.camState.ready) {
      this.camState.tiltNow = tilt;
      this.camState.yawNow = yaw;
    }
    const before = {
      x: this.camState.x,
      z: this.camState.z,
      distance: this.camState.distance,
      tilt: this.camState.tiltNow,
      yaw: this.camState.yawNow,
    };
    this.camState.tiltNow += (tilt - this.camState.tiltNow) * (this.focus ? 1 : smoothing);
    this.camState.yawNow += (yaw - this.camState.yawNow) * (this.focus ? 1 : smoothing);
    const direction = new Vector3(
      Math.sin(this.camState.yawNow) * Math.sin(this.camState.tiltNow),
      Math.cos(this.camState.tiltNow),
      Math.cos(this.camState.yawNow) * Math.sin(this.camState.tiltNow),
    );
    const centerX = (xr[0] + xr[1]) / 2;
    const centerZ = (zr[0] + zr[1]) / 2;
    // A busca da distância ideal só roda quando o enquadramento muda; parado, vem do cache.
    const key = [
      aspect.toFixed(3),
      xr[0].toFixed(3),
      xr[1].toFixed(3),
      zr[0].toFixed(3),
      zr[1].toFixed(3),
      focus.toFixed(3),
      this.camState.tiltNow.toFixed(4),
      this.camState.yawNow.toFixed(4),
    ].join("|");
    if (key !== this.fitKey) {
      this.fitKey = key;
      this.fitCache = this.fitFrame(xr, zr, direction, centerX, centerZ, focus, aspect);
    }
    const { high, targetX, targetZ } = this.fitCache;
    const distance = high / (this.camState.zoom * (1 - focus) + focus);
    if (!this.camState.ready) {
      Object.assign(this.camState, { x: targetX, z: targetZ, distance, ready: true });
      this.moving = true;
    }
    const k = this.focus ? 1 : smoothing;
    this.camState.x += (targetX - this.camState.x) * k;
    this.camState.z += (targetZ - this.camState.z) * k;
    this.camState.distance += (distance - this.camState.distance) * k;
    if (
      // Abaixo disso a câmera se mexe menos que um centésimo de pixel por quadro.
      Math.abs(this.camState.x - before.x) > 1e-3 ||
      Math.abs(this.camState.z - before.z) > 1e-3 ||
      Math.abs(this.camState.distance - before.distance) > 1e-3 ||
      Math.abs(this.camState.tiltNow - before.tilt) > 1e-4 ||
      Math.abs(this.camState.yawNow - before.yaw) > 1e-4
    )
      this.moving = true;
    this.camera.position.set(
      this.camState.x + direction.x * this.camState.distance,
      direction.y * this.camState.distance,
      this.camState.z + direction.z * this.camState.distance,
    );
    this.camera.lookAt(this.camState.x, 0.1, this.camState.z);
    this.camera.updateProjectionMatrix();
  }
  private fitFrame(
    xr: [number, number],
    zr: [number, number],
    direction: Vector3,
    centerX: number,
    centerZ: number,
    focus: number,
    aspect: number,
  ) {
    let used = 0;
    for (const x of xr)
      for (const z of zr) for (const y of [0, 0.4]) this.corners[used++]!.set(x, y, z);
    const limit = { x: 0.98 - focus * 0.05, y: 0.96 - focus * 0.04 };
    const point = this.scratch.point;
    const fit = (distance: number) => {
      this.probe.position.set(
        centerX + direction.x * distance,
        direction.y * distance,
        centerZ + direction.z * distance,
      );
      this.probe.lookAt(centerX, 0.1, centerZ);
      this.probe.updateMatrixWorld();
      let minX = 9;
      let maxX = -9;
      let minY = 9;
      let maxY = -9;
      for (let index = 0; index < used; index++) {
        point.copy(this.corners[index]!).project(this.probe);
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
      return { minX, maxX, minY, maxY };
    };
    let low = 3;
    let high = 60;
    for (let index = 0; index < 12; index++) {
      const middle = (low + high) / 2;
      const box = fit(middle);
      if (box.maxX - box.minX <= limit.x * 2 && box.maxY - box.minY <= limit.y * 2) high = middle;
      else low = middle;
    }
    const box = fit(high);
    const { right, up } = this.scratch;
    right.setFromMatrixColumn(this.probe.matrixWorld, 0);
    up.setFromMatrixColumn(this.probe.matrixWorld, 1);
    const halfHeight = high * Math.tan((this.camera.fov * Math.PI) / 360);
    const shiftX = -((box.minX + box.maxX) / 2) * halfHeight * aspect;
    const shiftY = -((box.minY + box.maxY) / 2) * halfHeight;
    return {
      high,
      targetX: centerX - (right.x * shiftX + up.x * shiftY),
      targetZ:
        centerZ -
        (right.z * shiftX + up.z * shiftY) / Math.max(0.35, Math.cos(this.camState.tiltNow)),
    };
  }

  // ------------------------------------------------------------------ ponteiro
  /** Onde uma divisória ou marcador arrastado da caixa de ferramentas cairia neste ponto da tela. */
  resolveScreen(
    kind: "divider" | "bookmark",
    clientX: number,
    clientY: number,
  ): PlacementResult | null {
    const rect = this.canvasElement.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom)
      return null;
    this.setRay({ clientX, clientY });
    const point = new Vector3();
    if (!this.ray.ray.intersectPlane(this.table, point)) return null;
    return placeTab(kind, point, visiblePages(this.flipped, this.pages.length));
  }
  private setRay(event: { clientX: number; clientY: number }) {
    const rect = this.canvasElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.ray.setFromCamera(this.pointer, this.camera);
  }
  private hitTable(event: PointerEvent) {
    this.setRay(event);
    const point = new Vector3();
    return this.ray.ray.intersectPlane(this.table, point) ? point : null;
  }
  private pickTab(event: PointerEvent): SceneTab | null {
    this.setRay(event);
    const candidates: Mesh[] = [];
    for (const leaf of this.leaves)
      for (const object of leaf.tabs.children)
        for (const mesh of (object.userData["pick"] as Mesh[] | undefined) ?? []) {
          mesh.userData["owner"] = object;
          candidates.push(mesh);
        }
    const hit = this.ray.intersectObjects(candidates, false)[0];
    return hit ? ((hit.object.userData["owner"] as Object3D).userData["tab"] as SceneTab) : null;
  }
  private readonly pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || this.focus?.target === 1) return;
    this.wake();
    this.canvasElement.setPointerCapture(event.pointerId);
    const point = this.hitTable(event);
    const closed = this.flipped === 0 || this.flipped === this.leaves.length;
    const base = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
      bias: point ? clamp(((point.z + H / 2) / H) * 2 - 1, -1, 1) : 0.4,
      yaw: this.camState.yaw,
      tilt: this.camState.tilt,
    };
    if (this.placing) return void (this.drag = { ...base, mode: "place" });
    const tab = closed ? null : this.pickTab(event);
    if (tab) return void (this.drag = { ...base, mode: "tab", tab });
    if (this.flipped === 0) return void (this.drag = { ...base, mode: "cover" });
    if (this.flipped === this.leaves.length)
      return void (this.drag = { ...base, mode: "backcover" });
    const onRight =
      point !== null && point.x > 0 && point.x < W + 0.15 && Math.abs(point.z) < H / 2 + 0.15;
    const onLeft =
      point !== null && point.x < 0 && point.x > -W - 0.15 && Math.abs(point.z) < H / 2 + 0.15;
    const alternate = onRight ? "fwd" : onLeft ? "back" : "none";
    if (this.peekState)
      this.drag = { ...base, mode: "peek", alternate, peek: this.peekState.spread };
    else this.drag = { ...base, mode: alternate };
  };
  private readonly pointerMove = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag) return this.updateHover(event);
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) drag.moved = true;
    if (!drag.moved) return;
    this.wake();
    // No toque não há "passar por cima": o fantasma da marca segue o dedo até soltar.
    if (drag.mode === "place") return this.updateHover(event);
    if (drag.mode === "peek") {
      this.clearPeek();
      drag.mode = drag.alternate ?? "none";
    }
    const point = this.hitTable(event);
    if (
      drag.mode === "fwd" ||
      drag.mode === "back" ||
      drag.mode === "cover" ||
      drag.mode === "backcover"
    ) {
      const index =
        drag.mode === "fwd"
          ? this.flipped
          : drag.mode === "back"
            ? this.flipped - 1
            : drag.mode === "cover"
              ? 0
              : this.leaves.length - 1;
      const leaf = this.leaves[index];
      if (!leaf || !point) return;
      if (
        (drag.mode === "fwd" && this.flipped >= this.leaves.length) ||
        (drag.mode === "back" && this.flipped <= 0)
      )
        return;
      if (!drag.leaf) this.callbacks.onSound(leaf.kind === "sheet" ? "turn" : "cover");
      leaf.dragTheta = Math.acos(clamp(point.x / (leaf.kind === "sheet" ? W : BW), -1, 1));
      if (leaf.kind === "sheet") {
        leaf.bias = drag.bias;
        leaf.lead = (drag.mode === "fwd" ? 1 : -1) * 0.5;
      }
      drag.leaf = leaf;
      return;
    }
  };
  private readonly pointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    this.wake();
    const point = this.hitTable(event);
    const visible = visiblePages(this.flipped, this.pages.length);
    if (drag.mode === "tab" && drag.tab) {
      if (drag.moved && point)
        this.callbacks.onTabMoved(drag.tab.id, placeTab(drag.tab.kind, point, visible));
      else this.callbacks.onTabActivate(drag.tab.id);
      return;
    }
    if (drag.mode === "place" && this.placing && point) {
      this.hideGhosts();
      this.callbacks.onHint(null);
      return this.callbacks.onPlace(this.placing, placeTab(this.placing, point, visible));
    }
    if (drag.mode === "peek" && !drag.moved && drag.peek !== undefined) {
      this.clearPeek();
      return this.callbacks.onView({ cover: false, back: false, spread: drag.peek });
    }
    if (drag.leaf) {
      const leaf = drag.leaf;
      const theta = leaf.dragTheta ?? leaf.theta;
      leaf.dragTheta = undefined;
      const index = this.leaves.indexOf(leaf);
      const forwardGesture = drag.mode === "fwd" || drag.mode === "cover";
      const forward = forwardGesture
        ? theta > Math.PI * 0.42 || leaf.omega > 4
        : theta > Math.PI * 0.58 && leaf.omega > -4;
      leaf.target = forward ? Math.PI : 0;
      leaf.drive = null;
      const count = this.leaves.length;
      let next = forward ? index + 1 : index;
      // Sem folha para mostrar daquele lado, segue até a contracapa ou volta para a última dupla.
      if (next > 0 && next < count && next - 1 > spreadCount(this.pages.length) - 1)
        next = forward ? count : spreadCount(this.pages.length);
      this.flipped = forward ? index + 1 : index;
      this.syncPages();
      const view = viewFor(next, this.pages.length);
      if (next !== this.flipped) this.setView(view);
      else this.rebuildTabs();
      this.callbacks.onView(view);
      return;
    }
    if (drag.moved) return;
    if (drag.mode === "cover")
      return this.callbacks.onView({ cover: false, back: false, spread: 0 });
    if (drag.mode === "backcover")
      return this.callbacks.onView({
        cover: false,
        back: false,
        spread: spreadCount(this.pages.length) - 1,
      });
    if ((drag.mode === "fwd" || drag.mode === "back") && point) {
      const current = viewFor(this.flipped, this.pages.length);
      if (point.x > W * 0.84) return this.callbacks.onView(this.stepView(current, 1));
      if (point.x < -W * 0.84) return this.callbacks.onView(this.stepView(current, -1));
      if (this.createCard.visible && point.x > 0) return this.callbacks.onCreatePage();
      const index = visible[point.x < 0 ? 0 : 1];
      if (index !== null && index !== undefined) {
        this.selected = index;
        this.callbacks.onOpenPage(index);
      }
    }
  };
  private stepView(view: BookView, direction: 1 | -1): BookView {
    const pages = this.pages.length;
    if (direction > 0)
      return view.spread < spreadCount(pages) - 1
        ? { ...view, spread: view.spread + 1 }
        : { cover: false, back: true, spread: view.spread };
    return view.spread > 0
      ? { ...view, spread: view.spread - 1 }
      : { cover: true, back: false, spread: 0 };
  }
  private readonly pointerCancel = () => {
    if (this.drag?.leaf) this.drag.leaf.dragTheta = undefined;
    this.drag = null;
    this.wake();
  };
  private readonly pointerLeave = () => {
    this.clearPeek();
    this.clearHover();
    this.callbacks.onHint(null);
  };
  private clearPeek() {
    if (!this.peekState) return;
    for (const leaf of this.leaves) leaf.peek = undefined;
    this.peekState = null;
    this.callbacks.onHint(null);
    this.wake();
  }
  // ------------------------------------------------------------------ dicas e destaques
  private setCursor(value: string) {
    if (this.canvasElement.style.cursor !== value) this.canvasElement.style.cursor = value;
  }
  private hint(text: string, event: PointerEvent, warn = false) {
    this.callbacks.onHint({ text, x: event.clientX, y: event.clientY, warn });
  }
  private clearHover() {
    this.hideGhosts();
    this.setHoverTab(null);
    if (this.hoverPage !== null) {
      this.hoverPage = null;
      this.wake();
    }
    this.setCursor("");
  }
  /** O que acontece se a pessoa tocar ali: o ponteiro e a dica mostram antes do toque. */
  private updateHover(event: PointerEvent) {
    const point = this.hitTable(event);
    const count = this.leaves.length;
    const closed = this.flipped === 0 || this.flipped === count;
    if (this.focus || !point) {
      this.clearPeek();
      this.clearHover();
      this.callbacks.onHint(null);
      return;
    }
    if (closed) {
      this.clearHover();
      const onBook =
        Math.abs(point.z) < BH / 2 && (this.flipped === 0 ? point.x > -0.1 : point.x < 0.1);
      this.setCursor(onBook ? "pointer" : "");
      if (onBook) this.hint(this.flipped === 0 ? uiText(744) : uiText(3170), event);
      else this.callbacks.onHint(null);
      return;
    }
    const visible = visiblePages(this.flipped, this.pages.length);
    if (this.placing) {
      this.clearPeek();
      this.setPageHover(null);
      this.setHoverTab(null);
      const result = placeTab(this.placing, point, visible);
      const onBook = Math.abs(point.x) < W + 0.9 && Math.abs(point.z) < H / 2 + 0.6;
      if (result.ok) {
        this.showGhost(this.placing, result);
        this.setCursor("copy");
        this.hint(uiText(3179, [result.page + 1]), event);
      } else {
        this.hideGhosts();
        this.setCursor(onBook ? "not-allowed" : "");
        if (onBook)
          this.hint(
            result.reason === "divider-edge"
              ? uiText(704)
              : result.reason === "bookmark-sheet"
                ? uiText(1829)
                : uiText(1830),
            event,
            true,
          );
        else this.callbacks.onHint(null);
      }
      return;
    }
    this.hideGhosts();
    const tab = this.pickTab(event);
    if (tab) {
      this.clearPeek();
      this.setPageHover(null);
      this.setHoverTab(tab.id);
      this.setCursor("pointer");
      const name = tab.label || (tab.kind === "divider" ? uiText(705) : uiText(1831));
      this.hint(this.editingTabs ? uiText(3180, [name]) : name, event);
      return;
    }
    this.setHoverTab(null);
    if (this.editingTabs) {
      this.clearPeek();
      this.setPageHover(null);
      this.setCursor("");
      this.callbacks.onHint(null);
      return;
    }
    this.updatePeek(event);
    if (this.peekState) {
      this.setPageHover(null);
      this.setCursor("pointer");
      return;
    }
    const right = point.x >= 0;
    const inside = Math.abs(point.z) < H / 2 && Math.abs(point.x) < W;
    if (!inside) {
      this.setPageHover(null);
      this.setCursor("");
      this.callbacks.onHint(null);
      return;
    }
    // A borda de fora vira a folha; o resto abre a folha tocada.
    if (Math.abs(point.x) > W * 0.84) {
      this.setPageHover(null);
      this.setCursor("pointer");
      this.hint(right ? uiText(744) : uiText(1858), event);
      return;
    }
    if (this.createCard.visible && right) {
      this.setPageHover(1);
      this.setCursor("pointer");
      this.hint(this.pages.length ? uiText(746) : uiText(1391), event);
      return;
    }
    const index = visible[right ? 1 : 0];
    if (index === null || index === undefined) {
      this.setPageHover(null);
      this.setCursor("");
      this.callbacks.onHint(null);
      return;
    }
    this.setPageHover(right ? 1 : 0);
    this.setCursor("pointer");
    const page = this.pages[index];
    this.hint(`${uiText(3171, [index + 1])} · ${page?.title || uiText(3177)}`, event);
  }
  /** Folha sob o ponteiro: só o cursor e a dica mudam, sem moldura por cima do caderno. */
  private setPageHover(side: 0 | 1 | null) {
    if (side === this.hoverPage) return;
    this.hoverPage = side;
  }
  private setHoverTab(id: string | null) {
    if (id === this.hoverTab) return;
    this.hoverTab = id;
    this.highlightTabs();
    this.wake();
  }
  /** Só a marca escolhida na edição ganha o recorte amarelo; apontar uma marca só muda a dica. */
  private highlightTabs() {
    for (const leaf of this.leaves)
      for (const object of leaf.tabs.children) {
        const tab = object.userData["tab"] as SceneTab;
        const selected = tab.id === this.selectedTab;
        const old = object.userData["mark"] as Mesh | undefined;
        if (old) {
          object.remove(old);
          old.geometry.dispose();
          delete object.userData["mark"];
        }
        for (const mesh of (object.userData["pick"] as Mesh[] | undefined) ?? [])
          (mesh.material as MeshLambertMaterial).emissive.setHex(
            this.editingTabs && !selected ? 0x0d0a00 : 0,
          );
        if (!selected) continue;
        const pad = 0.07;
        const geometry =
          tab.kind === "divider"
            ? quad(
                -DIVIDER.inside - pad,
                DIVIDER.outside + pad,
                -DIVIDER.height / 2 - pad,
                DIVIDER.height / 2 + pad,
                -0.002,
                true,
                () => [0, 0],
              )
            : quad(
                -RIBBON.width / 2 - pad,
                RIBBON.width / 2 + pad,
                H / 2 + RIBBON.outside - RIBBON.length - pad,
                H / 2 + RIBBON.outside + pad,
                -0.002,
                true,
                () => [0, 0],
              );
        const mark = new Mesh(geometry, this.marks.selected);
        object.add(mark);
        object.userData["mark"] = mark;
      }
  }
  private ghostFor(kind: "divider" | "bookmark") {
    let ghost = this.ghosts.get(kind);
    if (!ghost) {
      ghost = this.makeTab(
        {
          id: `ghost-${kind}`,
          kind,
          pageId: "",
          pageIndex: -1,
          position: 0.5,
          label: kind === "divider" ? uiText(705) : "",
          color: "#7C3AED",
        },
        false,
        false,
      );
      for (const mesh of (ghost.userData["pick"] as Mesh[] | undefined) ?? []) {
        const material = mesh.material as MeshLambertMaterial;
        material.transparent = true;
        material.opacity = 0.78;
        material.emissive.setHex(0x2a1a00);
      }
      ghost.visible = false;
      this.book.add(ghost);
      this.ghosts.set(kind, ghost);
    }
    return ghost;
  }
  /** Fantasma da marca no lugar exato onde ela vai ficar se a pessoa soltar ali. */
  private showGhost(kind: "divider" | "bookmark", result: { page: number; position: number }) {
    const other = this.ghosts.get(kind === "divider" ? "bookmark" : "divider");
    if (other) other.visible = false;
    const ghost = this.ghostFor(kind);
    const visible = visiblePages(this.flipped, this.pages.length);
    const right = result.page === visible[1];
    const top = right ? this.stackTop.right : this.stackTop.left;
    if (kind === "divider") ghost.position.set(W, top + 0.006, dividerCenterZ(result.position));
    else {
      const along = (0.14 + 0.72 * result.position) * W;
      ghost.position.set(right ? along : along - W, top + 0.008, 0);
    }
    ghost.visible = true;
    this.wake();
  }
  private hideGhosts() {
    let changed = false;
    for (const ghost of this.ghosts.values())
      if (ghost.visible) {
        ghost.visible = false;
        changed = true;
      }
    if (changed) this.wake();
  }
  /** Espiar: o ponteiro na borda da pilha levanta as folhas de cima em leque até a folha apontada. */
  private updatePeek(event: PointerEvent) {
    const point = this.hitTable(event);
    const closed = this.flipped === 0 || this.flipped === this.leaves.length;
    if (closed || !point || this.placing || this.editingTabs || this.focus) return this.clearPeek();
    const right = point.x > W - 0.4 && point.x < W + 0.7;
    const left = point.x < -W + 0.4 && point.x > -W - 0.7;
    if ((!right && !left) || Math.abs(point.z) > H / 2 + 0.05) return this.clearPeek();
    const stack = this.leaves.filter(
      (leaf, k): leaf is Sheet =>
        leaf.kind === "sheet" && (right ? k >= this.flipped : k < this.flipped),
    );
    stack.sort((a, b) => (right ? a.index - b.index : b.index - a.index));
    const fan = peekFan(stack.length, point.z);
    if (!fan) return this.clearPeek();
    for (const leaf of this.leaves) leaf.peek = undefined;
    fan.angles.forEach((angle, index) => {
      const leaf = stack[index];
      if (leaf) leaf.peek = right ? angle : Math.PI - angle;
    });
    const target = stack[fan.depth]!;
    const page = right ? 2 * target.index + 1 : 2 * target.index + 2;
    const spread = right ? target.index : target.index + 1;
    if (this.peekState?.spread !== spread) {
      this.callbacks.onSound("riffle");
      this.wake();
    }
    this.peekState = { spread };
    const info = this.pages[page];
    if (info)
      this.callbacks.onHint({
        text: uiText(3174, [page + 1, info.title || uiText(3177)]),
        x: event.clientX,
        y: event.clientY,
      });
  }
}
