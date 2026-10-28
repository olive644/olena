// Cena WebGL do caderno 3D. Carregada sob demanda: só baixa quando o caderno abre em 3D.
import {
  AmbientLight,
  BackSide,
  Box3,
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
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
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
  cover: HTMLImageElement | null;
  olena: HTMLImageElement | null;
  pencil: HTMLImageElement | null;
  bookmarkSprite: string;
};
export type SceneCallbacks = {
  onView: (view: BookView) => void;
  onOpenPage: (index: number) => void;
  onCreatePage: () => void;
  onTabActivate: (tabId: string) => void;
  onTabMoved: (tabId: string, result: PlacementResult) => void;
  onPlace: (kind: "divider" | "bookmark", result: PlacementResult) => void;
  onPeek: (peek: { page: number; title: string; x: number; y: number } | null) => void;
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
const TEXTURE = { width: 1024, height: Math.round((1024 * PAGE_UNITS.height) / PAGE_UNITS.width) };
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
  frontMaterial: MeshStandardMaterial;
  backMaterial: MeshStandardMaterial;
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
  mirror: CanvasTexture;
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
function standard(options: ConstructorParameters<typeof MeshStandardMaterial>[0]) {
  return new MeshStandardMaterial({ roughness: 0.86, metalness: 0, ...options });
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
  return geometry;
}
function disposeTree(root: Object3D) {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const map = (material as MeshStandardMaterial).map;
      if (map && map.userData["owned"]) map.dispose();
      material.dispose();
    }
  });
}

export class NotebookScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 0.1, 100);
  private readonly probe = new PerspectiveCamera(30, 1, 0.1, 100);
  private readonly book = new Group();
  private readonly ray = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly table = new Plane(new Vector3(0, 1, 0), -0.1);
  private readonly anisotropy: number;
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
  private readonly boardSide = standard({ color: "#51259b", roughness: 0.7 });
  private readonly spineGeometry = new BufferGeometry();
  private readonly spine: Mesh;
  private readonly rightBlock: Mesh;
  private readonly leftBlock: Mesh;
  private readonly flapA = new Group();
  private readonly flapB = new Group();
  private flapMeshes: Mesh[] = [];
  private readonly createCard: Mesh;
  private leaf0: Mesh | null = null;
  private readonly leaf0Material = standard({ roughness: 0.92 });
  private title = "";
  private camState = {
    yaw: 0.1,
    tilt: 0.86,
    zoom: 1,
    x: 0,
    z: 0,
    distance: 14,
    tiltNow: 0.86,
    yawNow: 0.1,
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
    mode: "tab" | "place" | "cover" | "backcover" | "fwd" | "back" | "orbit" | "peek";
    alternate?: "fwd" | "back" | "orbit";
    tab?: SceneTab;
    leaf?: Leaf;
    bias: number;
    yaw: number;
    tilt: number;
    peek?: number;
  } | null = null;
  private peekState: { spread: number } | null = null;
  private readonly onResize = () => this.resize();

  constructor(
    private readonly canvasElement: HTMLCanvasElement,
    private readonly assets: SceneAssets,
    private readonly callbacks: SceneCallbacks,
  ) {
    this.renderer = new WebGLRenderer({
      canvas: canvasElement,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setClearColor(new Color(0x000000), 0);
    this.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.scene.add(this.book);
    const desk = new Mesh(
      new PlaneGeometry(80, 80),
      new ShadowMaterial({ color: 0x2a1650, opacity: 0.22 }),
    );
    desk.rotation.x = -Math.PI / 2;
    desk.receiveShadow = true;
    this.scene.add(desk);
    this.scene.add(new HemisphereLight(0xffffff, 0xd9ccb6, 1.6), new AmbientLight(0xffffff, 0.35));
    const sun = new DirectionalLight(0xfff4e2, 1.9);
    sun.position.set(-5, 11, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 34 });
    sun.shadow.bias = -0.0005;
    sun.shadow.radius = 5;
    const fill = new DirectionalLight(0xd9c8ff, 0.6);
    fill.position.set(6, 4, -4);
    this.scene.add(sun, fill);
    const owned = (value: CanvasTexture) => ((value.userData["owned"] = false), value);
    const coverCanvas = canvas(1240, Math.round((1240 * BH) / BW));
    this.coverTexture = owned(texture(coverCanvas, this.anisotropy));
    const backCanvas = canvas(1240, Math.round((1240 * BH) / BW));
    drawBackCover(backCanvas.getContext("2d")!, backCanvas.width, backCanvas.height, assets.olena);
    this.backTexture = owned(texture(backCanvas, this.anisotropy));
    const end = canvas(512, 680);
    drawEndpaper(end.getContext("2d")!, end.width, end.height);
    this.endTexture = owned(texture(end, this.anisotropy));
    this.endTexture.wrapS = this.endTexture.wrapT = RepeatWrapping;
    const spineCanvas = canvas(128, 1024);
    drawSpine(spineCanvas.getContext("2d")!, spineCanvas.width, spineCanvas.height);
    this.spineTexture = owned(texture(spineCanvas, this.anisotropy));
    const edges = canvas(32, 64);
    drawPageEdges(edges.getContext("2d")!, edges.width, edges.height);
    this.edgeTexture = owned(texture(edges, this.anisotropy));
    this.edgeTexture.wrapS = this.edgeTexture.wrapT = RepeatWrapping;
    this.createTexture = owned(texture(canvas(TEXTURE.width, TEXTURE.height), this.anisotropy));
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
      standard({ map: this.spineTexture, roughness: 0.8, side: DoubleSide }),
    );
    this.spine.castShadow = true;
    this.book.add(this.spine);
    const edge = standard({ map: this.edgeTexture, roughness: 0.95 });
    const cream = standard({ color: "#fbf4e6", roughness: 0.95 });
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
    this.canvasElement.addEventListener("wheel", this.wheel, { passive: false });
    window.addEventListener("resize", this.onResize);
    this.resize();
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  // ------------------------------------------------------------------ dados
  setTitle(title: string) {
    if (title === this.title) return;
    this.title = title;
    this.drawCoverTexture();
  }
  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
  }
  setPlacing(kind: "divider" | "bookmark" | null) {
    this.placing = kind;
    this.clearPeek();
  }
  setPages(pages: ScenePage[]) {
    const countChanged = pages.length !== this.pages.length || !this.leaves.length;
    this.pages = pages;
    for (const page of pages) this.loadPreview(page);
    if (countChanged) this.rebuildLeaves();
    else this.refreshTextures();
  }
  setTabs(tabs: SceneTab[], editing: boolean) {
    this.tabs = tabs;
    this.editingTabs = editing;
    this.rebuildTabs();
  }
  /** Leva o caderno ao estado pedido. Pular várias folhas folheia em sequência, uma atrás da outra. */
  setView(view: BookView, options: { instant?: boolean } = {}) {
    const next = flippedFor(view, this.pages.length);
    if (next === this.flipped && !options.instant) return;
    const from = this.flipped;
    this.flipped = next;
    this.clearPeek();
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
  /** Câmera desce sobre a folha até ela ficar de frente, como se a pessoa aproximasse o rosto. */
  focusPage(index: number): Promise<void> {
    this.selected = index;
    return new Promise((resolve) => {
      if (this.reduced) {
        this.focus = { index, amount: 1, target: 1, resolve: null };
        resolve();
        return;
      }
      this.focus = { index, amount: this.focus?.amount ?? 0, target: 1, resolve };
    });
  }
  /** Volta da folha: começa de frente para ela e sobe até a vista do caderno. */
  startFromPage(index: number) {
    this.selected = index;
    this.focus = { index, amount: this.reduced ? 0 : 1, target: 0, resolve: null };
  }
  /** Retângulo da folha na tela, para a jornada da folha até o editor começar no lugar certo. */
  pageScreenRect(index: number) {
    const [left, right] = visiblePages(this.flipped, this.pages.length);
    if (index !== left && index !== right) return null;
    const x0 = index === left ? -W : 0;
    const box = new Box3(new Vector3(x0, 0, -H / 2), new Vector3(x0 + W, 0.3, H / 2));
    const rect = this.canvasElement.getBoundingClientRect();
    const corners = [
      [box.min.x, box.min.z],
      [box.max.x, box.min.z],
      [box.min.x, box.max.z],
      [box.max.x, box.max.z],
    ].map(([x, z]) =>
      new Vector3(x, restHeight(1, false, this.leaves.length), z).project(this.camera),
    );
    const xs = corners.map((point) => rect.x + ((point.x + 1) / 2) * rect.width);
    const ys = corners.map((point) => rect.y + ((1 - point.y) / 2) * rect.height);
    return new DOMRect(
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    );
  }
  pageImage(index: number) {
    const page = this.pages[index];
    return page ? (this.pageTextures.get(page.id)?.canvas.toDataURL("image/webp", 0.85) ?? "") : "";
  }
  /** Brilho de estrelas de papel quando a capa abre ou uma folha nova aparece. */
  burst(at: Vector3 = new Vector3(W * 0.9, 0.4, CLASP.z), count = 18) {
    if (this.reduced) return;
    for (let index = 0; index < count; index++) {
      const star = canvas(64, 64);
      paperStar(
        star.getContext("2d")!,
        32,
        32,
        26,
        Math.random() * 2,
        index % 3 ? "#FACC15" : "#ffe88d",
        "#B88C13",
      );
      const map = texture(star, 1);
      map.userData["owned"] = true;
      const mesh = new Mesh(
        new PlaneGeometry(0.22, 0.22),
        new MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: DoubleSide }),
      );
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
    cancelAnimationFrame(this.frame);
    this.canvasElement.removeEventListener("pointerdown", this.pointerDown);
    this.canvasElement.removeEventListener("pointermove", this.pointerMove);
    this.canvasElement.removeEventListener("pointerup", this.pointerUp);
    this.canvasElement.removeEventListener("pointercancel", this.pointerCancel);
    this.canvasElement.removeEventListener("pointerleave", this.pointerLeave);
    this.canvasElement.removeEventListener("wheel", this.wheel);
    window.removeEventListener("resize", this.onResize);
    disposeTree(this.scene);
    for (const value of this.pageTextures.values()) {
      value.front.dispose();
      value.mirror.dispose();
    }
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
    drawCover(source.getContext("2d")!, source.width, source.height, this.assets.cover, this.title);
    this.coverTexture.needsUpdate = true;
  }
  private loadPreview(page: ScenePage) {
    if (!page.preview || this.previews.get(page.id)?.src === page.preview) return;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (this.disposed) return;
      this.previews.set(page.id, image);
      this.paintPage(page);
    };
    image.src = page.preview;
  }
  private textureFor(page: ScenePage) {
    let entry = this.pageTextures.get(page.id);
    if (!entry) {
      const element = canvas(TEXTURE.width, TEXTURE.height);
      const front = texture(element, this.anisotropy);
      const mirror = texture(element, this.anisotropy);
      mirror.wrapS = RepeatWrapping;
      mirror.repeat.x = -1;
      mirror.offset.x = 1;
      entry = { canvas: element, front, mirror, key: "" };
      this.pageTextures.set(page.id, entry);
    }
    return entry;
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
    entry.front.needsUpdate = entry.mirror.needsUpdate = true;
  }
  private refreshTextures() {
    this.pages.forEach((page) => this.paintPage(page));
    for (const leaf of this.leaves) {
      if (leaf.kind !== "sheet") continue;
      const front = this.pages[2 * leaf.index + 1];
      const back = this.pages[2 * leaf.index + 2];
      leaf.frontMaterial.map = front ? this.textureFor(front).front : this.blank;
      leaf.backMaterial.map = back ? this.textureFor(back).mirror : this.blank;
      leaf.frontMaterial.needsUpdate = leaf.backMaterial.needsUpdate = true;
    }
    const first = this.pages[0];
    if (this.leaf0) {
      this.leaf0.visible = Boolean(first);
      if (first) this.leaf0Material.map = this.textureFor(first).front;
      this.leaf0Material.needsUpdate = true;
    }
    const context = (this.createTexture.image as HTMLCanvasElement).getContext("2d")!;
    drawCreateCard(
      context,
      TEXTURE.width,
      TEXTURE.height,
      this.pages.length === 0,
      this.assets.pencil,
    );
    this.createTexture.needsUpdate = true;
    this.rebuildTabs();
  }

  // ------------------------------------------------------------------ geometria
  private makeBoard(kind: "front" | "back"): Board {
    const pivot = new Group();
    this.book.add(pivot);
    const body = new Mesh(new BoxGeometry(BW, BT, BH), this.boardSide);
    body.position.x = BW / 2 - 0.04;
    body.castShadow = body.receiveShadow = true;
    const top = new Mesh(
      quad(-0.04, BW - 0.04, -BH / 2, BH / 2, BT / 2 + 0.001, true, (x, z) =>
        kind === "front" ? [(x + 0.04) / BW, 0.5 - z / BH] : [(x / 0.6) % 1, z / 0.8],
      ),
      standard({ map: kind === "front" ? this.coverTexture : this.endTexture, roughness: 0.6 }),
    );
    const bottom = new Mesh(
      quad(-0.04, BW - 0.04, -BH / 2, BH / 2, -BT / 2 - 0.001, false, (x, z) =>
        kind === "back" ? [1 - (x + 0.04) / BW, 0.5 - z / BH] : [(x / 0.6) % 1, z / 0.8],
      ),
      standard({ map: kind === "back" ? this.backTexture : this.endTexture, roughness: 0.6 }),
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
    const frontMaterial = standard({ roughness: 0.92 });
    const backMaterial = standard({ roughness: 0.92, side: BackSide });
    const front = new Mesh(geometry, frontMaterial);
    const back = new Mesh(geometry, backMaterial);
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
      total += k === 0 || k === this.leaves.length - 1 ? BT : BOOK.sheetThickness;
    const length = total - BT / 2 + 0.03;
    const material = standard({ color: "#51259b", roughness: 0.65 });
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
    const plate = new Mesh(plateGeometry, [
      standard({ map: strapTexture, roughness: 0.6 }),
      material,
    ]);
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
      standard({ color: "#FACC15", roughness: 0.4, flatShading: true }),
      standard({ color: "#b68b16", roughness: 0.5, flatShading: true }),
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
      const front = new Mesh(
        geometry,
        standard({ map: make(onCover), transparent: true, roughness: 0.7 }),
      );
      const back = new Mesh(
        geometry.clone(),
        standard({ map: make(!onCover), transparent: true, side: BackSide, roughness: 0.7 }),
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
          roughness: 0.6,
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
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt, now);
    this.layout(false);
    this.updateSparks(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.tick);
  };
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
      Object.assign(leaf, next);
    }
    const front = this.leaves[0];
    const wantOpen = this.flipped >= 1 || (front !== undefined && front.theta > 0.04) ? 1 : 0;
    this.flapOpen += (wantOpen - this.flapOpen) * Math.min(1, dt * 9);
    if (this.focus) {
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
      leaf.rows = bendSheet(leaf.theta, leaf.curl, leaf.bias, leaf.hingeY);
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
    const back = this.leaves[count - 1]!;
    const front = this.leaves[0]!;
    const baseRight = back.theta < 0.01 ? BT : 0;
    const baseLeft = front.theta > Math.PI - 0.01 ? BT : 0;
    const topRight = restRight.length
      ? restHeight(1 + Math.min(...restRight.map((leaf) => leaf.index)), false, count) -
        BOOK.sheetThickness * 0.5
      : baseRight;
    const topLeft = restLeft.length
      ? restHeight(1 + Math.max(...restLeft.map((leaf) => leaf.index)), true, count) -
        BOOK.sheetThickness * 0.5
      : baseLeft;
    const heightRight = Math.max(0.0001, topRight - baseRight);
    const heightLeft = Math.max(0.0001, topLeft - baseLeft);
    this.rightBlock.visible = restRight.length > 1;
    this.rightBlock.scale.set(W - 0.03, heightRight, H - 0.01);
    this.rightBlock.position.set(W / 2 + 0.005, baseRight + heightRight / 2, 0);
    this.leftBlock.visible = restLeft.length > 1;
    this.leftBlock.scale.set(W - 0.03, heightLeft, H - 0.01);
    this.leftBlock.position.set(-W / 2 - 0.005, baseLeft + heightLeft / 2, 0);
    this.edgeTexture.repeat.set(1, Math.max(1, Math.round(heightRight / BOOK.sheetThickness)));
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
      (spark.mesh.material as MeshBasicMaterial).opacity = clamp(spark.life * 1.4, 0, 1);
      if (spark.life <= 0 || spark.mesh.position.y < 0) {
        this.scene.remove(spark.mesh);
        disposeTree(spark.mesh);
        this.sparks.splice(index, 1);
      }
    }
  }

  // ------------------------------------------------------------------ câmera
  private resize() {
    const rect = this.canvasElement.getBoundingClientRect();
    const ratio = this.renderer.getPixelRatio();
    if (
      this.canvasElement.width !== Math.round(rect.width * ratio) ||
      this.canvasElement.height !== Math.round(rect.height * ratio)
    )
      this.renderer.setSize(rect.width, rect.height, false);
  }
  /** Procura a distância em que o caderno inteiro cabe na tela; de perto, a folha escolhida fica de frente. */
  private updateCamera(dt: number) {
    this.resize();
    const rect = this.canvasElement.getBoundingClientRect();
    const aspect = Math.max(0.3, rect.width / Math.max(1, rect.height));
    this.camera.aspect = this.probe.aspect = aspect;
    this.probe.fov = this.camera.fov;
    this.probe.updateProjectionMatrix();
    const count = this.leaves.length;
    const closedFront = this.flipped === 0;
    const closedBack = this.flipped === count && count > 0;
    const narrow = aspect < 0.85;
    const leftSelected = this.selected % 2 === 0;
    let xr: [number, number] = closedFront
      ? [-0.4, BW + 0.75]
      : closedBack
        ? [-BW - 0.75, 0.4]
        : narrow
          ? leftSelected
            ? [-W - 0.7, 0.55]
            : [-0.55, W + 0.8]
          : [-W - 0.75, W + 0.85];
    let zr: [number, number] =
      closedFront || closedBack ? [-BH / 2 - 0.15, BH / 2 + 0.55] : [-H / 2 - 0.25, H / 2 + 0.75];
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
    this.camState.tiltNow += (tilt - this.camState.tiltNow) * (this.focus ? 1 : smoothing);
    this.camState.yawNow += (yaw - this.camState.yawNow) * (this.focus ? 1 : smoothing);
    const direction = new Vector3(
      Math.sin(this.camState.yawNow) * Math.sin(this.camState.tiltNow),
      Math.cos(this.camState.tiltNow),
      Math.cos(this.camState.yawNow) * Math.sin(this.camState.tiltNow),
    );
    const centerX = (xr[0] + xr[1]) / 2;
    const centerZ = (zr[0] + zr[1]) / 2;
    const corners: Vector3[] = [];
    for (const x of xr)
      for (const z of zr) for (const y of [0, 0.4]) corners.push(new Vector3(x, y, z));
    const limit = { x: 0.95 - focus * 0.05, y: 0.9 - focus * 0.04 };
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
      for (const corner of corners) {
        const point = corner.clone().project(this.probe);
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
      return { minX, maxX, minY, maxY };
    };
    let low = 3;
    let high = 60;
    for (let index = 0; index < 16; index++) {
      const middle = (low + high) / 2;
      const box = fit(middle);
      if (box.maxX - box.minX <= limit.x * 2 && box.maxY - box.minY <= limit.y * 2) high = middle;
      else low = middle;
    }
    const box = fit(high);
    const right = new Vector3().setFromMatrixColumn(this.probe.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(this.probe.matrixWorld, 1);
    const halfHeight = high * Math.tan((this.camera.fov * Math.PI) / 360);
    const shiftX = -((box.minX + box.maxX) / 2) * halfHeight * aspect;
    const shiftY = -((box.minY + box.maxY) / 2) * halfHeight;
    const targetX = centerX - (right.x * shiftX + up.x * shiftY);
    const targetZ =
      centerZ -
      (right.z * shiftX + up.z * shiftY) / Math.max(0.35, Math.cos(this.camState.tiltNow));
    const distance = high / (this.camState.zoom * (1 - focus) + focus);
    if (!this.camState.ready) {
      Object.assign(this.camState, { x: targetX, z: targetZ, distance, ready: true });
    }
    const k = this.focus ? 1 : smoothing;
    this.camState.x += (targetX - this.camState.x) * k;
    this.camState.z += (targetZ - this.camState.z) * k;
    this.camState.distance += (distance - this.camState.distance) * k;
    this.camera.position.set(
      this.camState.x + direction.x * this.camState.distance,
      direction.y * this.camState.distance,
      this.camState.z + direction.z * this.camState.distance,
    );
    this.camera.lookAt(this.camState.x, 0.1, this.camState.z);
    this.camera.updateProjectionMatrix();
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
    const tab = closed ? null : this.pickTab(event);
    if (tab) return void (this.drag = { ...base, mode: "tab", tab });
    if (this.placing) return void (this.drag = { ...base, mode: "place" });
    if (this.flipped === 0) return void (this.drag = { ...base, mode: "cover" });
    if (this.flipped === this.leaves.length)
      return void (this.drag = { ...base, mode: "backcover" });
    const onRight =
      point !== null && point.x > 0 && point.x < W + 0.15 && Math.abs(point.z) < H / 2 + 0.15;
    const onLeft =
      point !== null && point.x < 0 && point.x > -W - 0.15 && Math.abs(point.z) < H / 2 + 0.15;
    const alternate = onRight ? "fwd" : onLeft ? "back" : "orbit";
    if (this.peekState)
      this.drag = { ...base, mode: "peek", alternate, peek: this.peekState.spread };
    else this.drag = { ...base, mode: alternate };
  };
  private readonly pointerMove = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag) return this.updatePeek(event);
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) drag.moved = true;
    if (!drag.moved) return;
    if (drag.mode === "peek") {
      this.clearPeek();
      drag.mode = drag.alternate ?? "orbit";
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
    if (drag.mode === "orbit") {
      this.camState.yaw = clamp(drag.yaw + (event.clientX - drag.x) * 0.004, -0.7, 0.7);
      this.camState.tilt = clamp(drag.tilt + (event.clientY - drag.y) * 0.003, 0.2, 1.15);
    }
  };
  private readonly pointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    const point = this.hitTable(event);
    const visible = visiblePages(this.flipped, this.pages.length);
    if (drag.mode === "tab" && drag.tab) {
      if (drag.moved && point)
        this.callbacks.onTabMoved(drag.tab.id, placeTab(drag.tab.kind, point, visible));
      else this.callbacks.onTabActivate(drag.tab.id);
      return;
    }
    if (drag.mode === "place" && this.placing && point)
      return this.callbacks.onPlace(this.placing, placeTab(this.placing, point, visible));
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
  };
  private readonly pointerLeave = () => this.clearPeek();
  private readonly wheel = (event: WheelEvent) => {
    event.preventDefault();
    this.camState.zoom = clamp(this.camState.zoom * (event.deltaY > 0 ? 0.9 : 1.1), 0.6, 3);
  };
  private clearPeek() {
    if (!this.peekState) return;
    for (const leaf of this.leaves) leaf.peek = undefined;
    this.peekState = null;
    this.callbacks.onPeek(null);
  }
  /** Espiar: o ponteiro na borda da pilha levanta as folhas de cima em leque até a folha apontada. */
  private updatePeek(event: PointerEvent) {
    const point = this.hitTable(event);
    const closed = this.flipped === 0 || this.flipped === this.leaves.length;
    if (closed || !point || this.placing || this.focus) return this.clearPeek();
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
    if (this.peekState?.spread !== spread) this.callbacks.onSound("riffle");
    this.peekState = { spread };
    const info = this.pages[page];
    if (info)
      this.callbacks.onPeek({ page, title: info.title, x: event.clientX, y: event.clientY });
  }
}
