import { uiText, useLanguage } from "../../i18n/runtime";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { NotebookTab, StudyNote } from "../../domain/workspace";
import { useMotionReduced } from "../../data/accessibility-preferences";
import type { createNotebookSound } from "../../data/notebook-sound";
import { HelenaLoading } from "../helena-loading";
import { NOTEBOOK_COVER_ART } from "../notebook-cover-art";
import { renderPagePreview } from "../notebook-page-preview";
import type { BookView, PlacementResult } from "./notebook-3d-model";
import type { PlacementResolver } from "../notebook-paper-tools";
import type { NotebookScene, ScenePage } from "./notebook-3d-scene";
import "./notebook-3d.css";

export type Notebook3dProps = {
  title: string;
  pages: StudyNote[];
  tabs: NotebookTab[];
  view: BookView;
  placing: "divider" | "bookmark" | null;
  editingTabs: boolean;
  busy: boolean;
  returningFromPageId?: string | undefined;
  jump?: { pageId: string; nonce: number } | undefined;
  /** Botão "Abrir folha" fora da cena: mesma entrada animada do toque na folha. */
  openRequest?: { pageId: string; nonce: number } | undefined;
  onView: (view: BookView) => void;
  onOpen: (pageId: string) => void;
  onCreate: () => void;
  onTabActivate: (tabId: string) => void;
  onTabMoved: (tabId: string, result: PlacementResult) => void;
  onPlace: (kind: "divider" | "bookmark", result: PlacementResult) => void;
  onUnavailable: () => void;
  /** Arrastar a divisória ou o marcador da caixa de ferramentas até a cena. */
  resolverRef?: RefObject<PlacementResolver | null> | undefined;
};

type Proxy = { pageId: string; rect: DOMRect; image: string };

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/** Caderno 3D: a cena WebGL só é baixada aqui, quando o caderno abre em 3D. */
export function Notebook3dView(props: Notebook3dProps) {
  useLanguage();
  const reduced = useMotionReduced();
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<NotebookScene | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const sound = useRef<ReturnType<typeof createNotebookSound> | null>(null);
  const [ready, setReady] = useState(false);
  const [peek, setPeek] = useState<{ page: number; title: string; x: number; y: number } | null>(
    null,
  );
  const [proxy, setProxy] = useState<Proxy | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const opening = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let disposeSound: (() => void) | null = null;
    void (async () => {
      try {
        const [module, soundModule, cover, olena, sprite] = await Promise.all([
          import("./notebook-3d-scene"),
          import("../../data/notebook-sound"),
          loadImage(NOTEBOOK_COVER_ART),
          loadImage("/notebook-covers/olena-mesa.webp"),
          fetch("/navigation-icons/paper/paper-bookmark.svg")
            .then((response) => (response.ok ? response.text() : ""))
            .catch(() => ""),
          document.fonts?.ready,
        ]);
        if (cancelled || !canvas.current) return;
        const notebookSound = soundModule.createNotebookSound();
        sound.current = notebookSound;
        disposeSound = () => notebookSound.dispose();
        const instance = new module.NotebookScene(
          canvas.current,
          { cover, olena, bookmarkSprite: sprite },
          {
            onView: (view) => latest.current.onView(view),
            onOpenPage: (index) => open(index),
            onCreatePage: () => latest.current.onCreate(),
            onTabActivate: (id) => latest.current.onTabActivate(id),
            onTabMoved: (id, result) => latest.current.onTabMoved(id, result),
            onPlace: (kind, result) => latest.current.onPlace(kind, result),
            onPeek: setPeek,
            onSound: (cue) => notebookSound.play(cue),
          },
        );
        scene.current = instance;
        setReady(true);
      } catch {
        if (!cancelled) latest.current.onUnavailable();
      }
    })();
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
      disposeSound?.();
      sound.current = null;
    };
    // A cena nasce uma vez por caderno; as mudanças de dados chegam pelos efeitos abaixo.
  }, []);

  // Miniaturas reais das folhas, desenhadas pelo mesmo renderizador do editor.
  useEffect(() => {
    let cancelled = false;
    for (const page of props.pages) {
      const asset = page.assets[0];
      if (!asset) continue;
      const key = `${page.id}:${page.updatedAt}`;
      if (previews[key] !== undefined) continue;
      renderPagePreview(asset, 900)
        .then((url) => {
          if (!cancelled) setPreviews((current) => ({ ...current, [key]: url }));
        })
        .catch(() => {
          if (!cancelled) setPreviews((current) => ({ ...current, [key]: "" }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [props.pages, previews]);

  useEffect(() => {
    scene.current?.setReducedMotion(reduced);
  }, [ready, reduced]);
  useEffect(() => {
    scene.current?.setTitle(props.title);
  }, [ready, props.title]);
  useEffect(() => {
    const pages: ScenePage[] = props.pages.map((page) => ({
      id: page.id,
      title: page.title,
      content: page.content,
      preview: previews[`${page.id}:${page.updatedAt}`] ?? "",
    }));
    scene.current?.setPages(pages);
  }, [ready, props.pages, previews]);
  useEffect(() => {
    const index = new Map(props.pages.map((page, position) => [page.id, position]));
    scene.current?.setTabs(
      props.tabs.map((tab) => ({ ...tab, pageIndex: index.get(tab.pageId) ?? -1 })),
      props.editingTabs,
    );
  }, [ready, props.tabs, props.pages, props.editingTabs]);
  useEffect(() => {
    const target = props.resolverRef;
    const instance = scene.current;
    if (!target || !instance) return;
    target.current = (kind, x, y) => instance.resolveScreen(kind, x, y);
    return () => {
      target.current = null;
    };
  }, [ready, props.resolverRef]);
  useEffect(() => {
    scene.current?.setPlacing(props.placing);
  }, [ready, props.placing]);
  // A capa só abre depois que o caderno termina de chegar da estante.
  const firstView = useRef(true);
  useEffect(() => {
    const instance = scene.current;
    if (!instance || props.busy) return;
    if (firstView.current) {
      firstView.current = false;
      const returning = props.pages.findIndex((page) => page.id === props.returningFromPageId);
      if (returning >= 0) {
        instance.setView(props.view, { instant: true });
        instance.startFromPage(returning);
        sound.current?.play("exit");
        return;
      }
      instance.setView({ cover: true, back: false, spread: 0 }, { instant: true });
    }
    instance.setView(props.view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.busy, props.view.cover, props.view.back, props.view.spread]);

  function open(index: number) {
    const instance = scene.current;
    const page = latest.current.pages[index];
    if (!instance || !page || opening.current || latest.current.busy) return;
    opening.current = true;
    sound.current?.play("enter");
    void instance.focusPage(index).then(() => {
      const rect = instance.pageScreenRect(index);
      if (!rect) {
        opening.current = false;
        latest.current.onOpen(page.id);
        return;
      }
      setProxy({ pageId: page.id, rect, image: instance.pageImage(index) });
    });
  }
  // A jornada da folha até o editor parte do cartão posicionado sobre a folha da cena.
  useEffect(() => {
    if (!proxy) return;
    const frame = requestAnimationFrame(() => {
      opening.current = false;
      latest.current.onOpen(proxy.pageId);
    });
    return () => cancelAnimationFrame(frame);
  }, [proxy]);

  useEffect(() => {
    const request = props.openRequest;
    if (!request || !ready) return;
    const index = props.pages.findIndex((page) => page.id === request.pageId);
    if (index >= 0) open(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.openRequest?.nonce]);

  // Índice: folheia até a folha escolhida e entra nela.
  useEffect(() => {
    const jump = props.jump;
    const instance = scene.current;
    if (!jump || !instance || !ready) return;
    const index = props.pages.findIndex((page) => page.id === jump.pageId);
    if (index < 0) return;
    const target: BookView = { cover: false, back: false, spread: Math.floor(index / 2) };
    const distance = Math.abs(target.spread - props.view.spread) + (props.view.cover ? 1 : 0);
    latest.current.onView(target);
    const timer = window.setTimeout(() => open(index), reduced ? 60 : 700 + distance * 85);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.jump?.nonce]);

  return (
    <div
      className="notebook-3d"
      onPointerDownCapture={() => sound.current?.unlock()}
      onKeyDownCapture={() => sound.current?.unlock()}
    >
      <canvas
        ref={canvas}
        className="notebook-3d__canvas"
        role="img"
        aria-label={uiText(3175)}
        data-ready={ready}
      />
      {!ready && (
        <div className="notebook-3d__loading">
          <HelenaLoading label={uiText(3176)} compact />
        </div>
      )}
      {peek && (
        <span
          className="notebook-3d__peek"
          style={{ left: peek.x, top: peek.y }}
          aria-hidden="true"
        >
          {uiText(3174, [peek.page + 1, peek.title || uiText(3177)])}
        </span>
      )}
      {proxy && (
        <article
          className="notebook-sheet notebook-3d__proxy"
          data-page-id={proxy.pageId}
          aria-hidden="true"
          style={{
            left: proxy.rect.x,
            top: proxy.rect.y,
            width: proxy.rect.width,
            height: proxy.rect.height,
          }}
        >
          <div className="notebook-sheet-open">
            <img src={proxy.image} alt="" draggable={false} />
          </div>
        </article>
      )}
    </div>
  );
}
