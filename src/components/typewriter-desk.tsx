import { LibraryDialog } from "./library-dialog";
import { createPortal } from "react-dom";
import { EssayWritingOptions } from "./essay-writing-options";
import { EssayVisualSupport } from "./essay-visual-support";
import { EssayProofreading } from "./essay-proofreading";
import { ESSAY_VISUALS } from "../data/essay-visuals";
import { EssayDeskIcon } from "./essay-desk-icon";
import { useEffect, useRef, useState, type Dispatch, type CSSProperties } from "react";
import { createWorkspaceId, type WorkspaceState, type WorkspaceAction } from "../domain/workspace";
import { ESSAY_CATEGORIES, ESSAY_PROPOSALS, type EssayProposal } from "../data/essay-catalog";
import { uiText } from "../i18n/runtime";
import { PaperArrow } from "./paper-arrow";
import { PaperDigits } from "./paper-digits";
import { PaperEditorIcon } from "./paper-editor-icon";
import { PaperCloseIcon } from "./paper-close-icon";
import "./typewriter-desk.css";

type DeskProps = {
  workspace: WorkspaceState;
  collectionId: string;
  dispatch: Dispatch<WorkspaceAction>;
  onBack(): void;
};
export function TypewriterDesk(props: DeskProps) {
  const [selected, setSelected] = useState<string>();
  const [tab, setTab] = useState<"redacao" | "vestibular">("redacao");
  const proposal = ESSAY_PROPOSALS.find((item) => item.id === selected);
  if (proposal)
    return (
      <EssayWriting
        key={proposal.id}
        {...props}
        proposal={proposal}
        onBack={() => setSelected(undefined)}
      />
    );
  return (
    <section className="essay-catalog">
      <div className="essay-catalog-navigation">
        <header>
          <button
            type="button"
            className="library-icon"
            aria-label={uiText("Voltar à estante")}
            onClick={props.onBack}
          >
            <PaperArrow back />
          </button>
          <h1>{uiText("Redação e vestibulares")}</h1>
        </header>
        <div className="essay-desk-tabs" role="tablist" aria-label={uiText("Área de estudo")}>
          {(
            [
              ["redacao", "Redação"],
              ["vestibular", "Vestibular (em breve)"],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              role="tab"
              id={"desk-tab-" + id}
              aria-selected={tab === id}
              aria-controls="essay-desk-panel"
              tabIndex={tab === id ? 0 : -1}
              key={id}
              className="shelf-wood-button"
              onClick={() => setTab(id)}
              onKeyDown={(e) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
                e.preventDefault();
                const tabs = ["redacao", "vestibular"] as const;
                const index = tabs.indexOf(tab);
                const next = tabs[e.key === "Home" ? 0 : e.key === "End" ? 1 : (index + 1) % 2]!;
                setTab(next);
                document.getElementById("desk-tab-" + next)?.focus();
              }}
            >
              <EssayDeskIcon name={id} />
              {uiText(label)}
            </button>
          ))}
        </div>
      </div>
      <div
        role="tabpanel"
        id="essay-desk-panel"
        aria-labelledby={"desk-tab-" + tab}
        key={tab}
        className="essay-desk-panel"
      >
        {tab === "redacao" ? (
          <>
            <section className="essay-my-list">
              <h2>
                <EssayDeskIcon name="minhas" />
                {uiText("Minhas redações")}
              </h2>
              {ESSAY_PROPOSALS.filter((item) =>
                props.workspace.materials.some(
                  (material) =>
                    !material.archived &&
                    material.collectionId === props.collectionId &&
                    material.tags?.includes(item.id) &&
                    (material.tags.includes("essay-submission") ||
                      material.tags.includes("essay-completed")),
                ),
              ).map((item) => (
                <button
                  className="essay-proposal-card"
                  type="button"
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                >
                  <EssayDeskIcon name="minhas" />
                  <strong>{item.title}</strong>
                  <span>
                    {uiText("Ver resultado")}
                    <PaperArrow />
                  </span>
                </button>
              ))}
              {!props.workspace.materials.some(
                (material) =>
                  !material.archived &&
                  material.collectionId === props.collectionId &&
                  (material.tags?.includes("essay-submission") ||
                    material.tags?.includes("essay-completed")),
              ) && <p>{uiText("Suas redações entregues aparecerão aqui.")}</p>}
            </section>
            {ESSAY_CATEGORIES.map((category) => (
              <EssayCategory
                key={category.id}
                category={category}
                workspace={props.workspace}
                collectionId={props.collectionId}
                onOpen={setSelected}
              />
            ))}
          </>
        ) : (
          <section className="essay-vestibular">
            <h2>{uiText("Provas anteriores")}</h2>
            <p>{uiText("Consulte provas e gabaritos nos acervos oficiais.")}</p>
            <div>
              {[
                {
                  name: "Enem",
                  url: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos",
                  detail: "Acervo de provas e gabaritos do Inep",
                },
                {
                  name: "Fuvest • USP",
                  url: "https://www.fuvest.br/acervo-vestibular",
                  detail: "Acervo do Vestibular da USP",
                },
              ].map((item) => (
                <a
                  className="shelf-wood-button"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={item.name}
                >
                  <EssayDeskIcon name="vestibular" />
                  <strong>{item.name}</strong>
                  <small>{uiText(item.detail)}</small>
                  <span>
                    {uiText("Abrir acervo oficial")} <PaperArrow />
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
function EssayCategory({
  category,
  workspace,
  collectionId,
  onOpen,
}: {
  category: (typeof ESSAY_CATEGORIES)[number];
  workspace: WorkspaceState;
  collectionId: string;
  onOpen(id: string): void;
}) {
  const row = useRef<HTMLDivElement>(null);
  function scroll(back: boolean) {
    row.current?.scrollBy({
      left: (back ? -1 : 1) * row.current.clientWidth * 0.85,
      behavior:
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.dataset["reduceMotion"] === "true"
          ? "instant"
          : "smooth",
    });
  }
  return (
    <section
      className="essay-category"
      style={{ "--essay-accent": category.color } as React.CSSProperties}
      aria-labelledby={category.id + "-heading"}
    >
      <header>
        <h2 id={category.id + "-heading"}>
          <EssayDeskIcon name={category.id} />
          {uiText(category.title)}
        </h2>
        <div>
          <button
            type="button"
            className="library-icon"
            aria-label={uiText("Propostas anteriores: {0}", [category.title])}
            onClick={() => scroll(true)}
          >
            <PaperArrow back />
          </button>
          <button
            type="button"
            className="library-icon"
            aria-label={uiText("Próximas propostas: {0}", [category.title])}
            onClick={() => scroll(false)}
          >
            <PaperArrow />
          </button>
        </div>
      </header>
      <div ref={row} className="essay-proposal-row">
        {category.proposals.map((proposal) => {
          const draft = workspace.materials.find(
            (item) =>
              !item.archived &&
              item.collectionId === collectionId &&
              item.tags?.includes("typewriter-draft") &&
              item.tags?.includes(proposal.id),
          );
          const completed =
            draft?.tags?.includes("essay-completed") ||
            workspace.materials.some(
              (item) =>
                !item.archived &&
                item.collectionId === collectionId &&
                item.tags?.includes(proposal.id) &&
                item.tags.includes("essay-submission"),
            );
          return (
            <button
              type="button"
              className="essay-proposal-card"
              key={proposal.id}
              onClick={() => onOpen(proposal.id)}
            >
              <small>{uiText("Proposta {0}", [proposal.number])}</small>
              <strong>{uiText(proposal.title)}</strong>
              <span>
                {uiText(completed ? "Ver resultado" : draft ? "Continuar" : "Começar")}{" "}
                <PaperArrow />
                {completed && <img src="/room-icons/check.svg" alt={uiText("Treino concluído")} />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
function EssayWriting({
  workspace,
  collectionId,
  dispatch,
  onBack,
  proposal,
}: DeskProps & { proposal: EssayProposal }) {
  const draft = workspace.materials.find(
    (item) =>
      !item.archived &&
      item.collectionId === collectionId &&
      item.tags?.includes("typewriter-draft") &&
      item.tags?.includes(proposal.id),
  );
  const submission = workspace.materials.find(
    (item) =>
      !item.archived &&
      item.collectionId === collectionId &&
      item.tags?.includes(proposal.id) &&
      item.tags.includes("essay-submission"),
  );
  const initiallySubmitted = !!submission || !!draft?.tags?.includes("essay-completed");
  const initialText = submission?.content ?? draft?.content ?? "";
  const [text, setText] = useState(initialText);
  const essayInput = useRef<HTMLTextAreaElement>(null);
  const [charactersPerLine, setCharactersPerLine] = useState(65);
  useEffect(() => {
    const input = essayInput.current;
    if (!input) return;
    function resize() {
      if (!input) return;
      const style = getComputedStyle(input);
      const width =
        input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (width <= 0) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;
      context.font = "100px " + style.fontFamily;
      const average =
        context.measureText("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ").width / 52;
      input.style.fontSize =
        Math.max(8, Math.min(26, (width * 100) / (charactersPerLine * average))) + "px";
    }
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(resize);
    observer.observe(input);
    resize();
    return () => observer.disconnect();
  }, [charactersPerLine]);
  const [history, setHistory] = useState<string[]>([initialText]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const editGroup = useRef({ time: 0, kind: "" });
  function changeText(next: string, now: number) {
    if (completed) return;
    const difference = next.length - text.length;
    const kind = Math.abs(difference) === 1 ? (difference > 0 ? "typing" : "deleting") : "replace";
    const grouped =
      kind !== "replace" &&
      editGroup.current.kind === kind &&
      now - editGroup.current.time < 1000 &&
      historyIndex > 0 &&
      historyIndex === history.length - 1;
    if (grouped) setHistory([...history.slice(0, historyIndex), next]);
    else {
      setHistory([...history.slice(0, historyIndex + 1), next]);
      setHistoryIndex(historyIndex + 1);
    }
    editGroup.current = { time: now, kind };
    setText(next);
    setSaved(false);
    setCompleted(false);
  }
  function moveHistory(delta: number) {
    if (completed) return;
    editGroup.current = { time: 0, kind: "" };
    const next = historyIndex + delta;
    if (next < 0 || next >= history.length) return;
    setHistoryIndex(next);
    setText(history[next] ?? "");
    setSaved(false);
    setCompleted(false);
  }
  const [completed, setCompleted] = useState(initiallySubmitted);
  const [seconds, setSeconds] = useState(() =>
    Number(submission?.tags?.find((tag) => /^essay-seconds:\d+$/.test(tag))?.split(":")[1] ?? 0),
  );
  const [saved, setSaved] = useState(true);
  const [resultsVisible, setResultsVisible] = useState(initiallySubmitted);
  const [materialId] = useState(() => draft?.id ?? createWorkspaceId("essay"));
  const exists = useRef(!!draft);
  const savedText = useRef(draft?.content ?? "");
  const savedCompleted = useRef(completed);
  const [clockRunning, setClockRunning] = useState(!initiallySubmitted);
  const elapsed = useRef(0);
  const runningSince = useRef<number | null>(null);
  function toggleClock() {
    if (clockRunning) {
      if (runningSince.current !== null) elapsed.current += Date.now() - runningSince.current;
      runningSince.current = null;
      setSeconds(Math.floor(elapsed.current / 1000));
    }
    setClockRunning(!clockRunning);
  }
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [expandedSupport, setExpandedSupport] = useState<number | null>(null);
  const [mobileLayout, setMobileLayout] = useState(
    () => window.matchMedia?.("(max-width: 850px)").matches ?? false,
  );
  const mobileSheet = useRef<HTMLElement>(null);
  const sheetDragStart = useRef<number | null>(null);
  useEffect(() => {
    const blockCopy = (event: ClipboardEvent) => {
      const selection = window.getSelection();
      const protectedText = (node: Node | null | undefined) => {
        const element = node instanceof Element ? node : node?.parentElement;
        return element?.closest(
          ".essay-prompt-paper, .essay-support-reading-modal, .essay-visual-modal",
        );
      };
      if (protectedText(selection?.anchorNode) || protectedText(selection?.focusNode))
        event.preventDefault();
    };
    document.addEventListener("copy", blockCopy);
    document.addEventListener("cut", blockCopy);
    return () => {
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("cut", blockCopy);
    };
  }, []);

  const openSheetButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 850px)");
    if (!query) return;
    const update = () => setMobileLayout(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobileLayout || !mobileSheetOpen || resultsVisible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileSheet.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSheetOpen(false);
        openSheetButton.current?.focus();
      }
      if (event.key === "Tab") {
        const controls = Array.from(
          mobileSheet.current?.querySelectorAll<HTMLElement>("button:not(:disabled), textarea") ??
            [],
        );
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", close);
    };
  }, [mobileLayout, mobileSheetOpen, resultsVisible]);

  const proposalPanel = useRef<HTMLDivElement>(null);
  const proposalStage = useRef<HTMLDivElement>(null);
  const proposalPaper = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileLayout || resultsVisible) return;
    const stage = proposalStage.current,
      paper = proposalPaper.current;
    if (!stage || !paper) return;
    let base = 1,
      zoom = 1,
      x = 0,
      y = 0;
    let gesture: { distance: number; zoom: number; anchorX: number; anchorY: number } | null = null;
    let pan: { x: number; y: number } | null = null;
    let lastTap = 0;
    const draw = () => {
      const scale = base * zoom;
      x = Math.min(
        Math.max(x, Math.min(0, stage.clientWidth - 800 * scale)),
        Math.max(0, (stage.clientWidth - 800 * scale) / 2),
      );
      y = Math.min(0, Math.max(y, Math.min(0, stage.clientHeight - paper.offsetHeight * scale)));
      paper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      stage.dataset["zoom"] = String(zoom);
    };
    const fit = () => {
      base = Math.min(stage.clientWidth / 800, stage.clientHeight / paper.offsetHeight);
      zoom = 1;
      x = (stage.clientWidth - 800 * base) / 2;
      y = 0;
      draw();
    };
    const point = (touch: Touch) => {
      const rect = stage.getBoundingClientRect();
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const a = point(event.touches[0]!),
          b = point(event.touches[1]!);
        gesture = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          zoom,
          anchorX: ((a.x + b.x) / 2 - x) / (base * zoom),
          anchorY: ((a.y + b.y) / 2 - y) / (base * zoom),
        };
        pan = null;
        event.preventDefault();
      } else if (event.touches.length === 1 && zoom > 1) {
        pan = point(event.touches[0]!);
      }
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length === 2 && gesture) {
        const a = point(event.touches[0]!),
          b = point(event.touches[1]!);
        zoom = Math.max(
          1,
          Math.min(4, (gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / gesture.distance),
        );
        x = (a.x + b.x) / 2 - gesture.anchorX * base * zoom;
        y = (a.y + b.y) / 2 - gesture.anchorY * base * zoom;
        if (zoom === 1) {
          x = (stage.clientWidth - 800 * base) / 2;
          y = 0;
        }
        draw();
        event.preventDefault();
      } else if (event.touches.length === 1 && pan && zoom > 1) {
        const next = point(event.touches[0]!);
        x += next.x - pan.x;
        y += next.y - pan.y;
        pan = next;
        draw();
        event.preventDefault();
      }
    };
    const end = (event: TouchEvent) => {
      gesture = null;
      pan = null;
      if (!event.touches.length) {
        const now = Date.now();
        if (now - lastTap < 280) fit();
        lastTap = now;
      }
    };
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    observer.observe(paper);
    fit();
    stage.addEventListener("touchstart", start, { passive: false });
    stage.addEventListener("touchmove", move, { passive: false });
    stage.addEventListener("touchend", end);
    return () => {
      observer.disconnect();
      stage.removeEventListener("touchstart", start);
      stage.removeEventListener("touchmove", move);
      stage.removeEventListener("touchend", end);
    };
  }, [mobileLayout, resultsVisible]);

  const [controlPosition, setControlPosition] = useState<CSSProperties>({ left: 0, width: "55vw" });
  useEffect(() => {
    const panel = proposalPanel.current;
    if (!panel) return;
    const update = () => {
      const rect = panel.getBoundingClientRect();
      setControlPosition({ left: Math.max(0, rect.left), width: rect.width });
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(panel);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, []);
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);
  function save(done = completed) {
    if (text === savedText.current && done === savedCompleted.current) return;
    const tags = ["typewriter-draft", proposal.id, ...(done ? ["essay-completed"] : [])];
    if (exists.current)
      dispatch({ type: "material/updated", id: materialId, changes: { content: text, tags } });
    else {
      dispatch({
        type: "material/added",
        id: materialId,
        collectionId,
        subjectId: workspace.subjects[0]?.id ?? "",
        kind: "text",
        title: proposal.title,
        content: text,
        tags,
        createdAt: new Date().toISOString(),
      });
      exists.current = true;
    }
    savedText.current = text;
    savedCompleted.current = done;
    setSaved(true);
  }
  useEffect(() => {
    if (!clockRunning) return;
    runningSince.current = Date.now();
    const interval = setInterval(() => {
      setSeconds(
        Math.floor((elapsed.current + Date.now() - (runningSince.current ?? Date.now())) / 1000),
      );
    }, 200);
    return () => clearInterval(interval);
  }, [clockRunning]);
  useEffect(() => {
    const timeout = setTimeout(() => save(), 600);
    return () => clearTimeout(timeout);
  });
  return (
    <section
      className={`essay-writing${resultsVisible ? " essay-writing--results" : ""}${mobileSheetOpen ? " essay-writing--mobile-sheet-open" : ""}`}
    >
      <div
        aria-hidden={resultsVisible}
        inert={resultsVisible}
        className={`essay-writing-columns${sheetCollapsed ? " essay-writing-columns--collapsed" : ""}`}
      >
        <div className="essay-proposal-panel" ref={proposalPanel}>
          {!resultsVisible &&
            createPortal(
              <div className="essay-proposal-controls" style={controlPosition}>
                {" "}
                <button
                  type="button"
                  className="library-icon essay-exit"
                  aria-label={uiText("Voltar às propostas")}
                  onClick={() => {
                    save();
                    onBack();
                  }}
                >
                  <PaperCloseIcon />
                </button>
                <button
                  type="button"
                  className={`essay-writing-clock${clockRunning ? "" : " essay-writing-clock--paused"}`}
                  aria-label={uiText(clockRunning ? "Pausar cronômetro" : "Retomar cronômetro")}
                  aria-pressed={!clockRunning}
                  onClick={toggleClock}
                >
                  <svg className="essay-clock-control" viewBox="0 0 24 24" aria-hidden="true">
                    {clockRunning ? (
                      <>
                        <path fill="#b6efd2" d="m5 3 5 1v16H5zM14 4l5-1v17h-5z" />
                        <path fill="#72cfa1" d="m5 3 5 1-5 4zM14 4l5-1-5 5z" />
                      </>
                    ) : (
                      <>
                        <path fill="#ffd2d5" d="M5 2 22 12 5 22z" />
                        <path fill="#f49aa7" d="m5 2 17 10-10-1z" />
                      </>
                    )}
                  </svg>
                  <span role="timer" aria-label={uiText("Tempo de escrita")}>
                    <PaperDigits
                      value={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
                    />
                  </span>
                </button>
              </div>,
              document.body,
            )}
          <div className="essay-proposal-stage" ref={proposalStage}>
            <article
              className="essay-prompt-paper"
              ref={proposalPaper}
              onCopy={(event) => event.preventDefault()}
              onCut={(event) => event.preventDefault()}
              onContextMenu={(event) => event.preventDefault()}
            >
              <header>
                <img src="/olena-favicon-192.png" alt={"Olena"} width="44" height="44" />
                <div>
                  <h1>{uiText(proposal.title)}</h1>
                  <small>{uiText("Assunto: {0}", [proposal.category])}</small>
                </div>
              </header>
              <h2>{uiText("Proposta de redação")}</h2>
              <p>
                {uiText(
                  "Com base na leitura dos textos motivadores e nos conhecimentos construídos ao longo de sua formação, produza um texto dissertativo-argumentativo, em modalidade escrita formal da língua portuguesa, sobre o tema “{0}”. Apresente uma tese e desenvolva argumentos que analisem o problema, suas causas e seus efeitos na sociedade. Selecione e relacione informações, exemplos e repertórios pertinentes, com coerência e coesão, para sustentar seu ponto de vista. Ao concluir, proponha uma intervenção relacionada à discussão, indicando quem pode agir, o que deve ser feito, como a ação pode ser realizada e qual resultado se pretende alcançar, respeitando os direitos humanos. Utilize os textos motivadores como apoio à reflexão, sem reproduzir seus trechos como substitutos da sua argumentação.",
                  [proposal.title],
                )}
              </p>
              <div className="essay-support-texts">
                <div className="essay-support-column">
                  <section>
                    <h3>{uiText("Texto I")}</h3>
                    <button
                      type="button"
                      className="essay-support-expand-mobile"
                      aria-label={uiText("Ampliar Texto I")}
                      onClick={() => setExpandedSupport(0)}
                    >
                      <PaperEditorIcon name="expand" />
                    </button>
                    {ESSAY_VISUALS[proposal.id].context.split("\n\n").map((paragraph, index) => (
                      <p key={index}>{uiText(paragraph)}</p>
                    ))}
                    <EssayVisualSupport proposalId={proposal.id} />
                  </section>
                </div>
                <div className="essay-support-column">
                  <section>
                    <h3>{uiText("Texto II")}</h3>
                    <button
                      type="button"
                      className="essay-support-expand-mobile"
                      aria-label={uiText("Ampliar Texto II")}
                      onClick={() => setExpandedSupport(1)}
                    >
                      <PaperEditorIcon name="expand" />
                    </button>
                    {ESSAY_VISUALS[proposal.id].authorText.split("\n\n").map((paragraph, index) => (
                      <p key={index}>{uiText(paragraph)}</p>
                    ))}
                    <small>{uiText("Texto de apoio autoral Olena")}</small>
                  </section>
                  <section>
                    <h3>{uiText("Texto III")}</h3>
                    <button
                      type="button"
                      className="essay-support-expand-mobile"
                      aria-label={uiText("Ampliar Texto III")}
                      onClick={() => setExpandedSupport(2)}
                    >
                      <PaperEditorIcon name="expand" />
                    </button>
                    {ESSAY_VISUALS[proposal.id].discussion.split("\n\n").map((paragraph, index) => (
                      <p key={index}>{uiText(paragraph)}</p>
                    ))}
                    <small>{uiText("Texto de apoio autoral Olena")}</small>
                  </section>
                </div>
              </div>
              <a
                href="https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/outros-documentos"
                target="_blank"
                rel="noopener noreferrer"
              >
                {uiText("Consultar orientações oficiais de redação do Inep")}
              </a>
            </article>
          </div>
        </div>
        {mobileLayout && mobileSheetOpen && !resultsVisible && (
          <button
            className="essay-mobile-sheet-backdrop"
            aria-label={uiText("Fechar folha de redação")}
            onClick={() => setMobileSheetOpen(false)}
          />
        )}
        <section
          ref={mobileSheet}
          role={mobileLayout && mobileSheetOpen ? "dialog" : undefined}
          aria-modal={mobileLayout && mobileSheetOpen ? true : undefined}
          aria-label={mobileLayout ? uiText("Folha de redação") : undefined}
          inert={mobileLayout && !mobileSheetOpen}
          className={`essay-writing-sheet${sheetCollapsed ? " essay-writing-sheet--collapsed" : ""}`}
        >
          <button
            type="button"
            className="essay-mobile-sheet-handle"
            aria-label={uiText("Fechar folha de redação")}
            onClick={() => {
              setMobileSheetOpen(false);
              openSheetButton.current?.focus();
            }}
            onPointerDown={(event) => {
              sheetDragStart.current = event.clientY;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (sheetDragStart.current === null || !mobileSheet.current) return;
              mobileSheet.current.style.transform = `translateY(${Math.max(0, event.clientY - sheetDragStart.current)}px)`;
            }}
            onPointerUp={(event) => {
              const distance =
                sheetDragStart.current === null ? 0 : event.clientY - sheetDragStart.current;
              sheetDragStart.current = null;
              mobileSheet.current?.style.removeProperty("transform");
              if (distance > 70) {
                setMobileSheetOpen(false);
                openSheetButton.current?.focus();
              }
            }}
            onPointerCancel={() => {
              sheetDragStart.current = null;
              mobileSheet.current?.style.removeProperty("transform");
            }}
          >
            <span />
          </button>
          <header>
            <div className="essay-sheet-heading">
              <button
                type="button"
                className="essay-sheet-toggle"
                aria-label={uiText(
                  mobileLayout
                    ? "Fechar folha de redação"
                    : sheetCollapsed
                      ? "Mostrar folha de redação"
                      : "Esconder folha de redação",
                )}
                aria-expanded={!sheetCollapsed}
                aria-controls="essay-sheet-content"
                onClick={() =>
                  mobileLayout
                    ? (setMobileSheetOpen(false), openSheetButton.current?.focus())
                    : setSheetCollapsed(!sheetCollapsed)
                }
              >
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path fill="#4b287e" d="M3 5 7 2h20l3 4v23H3z" />
                  <path fill="#b78af5" d="M3 5h25v22H3z" />
                  <path fill="#f7f0ff" d="M6 7h14v17H6z" />
                  <path fill="#d3b8fa" d="m6 7 5 0-5 5z" />
                  <path fill="#7640c2" d="M22 7h4v17h-4z" />
                  <path fill="#8b49ed" d="m10 11 6 5-6 5v-4l3-1-3-1z" />
                  <path fill="#e4d4ff" d="M3 5 7 2h20l1 3z" />
                </svg>
              </button>
              <h2>{uiText("Folha de redação")}</h2>
            </div>
            <div className="essay-sheet-actions">
              <span aria-live="polite">{uiText(saved ? "Rascunho salvo" : "Salvando…")}</span>
              <button
                type="button"
                className="essay-history-button"
                aria-label={uiText("Desfazer")}
                disabled={historyIndex === 0}
                onClick={() => moveHistory(-1)}
              >
                <PaperEditorIcon name="undo" />
              </button>
              <button
                type="button"
                className="essay-history-button"
                aria-label={uiText("Refazer")}
                disabled={historyIndex === history.length - 1}
                onClick={() => moveHistory(1)}
              >
                <PaperEditorIcon name="redo" />
              </button>
            </div>
          </header>
          <div id="essay-sheet-content" hidden={sheetCollapsed}>
            <div className="essay-ruled-area">
              <div className="essay-line-numbers" aria-hidden="true">
                {Array.from({ length: 30 }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
              <textarea
                ref={essayInput}
                readOnly={completed}
                lang="pt-BR"
                aria-label={uiText("Sua redação")}
                value={text}
                onChange={(e) => {
                  changeText(e.target.value, e.timeStamp);
                }}
                onBlur={() => {
                  editGroup.current = { time: 0, kind: "" };
                }}
                onKeyDown={(event) => {
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    !event.nativeEvent.isComposing &&
                    (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")
                  ) {
                    event.preventDefault();
                    moveHistory(event.key.toLowerCase() === "y" || event.shiftKey ? 1 : -1);
                  }
                }}
                maxLength={6000}
                placeholder={uiText("Comece a escrever sua redação…")}
                onPaste={(event) => event.preventDefault()}
                onDrop={(event) => event.preventDefault()}
                onDragOver={(event) => event.preventDefault()}
                onBeforeInput={(event) => {
                  const input = event.nativeEvent as InputEvent;
                  if (
                    ["insertFromPaste", "insertFromDrop", "insertFromPasteAsQuotation"].includes(
                      input.inputType,
                    )
                  )
                    event.preventDefault();
                }}
                spellCheck={false}
              />
            </div>
            {!resultsVisible && !sheetCollapsed && (!mobileLayout || mobileSheetOpen) && (
              <EssayWritingOptions
                text={text}
                value={charactersPerLine}
                onChange={setCharactersPerLine}
              />
            )}
            {completed && (
              <p className="essay-completed" role="status">
                {uiText("Treino concluído. Sua redação foi salva, sem nota automática.")}
              </p>
            )}
          </div>
        </section>
      </div>
      {!resultsVisible && (
        <button
          ref={openSheetButton}
          type="button"
          className="secondary-button essay-mobile-open-sheet"
          onClick={() => {
            setSheetCollapsed(false);
            setMobileSheetOpen(true);
          }}
        >
          {uiText("Abrir folha de redação")}
        </button>
      )}
      {expandedSupport !== null && (
        <LibraryDialog
          title={uiText(["Texto I", "Texto II", "Texto III"][expandedSupport]!)}
          onClose={() => setExpandedSupport(null)}
          className="essay-support-reading-modal"
        >
          {[
            ESSAY_VISUALS[proposal.id].context,
            ESSAY_VISUALS[proposal.id].authorText,
            ESSAY_VISUALS[proposal.id].discussion,
          ]
            [expandedSupport]!.split("\n\n")
            .map((paragraph, index) => (
              <p key={index}>{uiText(paragraph)}</p>
            ))}
        </LibraryDialog>
      )}
      <EssayProofreading
        initiallySubmitted={initiallySubmitted}
        locked={completed}
        onViewChange={setResultsVisible}
        onContinue={onBack}
        text={text}
        elapsedSeconds={seconds}
        topicId={proposal.id}
        topicTitle={proposal.title}
        onSubmit={() => {
          save(true);
          if (
            !workspace.materials.some(
              (item) =>
                item.collectionId === collectionId &&
                item.tags?.includes("essay-submission") &&
                item.tags.includes(proposal.id) &&
                item.content === text,
            )
          ) {
            dispatch({
              type: "material/added",
              id: createWorkspaceId("essay-submission"),
              collectionId,
              subjectId: workspace.subjects[0]?.id ?? "",
              kind: "text",
              title: proposal.title,
              content: text,
              tags: ["essay-submission", proposal.id, `essay-seconds:${seconds}`],
              createdAt: new Date().toISOString(),
            });
          }
          setCompleted(true);
          if (clockRunning) toggleClock();
        }}
        onChange={(next) => {
          editGroup.current = { time: 0, kind: "" };
          changeText(next, performance.now());
        }}
        onLocate={(start, end) => {
          requestAnimationFrame(() => {
            essayInput.current?.focus();
            essayInput.current?.setSelectionRange(start, end);
            essayInput.current?.scrollIntoView({ block: "nearest" });
          });
        }}
      />
    </section>
  );
}
