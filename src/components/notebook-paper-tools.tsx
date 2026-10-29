import { uiText, useLanguage } from "../i18n/runtime";
import {
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  createWorkspaceId,
  type NotebookTab,
  type StudyNote,
  type StudyNotebook,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import { PaperEditorIcon } from "./paper-editor-icon";
import { PaperMoonMark } from "./paper-moon-mark";
import type { PlacementResult } from "./notebook-3d/notebook-3d-model";

const colors = ["#7C3AED", "#287D69", "#AC365E", "#FACC15", "#5887C9"];
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function notebookPaperTabs(
  notebook: StudyNotebook,
  pages: StudyNote[],
  subjects: WorkspaceState["subjects"],
): NotebookTab[] {
  if (notebook.paperTabs)
    return notebook.paperTabs.filter((tab) => pages.some((page) => page.id === tab.pageId));
  const ids = [
    ...new Set([...(notebook.subjectIds ?? []), ...pages.map((page) => page.subjectId)]),
  ].filter(Boolean);
  const dividers: NotebookTab[] = ids.flatMap((id, index) => {
    const subject = subjects.find((item) => item.id === id);
    const page = pages.find((item) => item.subjectId === id) ?? pages[0];
    return subject && page
      ? [
          {
            id: `divider-${id}`,
            kind: "divider",
            pageId: page.id,
            label: subject.name,
            color: /^#[\da-f]{6}$/i.test(subject.color) ? subject.color : colors[0]!,
            position: (index + 1) / (ids.length + 1),
          },
        ]
      : [];
  });
  return [
    ...dividers,
    ...pages
      .filter((page) => notebook.bookmarkedPageIds?.includes(page.id))
      .map((page, index): NotebookTab => ({
        id: `bookmark-${page.id}`,
        kind: "bookmark",
        pageId: page.id,
        label: page.title,
        color: colors[3]!,
        position: 0.35 + (index % 3) * 0.15,
      })),
  ];
}

export { PaperMoonMark } from "./paper-moon-mark";

export function PaperTabIcon({ kind }: { kind: NotebookTab["kind"] }) {
  useLanguage();

  if (kind === "bookmark") return <PaperMoonMark className="paper-tab-icon" compact />;
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="paper-tab-icon">
      <use href="/navigation-icons/paper/notebook-divider-0.svg#art" />
    </svg>
  );
}

type Props = {
  notebook: StudyNotebook;
  pages: StudyNote[];
  subjects: WorkspaceState["subjects"];
  visible: StudyNote[];
  dispatch: Dispatch<WorkspaceAction>;
  onJump: (pageId: string) => void;
  disabled: boolean;
  coverControl: ReactNode;
  backControl?: ReactNode;
  indexControl?: ReactNode;
  /** Último botão da caixa de ferramentas (no caderno 3D, o de nova folha). */
  endControl?: ReactNode;
  /** No caderno 3D, a cena desenha as marcas e resolve onde cada toque cai. */
  scene?: boolean;
  resolverRef?: RefObject<PlacementResolver | null>;
  children: ReactNode | ((scene: PaperToolsScene) => ReactNode);
};

export type PaperToolsScene = {
  tool: NotebookTab["kind"] | null;
  editing: boolean;
  selectedId: string | null;
  /** A caixa de ferramentas pronta, para o caderno 3D encaixar onde quiser. */
  toolbar: ReactNode;
  /** Instrução da ferramenta ativa, ou da ação padrão quando não há nenhuma. */
  hint: string;
  /** Sai de qualquer ferramenta ativa (marcar, editar). */
  cancel: () => void;
  placeResolved: (kind: NotebookTab["kind"], result: PlacementResult, id?: string) => void;
  activateTab: (id: string) => void;
};
export type PlacementResolver = (
  kind: NotebookTab["kind"],
  x: number,
  y: number,
) => PlacementResult | null;

export function NotebookPaperTools({
  notebook,
  pages,
  subjects,
  visible,
  dispatch,
  onJump,
  disabled,
  coverControl,
  backControl,
  indexControl,
  endControl,
  scene = false,
  resolverRef,
  children,
}: Props) {
  useLanguage();

  const mount = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    kind: NotebookTab["kind"];
    id?: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [tool, setTool] = useState<NotebookTab["kind"] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [ghost, setGhost] = useState<{ kind: NotebookTab["kind"]; x: number; y: number } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const tabs = notebookPaperTabs(notebook, pages, subjects);
  const selected = tabs.find((tab) => tab.id === selectedId);

  function save(next: NotebookTab[]) {
    dispatch({ type: "notebook/organized", id: notebook.id, changes: { paperTabs: next } });
  }
  function update(tab: NotebookTab, changes: Partial<NotebookTab>) {
    save(tabs.map((item) => (item.id === tab.id ? { ...item, ...changes } : item)));
  }
  function placeResolved(kind: NotebookTab["kind"], result: PlacementResult, id?: string) {
    if (disabled) return;
    if (!result.ok) {
      setMessage(
        result.reason === "divider-edge"
          ? uiText(704)
          : result.reason === "bookmark-sheet"
            ? uiText(1829)
            : uiText(1830),
      );
      return;
    }
    const page = pages[result.page];
    if (!page) {
      setMessage(uiText(1830));
      return;
    }
    commit(kind, page, result.position, id);
  }
  function activateTab(id: string) {
    const tab = tabs.find((item) => item.id === id);
    if (!tab) return;
    setTool(null);
    if (editing) setSelectedId(tab.id);
    else {
      setSelectedId(null);
      onJump(tab.pageId);
    }
  }
  function place(kind: NotebookTab["kind"], x: number, y: number, id?: string) {
    const resolved = resolverRef?.current?.(kind, x, y);
    if (resolved) return placeResolved(kind, resolved, id);
    const rect = mount.current?.getBoundingClientRect();
    if (!rect || !visible.length || disabled) return;
    const inside =
      x >= rect.left - 12 && x <= rect.right + 70 && y >= rect.top - 12 && y <= rect.bottom + 55;
    if (!inside || (kind === "divider" && x < rect.left + rect.width * 0.65)) {
      setMessage(kind === "divider" ? uiText(704) : uiText(1829));
      return;
    }
    const side = x < rect.left + rect.width / 2 ? 0 : 1;
    const page = kind === "divider" ? (visible[1] ?? visible[0]) : visible[side];
    if (!page) {
      setMessage(uiText(1830));
      return;
    }
    const position =
      kind === "divider"
        ? clamp((y - rect.top - 22) / Math.max(1, rect.height - 66))
        : clamp((((x - rect.left) / rect.width) * 2 - side - 0.14) / 0.72);
    commit(kind, page, position, id);
  }
  function commit(kind: NotebookTab["kind"], page: StudyNote, position: number, id?: string) {
    const previous = tabs.find((tab) => tab.id === id);
    const next: NotebookTab = previous
      ? { ...previous, pageId: page.id, position }
      : {
          id: createWorkspaceId("tab"),
          kind,
          pageId: page.id,
          position,
          label: kind === "divider" ? uiText(705) : uiText(1831),
          color: kind === "divider" ? colors[0]! : colors[3]!,
        };
    save(previous ? tabs.map((tab) => (tab.id === id ? next : tab)) : [...tabs, next]);
    setSelectedId(next.id);
    setTool(null);
    setMessage(
      `${kind === "divider" ? uiText(705) : uiText(1831)} na folha ${pages.indexOf(page) + 1}.`,
    );
  }
  function start(event: PointerEvent<HTMLButtonElement>, kind: NotebookTab["kind"], id?: string) {
    if (event.button !== 0 || disabled) return;
    event.stopPropagation();
    gesture.current = {
      kind,
      ...(id ? { id } : {}),
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressClick.current = false;
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    if (!active) return;
    if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 6) active.moved = true;
    if (active.moved) setGhost({ kind: active.kind, x: event.clientX, y: event.clientY });
  }
  function end(event: PointerEvent<HTMLButtonElement>) {
    const active = gesture.current;
    gesture.current = null;
    setGhost(null);
    if (!active?.moved) return;
    suppressClick.current = true;
    place(active.kind, event.clientX, event.clientY, active.id);
  }
  function click(action: () => void) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    action();
  }
  const pointerHandlers = {
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: () => {
      gesture.current = null;
      setGhost(null);
      suppressClick.current = true;
    },
  };
  const toolHint =
    tool === "divider"
      ? uiText(1834)
      : tool === "bookmark"
        ? uiText(1835)
        : editing
          ? uiText(710)
          : uiText(711);
  const toolbox = (
    <div
      className={`notebook-paper-toolbox${scene ? " is-scene" : ""}`}
      role="toolbar"
      aria-label={uiText(706)}
    >
      {backControl}
      {coverControl}
      {(["divider", "bookmark"] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          className="notebook-paper-tool"
          disabled={!pages.length || disabled}
          aria-pressed={tool === kind}
          aria-label={kind === "divider" ? uiText(707) : uiText(1832)}
          title={uiText(708)}
          onPointerDown={(event) => start(event, kind)}
          {...pointerHandlers}
          onClick={() =>
            click(() => {
              setTool(tool === kind ? null : kind);
              setSelectedId(null);
            })
          }
        >
          <PaperTabIcon kind={kind} />
          <span>{kind === "divider" ? uiText(705) : uiText(1831)}</span>
        </button>
      ))}
      <div className="notebook-toolbar-secondary">
        <button
          type="button"
          className="notebook-paper-tool"
          aria-pressed={editing}
          aria-label={editing ? uiText(709) : uiText(1833)}
          title={editing ? uiText(709) : uiText(1833)}
          disabled={(!tabs.length && !editing) || disabled}
          onClick={() => {
            setEditing(!editing);
            setSelectedId(null);
            setTool(null);
          }}
        >
          <PaperEditorIcon name={editing ? "save" : "pen"} />
          <span>{editing ? uiText(709) : uiText(1833)}</span>
        </button>
        {indexControl}
        {endControl}
      </div>
      <span className="notebook-tool-hint">{toolHint}</span>
    </div>
  );
  return (
    <div
      className="notebook-workbench"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setTool(null);
          setSelectedId(null);
          setGhost(null);
          gesture.current = null;
        }
      }}
    >
      {!scene && toolbox}
      {selected && (
        <div className="notebook-tab-inspector" role="group" aria-label={uiText(712)}>
          <label>
            {uiText(713)}
            <input
              aria-label={uiText(714)}
              maxLength={32}
              value={selected.label}
              onChange={(event) => update(selected, { label: event.target.value })}
            />
          </label>
          <div className="notebook-tab-colors" role="group" aria-label={uiText(715)}>
            {colors.map((color, index) => (
              <button
                type="button"
                key={color}
                aria-label={
                  [uiText(1568), uiText(1571), uiText(1570), uiText(1569), uiText(1572)][index]
                }
                aria-pressed={selected.color === color}
                style={{ "--tab-color": color } as CSSProperties}
                onClick={() => update(selected, { color })}
              >
                <span />
              </button>
            ))}
          </div>
          {selected.kind === "bookmark" && (
            <div className="notebook-marker-motifs" role="group" aria-label={uiText(716)}>
              {(["moon", "sun"] as const).map((motif) => (
                <button
                  type="button"
                  key={motif}
                  className="notebook-paper-tool"
                  aria-pressed={(selected.motif ?? "moon") === motif}
                  onClick={() => update(selected, { motif })}
                >
                  <PaperMoonMark compact motif={motif} className="paper-tab-icon" />
                  {motif === "moon" ? uiText(1836) : uiText(1837)}
                </button>
              ))}
            </div>
          )}
          <div className="notebook-tab-edit-actions">
            <button
              type="button"
              onClick={() => {
                save(tabs.filter((tab) => tab.id !== selected.id));
                setSelectedId(null);
              }}
            >
              {uiText(717)}
            </button>
            <button type="button" onClick={() => setSelectedId(null)}>
              {uiText(718)}
            </button>
          </div>
        </div>
      )}
      <div
        className={`notebook-spread-shell ${tool || ghost ? "is-placing" : ""} ${scene ? "is-scene" : ""}`}
        ref={mount}
        onPointerDownCapture={(event) => {
          if (tool && !scene) event.stopPropagation();
        }}
        onClickCapture={(event) => {
          if (scene || !tool || (event.target as HTMLElement).closest(".notebook-attached-tab"))
            return;
          event.preventDefault();
          event.stopPropagation();
          const rect =
            (event.target as HTMLElement).closest(".notebook-sheet")?.getBoundingClientRect() ??
            mount.current?.getBoundingClientRect();
          if (rect)
            place(
              tool,
              event.detail
                ? event.clientX
                : (tool === "divider" ? mount.current!.getBoundingClientRect().right : rect.right) -
                    4,
              event.detail ? event.clientY : rect.top + rect.height / 2,
            );
        }}
      >
        {typeof children === "function"
          ? children({
              tool,
              editing,
              selectedId,
              toolbar: toolbox,
              hint: toolHint,
              cancel: () => {
                setTool(null);
                setSelectedId(null);
                setEditing(false);
              },
              placeResolved,
              activateTab,
            })
          : children}
        {!scene && (tool || ghost) && (
          <div className={`notebook-drop-guide is-${tool ?? ghost?.kind}`} aria-hidden="true" />
        )}
        <nav
          className={`notebook-attached-tabs ${scene ? "is-scene" : ""}`}
          aria-label={uiText(719)}
        >
          {tabs.map((tab) => {
            const pageIndex = pages.findIndex((page) => page.id === tab.pageId);
            const exposed = !disabled && visible.some((page) => page.id === tab.pageId);
            return (
              <button
                type="button"
                key={tab.id}
                className={`notebook-attached-tab is-${tab.kind} ${exposed ? "is-exposed" : "is-buried"}`}
                aria-current={exposed ? "page" : undefined}
                disabled={disabled}
                style={
                  {
                    "--tab-color": tab.color,
                    "--tab-text": ["#FACC15", "#5887C9"].includes(tab.color.toUpperCase())
                      ? "#17151C"
                      : "#FFF9EF",
                    "--tab-position": tab.position,
                    "--tab-side": pageIndex % 2,
                  } as CSSProperties
                }
                title={uiText(1838, [tab.label || uiText(1831), pageIndex + 1])}
                aria-label={uiText(1839, [
                  tab.kind === "divider" ? uiText(705) : uiText(1831),
                  tab.label,
                  pageIndex + 1,
                ])}
                onPointerDown={(event) => start(event, tab.kind, tab.id)}
                {...pointerHandlers}
                onClick={() =>
                  click(() => {
                    setTool(null);
                    if (editing) setSelectedId(tab.id);
                    else {
                      setSelectedId(null);
                      onJump(tab.pageId);
                    }
                  })
                }
                onKeyDown={(event) => {
                  const backwards = tab.kind === "divider" ? "ArrowUp" : "ArrowLeft";
                  const forwards = tab.kind === "divider" ? "ArrowDown" : "ArrowRight";
                  if (event.key === backwards || event.key === forwards) {
                    event.preventDefault();
                    update(tab, {
                      position: clamp(tab.position + (event.key === backwards ? -0.08 : 0.08)),
                    });
                  }
                }}
              >
                {tab.kind === "divider" ? (
                  <span>{tab.label || uiText(705)}</span>
                ) : (
                  <>
                    <span className="visually-hidden">{pageIndex + 1}</span>
                    <PaperMoonMark className="notebook-attached-tab__moon" motif={tab.motif} />
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      {ghost && (
        <div
          className="notebook-tab-ghost"
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden="true"
        >
          <PaperTabIcon kind={ghost.kind} />
        </div>
      )}
      <span className="visually-hidden" role="status">
        {message}
      </span>
    </div>
  );
}
