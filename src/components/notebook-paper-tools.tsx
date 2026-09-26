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

export function PaperMoonMark({
  className,
  compact = false,
  motif = "moon",
}: {
  className?: string;
  compact?: boolean;
  motif?: "moon" | "sun" | undefined;
}) {
  return (
    <svg
      viewBox={compact ? "0 0 64 64" : "0 0 64 180"}
      aria-hidden="true"
      className={className ?? "paper-tab-moon"}
      focusable="false"
      data-motif={motif}
    >
      {!compact && (
        <g transform="translate(0 -44)">
          <path fill="#FFF9EF" d="M15 46h36v130l-18-6-18 6Z" />
          <path fill="#51259B" d="M19 48h28v123l-14-5-14 5Z" />
          <path fill="#7C3AED" d="m19 48 28 14v74l-28 25Z" />
          <path fill="var(--tab-color, #FACC15)" d="m19 116 9 8-9 15Zm28 19-11 10 11 10Z" />
          <path fill="#A779EF" d="m19 48 8 5v48l-8 8Z" />
          <path fill="#FFE88D" d="m33 76 3 6 7 2-6 4-1 7-5-5-7 1 3-6-2-7 6 2Z" />
          <path fill="none" stroke="#D8BEFA" strokeWidth="1.4" d="m33 96 5 12-10 12 7 20" />
          <path fill="#FFF9EF" d="m38 104 3 4-3 4-3-4Zm-10 13 3 3-3 3-3-3Zm7 20 3 4-3 4-3-4Z" />
          <path fill="#FFE88D" d="m31 151 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" />
        </g>
      )}
      <g transform={compact ? undefined : "translate(0 116)"}>
        {motif === "sun" ? (
          <>
            <path
              fill="#FFF9EF"
              d="m32 0 9 10 14-1 1 14 8 9-9 10 1 14-15-1-9 9-9-9-14 1 1-14L0 32l10-9L9 9l14 1Z"
            />
            <path
              fill="#FACC15"
              d="m32 5 8 10 11-2-1 12 9 7-9 8 1 11-12-1-7 9-8-9-11 1 1-12-9-7 10-8-2-11 12 1Z"
            />
            <path fill="#D7A80A" d="m32 32 27 0-9 8 1 11-12-1-7 9-8-9-11 1Z" />
            <path fill="#FFE88D" d="m32 16 12 5 5 11-5 12-12 5-12-5-5-12 5-11Z" />
            <path fill="#FACC15" d="m32 20 12 12-12 13-12-13Z" />
            <path fill="#FFF9EF" d="m32 20 0 12-12 0Z" />
          </>
        ) : (
          <>
            <path
              fill="#FFF9EF"
              d="m37 4-21 7L4 27l2 20 15 15 17 2 15-6 9-13-17 4-13-9-6-14 3-12Z"
            />
            <path
              fill="#FACC15"
              d="m29 9-13 7-8 13 2 16 11 13 16 4 13-6 7-8-14 3-15-8-7-16 1-11Z"
            />
            <path fill="#FFE88D" d="m29 9-13 7-8 13 9 8 4-10 1-11Z" />
            <path fill="#D7A80A" d="m10 45 11 13 16 4 13-6 7-8-14 3-15-8 6 12Z" />
            <path fill="#FFF9EF" d="m43 19 3 7 8 3-8 3-3 8-3-8-8-3 8-3Z" />
          </>
        )}
      </g>
    </svg>
  );
}

export function PaperTabIcon({ kind }: { kind: NotebookTab["kind"] }) {
  if (kind === "bookmark") return <PaperMoonMark className="paper-tab-icon" compact />;
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="paper-tab-icon">
      <path fill="#51465D" d="M3 5h25v32H3z" />
      <path fill="#D5CCBA" d="M6 7h20v27H6z" />
      <path fill="#FFF9EF" d="M8 3h18v28H8z" />
      <path fill="#D5CCBA" d="M11 8h12v2H11Zm0 5h12v2H11Zm0 10h12v2H11Z" />
      <path fill="currentColor" d="M19 10h15l4 5v15H19z" />
      <path fill="#FFFFFF" opacity=".3" d="m19 10 15 0-8 8h-7z" />
      <path fill="#292432" opacity=".3" d="m31 23 7-8v15H19l5-7z" />
      <path fill="#292432" opacity=".18" d="M19 10h4v20h-4z" />
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
        {backControl}
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
        <div className="notebook-toolbar-secondary">
          <button
            type="button"
            className="notebook-paper-tool"
            aria-pressed={editing}
            disabled={!tabs.length || disabled}
            onClick={() => {
              setEditing(!editing);
              setSelectedId(null);
              setTool(null);
            }}
          >
            {editing ? "Concluir edição" : "Editar marcas"}
          </button>
          {indexControl}
        </div>
        <span className="notebook-tool-hint">
          {tool === "divider"
            ? "Toque na borda direita"
            : tool === "bookmark"
              ? "Toque na folha"
              : editing
                ? "Toque na marca para editar"
                : "Toque para ir à folha"}
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
          {selected.kind === "bookmark" && (
            <div className="notebook-marker-motifs" role="group" aria-label="Modelo do marcador">
              {(["moon", "sun"] as const).map((motif) => (
                <button
                  type="button"
                  key={motif}
                  className="notebook-paper-tool"
                  aria-pressed={(selected.motif ?? "moon") === motif}
                  onClick={() => update(selected, { motif })}
                >
                  <PaperMoonMark compact motif={motif} className="paper-tab-icon" />
                  {motif === "moon" ? "Lua" : "Sol"}
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
                title={`${tab.label || "Marcador"}, folha ${pageIndex + 1}. Arraste para reposicionar.`}
                aria-label={`${tab.kind === "divider" ? "Divisória" : "Marcador"} ${tab.label}, folha ${pageIndex + 1}`}
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
                  <span>{tab.label || "Divisória"}</span>
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
