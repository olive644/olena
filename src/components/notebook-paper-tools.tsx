import { isMotionReduced } from "../data/accessibility-preferences";
import { LibraryDialog } from "./library-dialog";
import { PaperCheckIcon } from "./paper-check-icon";
import { createPortal } from "react-dom";
import { tabSide } from "./notebook-tab-stack";
import { NotebookTabFace, tabStyle } from "./notebook-tab-art";
import { uiText, useLanguage } from "../i18n/runtime";
import { useRef, useState, type Dispatch, type PointerEvent, type ReactNode } from "react";
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

function PaperTabIcon({ kind }: { kind: NotebookTab["kind"] }) {
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
  /** Última ferramenta da barra 2D, por exemplo criar folha. */
  endControl?: ReactNode;
  /** Par de folhas aberto (0 é o primeiro): define de que lado da pilha cada aba sai. */
  spread?: number;
  /** Abas que viajam na folha que está virando: a camada fixa não as desenha por enquanto. */
  hiddenTabIds?: ReadonlySet<string>;
  /** Abas que acabaram de pousar depois de viajar na folha: ganham um pequeno movimento de assentar. */
  landedTabIds?: ReadonlySet<string>;
  /** Elemento onde a caixa de ferramentas aparece (por exemplo a barra de baixo do caderno 2D). */
  toolbarHost?: HTMLElement | null;
  children: ReactNode;
};

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
  toolbarHost = null,
  spread,
  hiddenTabIds,
  landedTabIds,
  children,
}: Props) {
  useLanguage();

  const mount = useRef<HTMLDivElement>(null);
  const inspectorClosing = useRef(false);
  const gesture = useRef<{
    kind: NotebookTab["kind"];
    id?: string;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [tool, setTool] = useState<NotebookTab["kind"] | null>(null);
  const [newTab, setNewTab] = useState<NotebookTab | null>(null);
  const [preparedTab, setPreparedTab] = useState<NotebookTab | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [ghost, setGhost] = useState<{ kind: NotebookTab["kind"]; x: number; y: number } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const tabs = notebookPaperTabs(notebook, pages, subjects);
  const selected = newTab ?? tabs.find((tab) => tab.id === selectedId);

  function closeInspector(after?: () => void) {
    if (inspectorClosing.current) return;
    const dialog =
      mount.current?.parentElement?.querySelector<HTMLDialogElement>(".notebook-tab-dialog");
    const finish = () => {
      inspectorClosing.current = false;
      setNewTab(null);
      setSelectedId(null);
      after?.();
    };
    if (!dialog || isMotionReduced()) {
      finish();
      return;
    }
    inspectorClosing.current = true;
    void dialog
      .animate(
        [
          { opacity: 1, transform: "translateY(0) scale(1)" },
          { opacity: 0, transform: "translateY(12px) scale(.96)" },
        ],
        { duration: 180, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" },
      )
      .finished.then(finish)
      .catch(finish);
  }
  function save(next: NotebookTab[]) {
    dispatch({ type: "notebook/organized", id: notebook.id, changes: { paperTabs: next } });
  }
  function update(tab: NotebookTab, changes: Partial<NotebookTab>) {
    if (newTab) {
      setNewTab({ ...newTab, ...changes });
      return;
    }
    save(tabs.map((item) => (item.id === tab.id ? { ...item, ...changes } : item)));
  }
  function place(kind: NotebookTab["kind"], x: number, y: number, id?: string) {
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
          label:
            preparedTab?.kind === kind
              ? preparedTab.label
              : kind === "divider"
                ? uiText(705)
                : uiText(1831),
          color:
            preparedTab?.kind === kind
              ? preparedTab.color
              : kind === "divider"
                ? colors[0]!
                : colors[3]!,
          ...(kind === "bookmark" ? { motif: preparedTab?.motif ?? "moon" } : {}),
        };
    save(previous ? tabs.map((tab) => (tab.id === id ? next : tab)) : [...tabs, next]);
    setSelectedId(previous ? next.id : null);
    setTool(null);
    setMessage(
      `${kind === "divider" ? uiText(705) : uiText(1831)} na folha ${pages.indexOf(page) + 1}.`,
    );
  }
  function start(event: PointerEvent<HTMLButtonElement>, kind: NotebookTab["kind"], id?: string) {
    if (event.button !== 0 || disabled || !id) return;
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
    <div className="notebook-paper-toolbox" role="toolbar" aria-label={uiText(706)}>
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
          onPointerDown={(event) => start(event, kind)}
          {...pointerHandlers}
          onClick={() =>
            click(() => {
              setNewTab({
                id: "tab-draft",
                kind,
                pageId: "",
                position: 0.5,
                label: kind === "divider" ? uiText(705) : uiText(1831),
                color:
                  preparedTab?.kind === kind
                    ? preparedTab.color
                    : kind === "divider"
                      ? colors[0]!
                      : colors[3]!,
                ...(kind === "bookmark" ? { motif: "moon" as const } : {}),
              });
              setTool(null);
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
      {toolbarHost ? createPortal(toolbox, toolbarHost) : toolbox}
      {selected && (
        <LibraryDialog
          title={selected.kind === "divider" ? uiText(705) : uiText(1831)}
          className="notebook-tab-dialog"
          onClose={() => closeInspector()}
        >
          <div
            className={`notebook-tab-preview is-${selected.kind}${selected.label.length > 16 ? " has-long-label" : ""}`}
            style={tabStyle(selected, 1, "right")}
          >
            <div className="notebook-tab-preview-art">
              <NotebookTabFace tab={selected} pageIndex={1} side="right" />
            </div>
          </div>
          <label>
            {uiText(713)}
            <input
              aria-label={uiText(714)}
              maxLength={32}
              value={selected.label}
              onChange={(event) => update(selected, { label: event.target.value })}
            />
          </label>
          <fieldset className="ink-palette notebook-tab-palette">
            <legend>{uiText(715)}</legend>
            {colors.map((color, index) => (
              <button
                type="button"
                key={color}
                aria-label={
                  [uiText(1568), uiText(1571), uiText(1570), uiText(1569), uiText(1572)][index]
                }
                aria-pressed={selected.color === color}
                className="ink-swatch"
                style={{ backgroundColor: color }}
                onClick={() => update(selected, { color })}
              >
                <span>{selected.color === color ? <PaperCheckIcon /> : null}</span>
              </button>
            ))}
          </fieldset>
          {selected.kind === "bookmark" && (
            <div className="notebook-marker-motifs" role="group" aria-label={uiText(716)}>
              {(["moon", "sun"] as const).map((motif) => (
                <button
                  type="button"
                  key={motif}
                  className="secondary-button notebook-motif-button"
                  aria-pressed={(selected.motif ?? "moon") === motif}
                  onClick={() => update(selected, { motif })}
                >
                  <PaperMoonMark compact motif={motif} className="paper-tab-icon" />
                  <span>{motif === "moon" ? uiText(1836) : uiText(1837)}</span>
                  {(selected.motif ?? "moon") === motif && (
                    <span className="notebook-motif-check" aria-hidden="true">
                      <PaperCheckIcon size={15} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="notebook-tab-edit-actions">
            {!newTab && (
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  save(tabs.filter((tab) => tab.id !== selected.id));
                  setSelectedId(null);
                }}
              >
                {uiText(717)}
              </button>
            )}
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                const configured = newTab;
                closeInspector(() => {
                  if (configured) {
                    setPreparedTab(configured);
                    setTool(configured.kind);
                  }
                });
              }}
            >
              {uiText(718)}
            </button>
          </div>
        </LibraryDialog>
      )}
      <div
        className={`notebook-spread-shell ${tool || ghost ? "is-placing" : ""} `}
        ref={mount}
        onPointerDownCapture={(event) => {
          if (tool) event.stopPropagation();
        }}
        onClickCapture={(event) => {
          if (!tool || (event.target as HTMLElement).closest(".notebook-attached-tab")) return;
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
        {children}
        {(tool || ghost) && (
          <div className={`notebook-drop-guide is-${tool ?? ghost?.kind}`} aria-hidden="true" />
        )}
        <nav className="notebook-attached-tabs" aria-label={uiText(719)}>
          {tabs.map((tab) => {
            if (hiddenTabIds?.has(tab.id)) return null;
            const pageIndex = pages.findIndex((page) => page.id === tab.pageId);
            const side =
              spread === undefined
                ? pageIndex % 2
                  ? "right"
                  : "left"
                : tabSide(pageIndex, spread);
            const exposed = !disabled && visible.some((page) => page.id === tab.pageId);
            return (
              <button
                type="button"
                key={tab.id}
                className={`notebook-attached-tab is-${tab.kind} is-${side} ${exposed ? "is-exposed" : "is-buried"}${landedTabIds?.has(tab.id) ? " is-landed" : ""}`}
                aria-current={exposed ? "page" : undefined}
                disabled={disabled}
                style={tabStyle(tab, pageIndex, side)}
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
