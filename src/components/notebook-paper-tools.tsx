import {
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  createWorkspaceId,
  type NotebookTab,
  type StudyNote,
  type StudyNotebook,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";

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

export function PaperTabIcon({ kind }: { kind: NotebookTab["kind"] }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="paper-tab-icon">
      {kind === "divider" ? (
        <>
          <path fill="#D5CCBA" d="M3 6h23v30H3z" />
          <path fill="#FFF9EF" d="M3 3h23v30H3z" />
          <path fill="currentColor" d="M19 10h15l4 5v15H19z" />
          <path fill="#FFFFFF" opacity=".3" d="m19 10 15 0-8 8h-7z" />
          <path fill="#292432" opacity=".3" d="m31 23 7-8v15H19l5-7z" />
          <path fill="#292432" opacity=".18" d="M19 10h4v20h-4z" />
        </>
      ) : (
        <>
          <path fill="#292432" opacity=".25" d="M12 5h19v33l-9-7-10 7z" />
          <path fill="currentColor" d="M9 2h18v33l-9-7-9 7z" />
          <path fill="#FFFFFF" opacity=".35" d="M9 2h18L9 19z" />
          <path fill="#292432" opacity=".25" d="M23 6h4v29l-4-3z" />
        </>
      )}
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
  children,
}: Props) {
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
  function place(kind: NotebookTab["kind"], x: number, y: number, id?: string) {
    const rect = mount.current?.getBoundingClientRect();
    if (!rect || !visible.length || disabled) return;
    const inside =
      x >= rect.left - 12 && x <= rect.right + 70 && y >= rect.top - 12 && y <= rect.bottom + 55;
    if (!inside || (kind === "divider" && x < rect.left + rect.width * 0.65)) {
      setMessage(
        kind === "divider"
          ? "Solte a divisória na borda direita."
          : "Solte a fita sobre uma folha.",
      );
      return;
    }
    const side = x < rect.left + rect.width / 2 ? 0 : 1;
    const page = kind === "divider" ? (visible[1] ?? visible[0]) : visible[side];
    if (!page) {
      setMessage("Crie essa folha antes de marcar.");
      return;
    }
    const position =
      kind === "divider"
        ? clamp((y - rect.top - 22) / Math.max(1, rect.height - 66))
        : clamp((((x - rect.left) / rect.width) * 2 - side - 0.14) / 0.72);
    const previous = tabs.find((tab) => tab.id === id);
    const next: NotebookTab = previous
      ? { ...previous, pageId: page.id, position }
      : {
          id: createWorkspaceId("tab"),
          kind,
          pageId: page.id,
          position,
          label: kind === "divider" ? "Divisória" : "Marcador",
          color: kind === "divider" ? colors[0]! : colors[3]!,
        };
    save(previous ? tabs.map((tab) => (tab.id === id ? next : tab)) : [...tabs, next]);
    setSelectedId(next.id);
    setTool(null);
    setMessage(
      `${kind === "divider" ? "Divisória" : "Marcador"} na folha ${pages.indexOf(page) + 1}.`,
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
      <div className="notebook-paper-toolbox" role="toolbar" aria-label="Ferramentas do caderno">
        {coverControl}
        {(["divider", "bookmark"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            className="notebook-paper-tool"
            disabled={!pages.length || disabled}
            aria-pressed={tool === kind}
            aria-label={kind === "divider" ? "Colocar divisória" : "Colocar marcador"}
            title="Arraste para o caderno ou selecione e toque na folha"
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
            <span>{kind === "divider" ? "Divisória" : "Marcador"}</span>
          </button>
        ))}
        <span className="notebook-tool-hint">
          {tool === "divider"
            ? "Toque na borda direita"
            : tool === "bookmark"
              ? "Toque na folha"
              : "Pegue e arraste"}
        </span>
      </div>
      {selected && (
        <div className="notebook-tab-inspector" role="group" aria-label="Ajustar marcação">
          <label>
            Nome
            <input
              aria-label="Nome da marcação"
              maxLength={32}
              value={selected.label}
              onChange={(event) => update(selected, { label: event.target.value })}
            />
          </label>
          <div className="notebook-tab-colors" role="group" aria-label="Cor da marcação">
            {colors.map((color, index) => (
              <button
                type="button"
                key={color}
                aria-label={["Roxo", "Verde", "Rosa", "Amarelo", "Azul"][index]}
                aria-pressed={selected.color === color}
                style={{ "--tab-color": color } as CSSProperties}
                onClick={() => update(selected, { color })}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="notebook-tab-edit-actions">
            <button
              type="button"
              onClick={() => {
                save(tabs.filter((tab) => tab.id !== selected.id));
                setSelectedId(null);
              }}
            >
              Remover marcação
            </button>
            <button type="button" onClick={() => setSelectedId(null)}>
              Pronto
            </button>
          </div>
        </div>
      )}
      <div
        className={`notebook-spread-shell ${tool || ghost ? "is-placing" : ""}`}
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
        <nav className="notebook-attached-tabs" aria-label="Divisórias e marcadores">
          {tabs.map((tab) => {
            const pageIndex = pages.findIndex((page) => page.id === tab.pageId);
            const isVisible = visible.some((page) => page.id === tab.pageId);
            return (
              <button
                type="button"
                key={tab.id}
                className={`notebook-attached-tab is-${tab.kind} ${isVisible ? "is-current" : ""}`}
                disabled={disabled}
                style={
                  {
                    "--tab-color": tab.color,
                    "--tab-text": tab.color === "#FACC15" ? "#292432" : "#FFF9EF",
                    "--tab-position": tab.position,
                    "--tab-side": pageIndex % 2,
                  } as CSSProperties
                }
                title={`${tab.label || "Marcador"}, folha ${pageIndex + 1}. Arraste para reposicionar.`}
                aria-label={`${tab.kind === "divider" ? "Divisória" : "Marcador"} ${tab.label}, folha ${pageIndex + 1}`}
                aria-current={isVisible ? "page" : undefined}
                onPointerDown={(event) => start(event, tab.kind, tab.id)}
                {...pointerHandlers}
                onClick={() =>
                  click(() => {
                    setTool(null);
                    onJump(tab.pageId);
                    setSelectedId(tab.id);
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
                <span>{tab.kind === "divider" ? tab.label || "Divisória" : pageIndex + 1}</span>
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
