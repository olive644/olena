import { uiText, useLanguage } from "../../i18n/runtime";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { NotebookTab, StudyNote } from "../../domain/workspace";
import { useMotionReduced } from "../../data/accessibility-preferences";
import type { createNotebookSound } from "../../data/notebook-sound";
import { HelenaLoading } from "../helena-loading";
import { renderPagePreview } from "../notebook-page-preview";
import type { BookView, PlacementResult } from "./notebook-3d-model";
import type { PlacementResolver } from "../notebook-paper-tools";
import type { NotebookScene, SceneHint, ScenePage } from "./notebook-3d-scene";
import { registerNotebook3dCloser } from "./notebook-3d-support";
import "./notebook-3d.css";

export type Notebook3dProps = {
  title: string;
  pages: StudyNote[];
  tabs: NotebookTab[];
  view: BookView;
  placing: "divider" | "bookmark" | null;
  editingTabs: boolean;
  selectedTabId?: string | null | undefined;
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

const PREVIEW_REACH = 8;

type Proxy = { pageId: string; rect: DOMRect; image: string };

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
  const [hint, setHint] = useState<SceneHint | null>(null);
  const [proxy, setProxy] = useState<Proxy | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const opening = useRef(false);
  const cache = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    let disposeSound: (() => void) | null = null;
    void (async () => {
      try {
        const [module, soundModule, sprite] = await Promise.all([
          import("./notebook-3d-scene"),
          import("../../data/notebook-sound"),
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
          { bookmarkSprite: sprite },
          {
            onView: (view) => latest.current.onView(view),
            onOpenPage: (index) => open(index),
            onCreatePage: () => latest.current.onCreate(),
            onTabActivate: (id) => latest.current.onTabActivate(id),
            onTabMoved: (id, result) => latest.current.onTabMoved(id, result),
            onPlace: (kind, result) => latest.current.onPlace(kind, result),
            onHint: setHint,
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

  // Miniaturas reais das folhas, desenhadas pelo mesmo renderizador do editor. Só as folhas perto
  // da dupla aberta são desenhadas, uma por vez e começando pelas mais próximas: abrir um caderno
  // grande não trava a tela, e as folhas distantes nem ocupam memória.
  const center = props.view.cover
    ? 0
    : props.view.back
      ? props.pages.length - 1
      : props.view.spread * 2;
  useEffect(() => {
    let cancelled = false;
    const wanted = props.pages
      .map((page, index) => ({ page, index }))
      .filter(({ index }) => Math.abs(index - center) <= PREVIEW_REACH)
      .sort((a, b) => Math.abs(a.index - center) - Math.abs(b.index - center));
    const keys = new Set(wanted.map(({ page }) => `${page.id}:${page.updatedAt}`));
    const seen = cache.current;
    // Junto de cada miniatura nova saem as que ficaram fora da janela.
    const keep = (current: Record<string, string>, key: string, url: string) => {
      const next: Record<string, string> = { [key]: url };
      for (const [name, value] of Object.entries(current)) if (keys.has(name)) next[name] = value;
      return next;
    };
    void (async () => {
      for (const { page } of wanted) {
        if (cancelled) return;
        const asset = page.assets[0];
        const key = `${page.id}:${page.updatedAt}`;
        if (!asset || seen.has(key)) continue;
        seen.add(key);
        try {
          const url = await renderPagePreview(asset, 768);
          if (!cancelled) setPreviews((current) => keep(current, key, url));
        } catch {
          if (!cancelled) setPreviews((current) => keep(current, key, ""));
        }
        await new Promise((resolve) => window.setTimeout(resolve, 24));
      }
    })();
    return () => {
      cancelled = true;
      // O que não terminou volta para a fila na próxima janela.
      for (const key of [...seen]) if (!keys.has(key)) seen.delete(key);
    };
  }, [props.pages, center]);

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
  // Voltar para a estante: o caderno folheia até a capa, fecha e só então a capa viaja.
  useEffect(() => {
    const instance = scene.current;
    if (!instance) return;
    return registerNotebook3dCloser(async () => {
      const closed: BookView = { cover: true, back: false, spread: 0 };
      instance.setView(closed);
      latest.current.onView(closed);
      await instance.whenSettled();
      return instance.coverScreenRect();
    });
  }, [ready]);
  useEffect(() => {
    scene.current?.setSelectedTab(props.selectedTabId ?? null);
  }, [ready, props.selectedTabId]);
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
        instance.returnPage(returning);
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
    // O arquivo da imagem é gerado enquanto a folha sobe do caderno.
    const image = instance.pageImageUrl(index);
    void instance.liftPage(index).then(async (rect) => {
      if (!rect) {
        opening.current = false;
        latest.current.onOpen(page.id);
        return;
      }
      // O fundo da jornada até o editor é a foto do caderno escurecido, sem a folha que saiu.
      const shot = await instance.snapshot();
      if (canvas.current) canvas.current.dataset["snapshot"] = shot;
      if (shot) window.setTimeout(() => URL.revokeObjectURL(shot), 6000);
      setProxy({ pageId: page.id, rect, image: await image });
    });
  }
  // A jornada da folha até o editor parte do cartão posicionado sobre a folha da cena.
  useEffect(() => {
    const url = proxy?.image;
    // A jornada copia a imagem logo ao abrir; o arquivo temporário sai depois que ela terminou.
    return () => {
      if (url?.startsWith("blob:")) window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
  }, [proxy?.image]);
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
      {hint && (
        <span
          className={`notebook-3d__peek${hint.warn ? " is-warn" : ""}`}
          style={{ left: hint.x, top: hint.y }}
          aria-hidden="true"
        >
          {hint.text}
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
