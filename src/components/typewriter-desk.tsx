import { EssayVisualSupport } from "./essay-visual-support";
import { ESSAY_VISUALS } from "../data/essay-visuals";
import { EssayDeskIcon } from "./essay-desk-icon";
import { useEffect, useRef, useState, type Dispatch } from "react";
import { createWorkspaceId, type WorkspaceState, type WorkspaceAction } from "../domain/workspace";
import { ESSAY_CATEGORIES, ESSAY_PROPOSALS, type EssayProposal } from "../data/essay-catalog";
import { uiText } from "../i18n/runtime";
import { PaperArrow } from "./paper-arrow";
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
            ["vestibular", "Vestibular"],
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
              const next =
                e.key === "Home"
                  ? "redacao"
                  : e.key === "End"
                    ? "vestibular"
                    : tab === "redacao"
                      ? "vestibular"
                      : "redacao";
              setTab(next);
              document.getElementById("desk-tab-" + next)?.focus();
            }}
          >
            <EssayDeskIcon name={id} />
            {uiText(label)}
          </button>
        ))}
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
            <p className="essay-catalog-note">
              {uiText("{0} propostas autorais de treino Olena", [ESSAY_PROPOSALS.length])}
            </p>
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
              item.tags?.includes(proposal.id),
          );
          const completed = draft?.tags?.includes("essay-completed");
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
                {uiText(draft ? "Continuar" : "Começar")} <PaperArrow />
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
      !item.archived && item.collectionId === collectionId && item.tags?.includes(proposal.id),
  );
  const [text, setText] = useState(draft?.content ?? "");
  const [history, setHistory] = useState<string[]>([draft?.content ?? ""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const editGroup = useRef({ time: 0, kind: "" });
  function changeText(next: string, now: number) {
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
    editGroup.current = { time: 0, kind: "" };
    const next = historyIndex + delta;
    if (next < 0 || next >= history.length) return;
    setHistoryIndex(next);
    setText(history[next] ?? "");
    setSaved(false);
    setCompleted(false);
  }
  const [completed, setCompleted] = useState(draft?.tags?.includes("essay-completed") ?? false);
  const [seconds, setSeconds] = useState(0);
  const [saved, setSaved] = useState(true);
  const [materialId] = useState(() => draft?.id ?? createWorkspaceId("essay"));
  const exists = useRef(!!draft);
  const savedText = useRef(draft?.content ?? "");
  const savedCompleted = useRef(completed);
  const [started] = useState(() => Date.now());
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
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
    const interval = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [started]);
  useEffect(() => {
    const timeout = setTimeout(() => save(), 600);
    return () => clearTimeout(timeout);
  });
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <section className="essay-writing">
      <div
        className={`essay-writing-columns${sheetCollapsed ? " essay-writing-columns--collapsed" : ""}`}
      >
        <div className="essay-proposal-panel">
          <div className="essay-proposal-controls">
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
            <span
              className="essay-writing-clock"
              role="timer"
              aria-label={uiText("Tempo de escrita")}
            >
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
          <article className="essay-prompt-paper">
            <header>
              <img src="/olena-favicon-192.png" alt="Olena" width="44" height="44" />
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
                  {ESSAY_VISUALS[proposal.id].context.split("\n\n").map((paragraph, index) => (
                    <p key={index}>{uiText(paragraph)}</p>
                  ))}
                  <EssayVisualSupport proposalId={proposal.id} />
                </section>
              </div>
              <div className="essay-support-column">
                <section>
                  <h3>{uiText("Texto II")}</h3>
                  {ESSAY_VISUALS[proposal.id].authorText.split("\n\n").map((paragraph, index) => (
                    <p key={index}>{uiText(paragraph)}</p>
                  ))}
                  <small>{uiText("Texto de apoio autoral Olena")}</small>
                </section>
                <section>
                  <h3>{uiText("Texto III")}</h3>
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
        <section
          className={`essay-writing-sheet${sheetCollapsed ? " essay-writing-sheet--collapsed" : ""}`}
        >
          <header>
            <div className="essay-sheet-heading">
              <button
                type="button"
                className="essay-sheet-toggle"
                aria-label={uiText(
                  sheetCollapsed ? "Mostrar folha de redação" : "Esconder folha de redação",
                )}
                aria-expanded={!sheetCollapsed}
                aria-controls="essay-sheet-content"
                onClick={() => setSheetCollapsed(!sheetCollapsed)}
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
                spellCheck
              />
            </div>
            <footer>
              <span>{uiText("{0} palavras", [words])}</span>
              <button
                type="button"
                className="shelf-wood-button"
                disabled={!text.trim()}
                onClick={() => {
                  save(true);
                  setCompleted(true);
                }}
              >
                {uiText("Concluir treino")}
              </button>
            </footer>
            {completed && (
              <p className="essay-completed" role="status">
                {uiText("Treino concluído. Sua redação foi salva, sem nota automática.")}
              </p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
