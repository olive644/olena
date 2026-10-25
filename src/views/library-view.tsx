import { lazy, Suspense, useRef, useState, type Dispatch } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { PageHeader } from "../components/app-navigation";
import { PaperChoice } from "../components/agenda-paper-fields";
import { PaperEditorIcon } from "../components/paper-editor-icon";
import { PaperObjectIcon } from "../components/paper-object-icon";
import { PaperDigits } from "../components/paper-digits";
import { LibraryDialog } from "../components/library-dialog";
import { HelenaLoading } from "../components/helena-loading";
import { libraryFile, pdfFingerprint } from "../data/library-files";
import { filterMaterials, safeMaterialUrl } from "../domain/library";
import {
  createWorkspaceId,
  toDateKey,
  type StudyMaterial,
  type WorkspaceAction,
  type WorkspaceState,
} from "../domain/workspace";
import "./library-view.css";

const MaterialReader = lazy(() => import("../components/library-material-reader"));
type Props = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  scope?: string;
  initialMaterialId?: string;
  onFocus?: (id: string) => void;
  onNotebook?: (id: string, page?: string) => void;
};

export function LibraryView({
  workspace,
  dispatch,
  scope = "guest",
  initialMaterialId,
  onFocus,
  onNotebook,
}: Props) {
  useLanguage();
  const today = toDateKey(new Date());
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState("");
  const [collection, setCollection] = useState("");
  const [archived, setArchived] = useState(false);
  const [favorites, setFavorites] = useState(false);
  const [sort, setSort] = useState("recent");
  const [activeId, setActiveId] = useState(initialMaterialId ?? "");
  const [creating, setCreating] = useState<"" | "material" | "card" | "collection">("");
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [materialKind, setMaterialKind] = useState<StudyMaterial["kind"]>("link");
  const [draftSubject, setDraftSubject] = useState(workspace.subjects[0]?.id ?? "");
  const [draftCollection, setDraftCollection] = useState("");
  const [tags, setTags] = useState("");
  const [motif, setMotif] = useState("book");
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<StudyMaterial>();
  const [removeCollection, setRemoveCollection] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [source, setSource] = useState<{ id: string; page: number }>();
  const fileInput = useRef<HTMLInputElement>(null);
  const active = workspace.materials.find((item) => item.id === activeId);
  const collections = workspace.libraryCollections ?? [];
  const materials = filterMaterials(workspace.materials, {
    query,
    subject,
    kind,
    collection,
    archived,
    favorites,
    sort,
  });
  const due = workspace.flashcards.filter(
    (card) => card.nextReview <= today && (!subject || card.subjectId === subject),
  );
  const review = due.find((card) => !reviewed.includes(card.id));
  const last = [...workspace.materials]
    .filter((item) => !item.archived && item.openedAt)
    .sort((a, b) => (b.openedAt ?? "").localeCompare(a.openedAt ?? ""))[0];
  const nameOf = (id: string) => workspace.subjects.find((item) => item.id === id)?.name ?? "";
  const update = (id: string, changes: Partial<StudyMaterial>) =>
    dispatch({ type: "material/updated", id, changes });
  function openMaterial(item: StudyMaterial) {
    setActiveId(item.id);
    update(item.id, { openedAt: new Date().toISOString() });
  }
  function startCreate(type: "material" | "card" | "collection", item?: StudyMaterial) {
    setError("");
    setTitle(item?.title ?? "");
    setContent(item?.content ?? "");
    setTags(item?.tags?.join(", ") ?? "");
    setMaterialKind(item?.kind ?? "link");
    setDraftSubject(item?.subjectId ?? (subject || workspace.subjects[0]?.id || ""));
    setDraftCollection(item?.collectionId ?? collection);
    setEditingId(item?.id ?? "");
    setFile(undefined);
    setCreating(type);
  }
  async function saveMaterial() {
    if (!title.trim() || !draftSubject || busy) return;
    setError("");
    setBusy(true);
    try {
      const id = editingId || createWorkspaceId("material");
      let body = content.trim();
      if (materialKind === "link" && !safeMaterialUrl(body))
        throw new Error(uiText("Use um link http ou https válido."));
      if (materialKind === "pdf" && !editingId) {
        if (!file) throw new Error(uiText("Selecione um PDF com até 20 MB."));
        body = await pdfFingerprint(file);
        await libraryFile(scope, id, file);
      }
      if (!body) return;
      const changes = {
        title: title.trim(),
        subjectId: draftSubject,
        content: body,
        kind: materialKind,
        tags: [
          ...new Set(
            tags
              .split(",")
              .map((tag) => tag.trim().slice(0, 80))
              .filter(Boolean),
          ),
        ].slice(0, 30),
        collectionId: draftCollection || undefined,
      };
      if (editingId) update(editingId, changes);
      else
        dispatch({ type: "material/added", id, ...changes, createdAt: new Date().toISOString() });
      setCreating("");
      setMessage(uiText("Material salvo."));
    } catch (caught) {
      setError(
        caught instanceof Error && !caught.message.startsWith("PDF_")
          ? caught.message
          : uiText(
              "Não foi possível salvar. Use um PDF válido de até 20 MB e confira o espaço do dispositivo.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="main-content library-hub" id="main-content">
      <PageHeader />
      <header className="library-heading">
        <div>
          <span className="section-label">{uiText("Seu acervo")}</span>
          <h1>{uiText("Biblioteca")}</h1>
        </div>
        <button className="primary-button" onClick={() => startCreate("material")}>
          <PaperEditorIcon name="add" />
          {uiText("Adicionar material")}
        </button>
      </header>
      {message && (
        <p role="status" className="library-message">
          {message}
        </p>
      )}
      <div className="library-launchers">
        <section>
          <PaperObjectIcon name="notebook" />
          <div>
            <h2>{uiText("Continuar estudando")}</h2>
            {last ? (
              <>
                <p>{last.title}</p>
                <button className="secondary-button" onClick={() => openMaterial(last)}>
                  {uiText("Continuar leitura")}
                </button>
              </>
            ) : (
              <p>{uiText("Abra um material para retomar sua leitura aqui.")}</p>
            )}
          </div>
        </section>
        <section>
          <PaperEditorIcon name="review" />
          <div>
            <h2>{uiText("Para revisar hoje")}</h2>
            <PaperDigits value={String(due.length)} />
            <div className="library-tools">
              <button
                className="primary-button"
                disabled={!due.length}
                onClick={() => {
                  setReviewed([]);
                  setRevealed(false);
                  setReviewing(true);
                }}
              >
                {uiText("Revisar flashcards")}
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setFront("");
                  setBack("");
                  setSource(undefined);
                  startCreate("card");
                }}
              >
                {uiText("Criar flashcard")}
              </button>
            </div>
          </div>
        </section>
      </div>
      <section className="library-collections" aria-label={uiText("Coleções")}>
        <header>
          <h2>{uiText("Coleções")}</h2>
          <button
            className="library-icon"
            aria-label={uiText("Criar coleção")}
            onClick={() => startCreate("collection")}
          >
            <PaperEditorIcon name="add" />
          </button>
        </header>
        <div className="library-shelf">
          <button
            className={`library-collection ${!collection ? "is-selected" : ""}`}
            onClick={() => setCollection("")}
            aria-pressed={!collection}
          >
            <PaperObjectIcon name="folder" />
            <span>{uiText("Todo o acervo")}</span>
          </button>
          {collections.map((item) => (
            <button
              key={item.id}
              className={`library-collection motif-${item.motif} ${collection === item.id ? "is-selected" : ""}`}
              onClick={() => setCollection(item.id)}
              aria-pressed={collection === item.id}
            >
              <svg viewBox="0 0 120 100" aria-hidden="true">
                <use href={`/navigation-icons/paper/library-collections.svg#${item.motif}`} />
              </svg>
              <span>{item.title}</span>
              <small>
                <PaperDigits
                  value={String(
                    workspace.materials.filter(
                      (material) => material.collectionId === item.id && !material.archived,
                    ).length,
                  )}
                />
              </small>
            </button>
          ))}
        </div>
        {collection && (
          <button className="text-button" onClick={() => setRemoveCollection(collection)}>
            {uiText("Excluir coleção")}
          </button>
        )}
      </section>
      <section aria-label={uiText("Acervo")}>
        <div className="library-filters">
          <label className="field library-search">
            <span>{uiText("Buscar no acervo")}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={uiText("Título, conteúdo ou etiqueta")}
            />
          </label>
          <PaperChoice
            label={uiText("Matéria")}
            value={subject}
            onChange={setSubject}
            options={[
              { value: "", label: uiText("Todas as matérias") },
              ...workspace.subjects.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <PaperChoice
            label={uiText("Tipo")}
            value={kind}
            onChange={setKind}
            options={[
              { value: "", label: uiText("Todos os tipos") },
              { value: "link", label: uiText("Link") },
              { value: "text", label: uiText("Texto") },
              { value: "pdf", label: "PDF" },
            ]}
          />
          <PaperChoice
            label={uiText("Ordenar")}
            value={sort}
            onChange={setSort}
            options={[
              { value: "recent", label: uiText("Mais recentes") },
              { value: "title", label: uiText("Título") },
              { value: "opened", label: uiText("Últimos abertos") },
            ]}
          />
        </div>
        <div className="library-tools">
          <button
            className="secondary-button"
            aria-pressed={favorites}
            onClick={() => setFavorites(!favorites)}
          >
            {uiText("Favoritos")}
          </button>
          <button
            className="secondary-button"
            aria-pressed={archived}
            onClick={() => setArchived(!archived)}
          >
            {uiText("Arquivados")}
          </button>
        </div>
        <div className="library-materials">
          {materials.map((item) => (
            <article className={`library-material kind-${item.kind}`} key={item.id}>
              <button className="library-material-open" onClick={() => openMaterial(item)}>
                <PaperObjectIcon name={item.kind === "link" ? "note" : "notebook"} />
                <small>
                  {nameOf(item.subjectId)} ·{" "}
                  {item.kind === "pdf" ? "PDF" : uiText(item.kind === "link" ? "Link" : "Texto")}
                </small>
                <h3>{item.title}</h3>
                <p>
                  {item.kind === "pdf"
                    ? uiText("Arquivo neste dispositivo")
                    : item.content.slice(0, 110)}
                </p>
                <span className="library-tags">
                  {item.tags?.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </span>
              </button>
              <div className="library-tools">
                <button
                  className="library-icon"
                  aria-label={uiText("Favoritar material")}
                  aria-pressed={item.favorite ?? false}
                  onClick={() => update(item.id, { favorite: !item.favorite })}
                >
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill={item.favorite ? "#facc15" : "currentColor"}
                      d="m24 3 7 13 15 3-11 11 2 15-13-7-14 7 3-15L2 19l15-3Z"
                    />
                    <path fill="#ffe88d" d="m24 3 1 22L2 19l15-3Z" />
                  </svg>
                </button>
                <button
                  className="library-icon"
                  aria-label={uiText("Editar material")}
                  onClick={() => startCreate("material", item)}
                >
                  <PaperEditorIcon name="pen" />
                </button>
                <button
                  className="library-icon"
                  aria-label={uiText(item.archived ? "Restaurar material" : "Arquivar material")}
                  onClick={() => update(item.id, { archived: !item.archived })}
                >
                  <PaperObjectIcon name="folder" />
                </button>
                <button
                  className="library-icon"
                  aria-label={uiText("Excluir material")}
                  onClick={() => setRemoving(item)}
                >
                  <PaperEditorIcon name="trash" />
                </button>
              </div>
            </article>
          ))}
        </div>
        {!materials.length && (
          <div className="library-empty">
            <PaperObjectIcon name="folder" />
            <p>
              {uiText("Nenhum material encontrado. Adicione um conteúdo ou ajuste os filtros.")}
            </p>
          </div>
        )}
      </section>
      {!!workspace.flashcards.length && (
        <section className="library-flashcards">
          <h2>{uiText("Flashcards")}</h2>
          <ul>
            {workspace.flashcards.map((card) => (
              <li key={card.id}>
                <strong>{card.front}</strong>
                <small>
                  {nameOf(card.subjectId)} · {uiText("Próxima revisão")}: {card.nextReview}
                </small>
                {card.materialId &&
                  workspace.materials.some((item) => item.id === card.materialId) && (
                    <button
                      className="text-button"
                      onClick={() => {
                        const material = workspace.materials.find(
                          (item) => item.id === card.materialId,
                        );
                        if (material) {
                          openMaterial(material);
                          if (card.sourcePage) update(material.id, { page: card.sourcePage });
                        }
                      }}
                    >
                      {uiText("Ver fonte")}
                    </button>
                  )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {creating && (
        <LibraryDialog
          title={uiText(
            creating === "material"
              ? editingId
                ? "Editar material"
                : "Adicionar material"
              : creating === "card"
                ? "Criar flashcard"
                : "Criar coleção",
          )}
          onClose={() => {
            if (!busy) setCreating("");
          }}
        >
          <form
            className="compact-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (creating === "material") void saveMaterial();
              else if (creating === "collection") {
                if (!title.trim()) return;
                dispatch({
                  type: "library/collection-saved",
                  collection: {
                    id: createWorkspaceId("collection"),
                    title: title.trim(),
                    motif: motif as "moon" | "sun" | "book",
                  },
                });
                setCreating("");
              } else {
                if (!front.trim() || !back.trim() || !draftSubject) return;
                dispatch({
                  type: "flashcard/added",
                  front: front.trim(),
                  back: back.trim(),
                  subjectId: draftSubject,
                  createdOn: today,
                  ...(source ? { materialId: source.id, sourcePage: source.page } : {}),
                });
                setCreating("");
                setMessage(uiText("Flashcard criado."));
              }
            }}
          >
            {creating !== "collection" && (
              <PaperChoice
                label={uiText("Matéria")}
                value={draftSubject}
                onChange={setDraftSubject}
                options={workspace.subjects.map((item) => ({ value: item.id, label: item.name }))}
              />
            )}
            {creating !== "card" && (
              <label className="field">
                <span>{uiText("Título")}</span>
                <input
                  required
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
            )}
            {creating === "collection" && (
              <PaperChoice
                label={uiText("Capa da coleção")}
                value={motif}
                onChange={setMotif}
                options={[
                  { value: "book", label: uiText("Caderno") },
                  { value: "moon", label: uiText("Noite de estudo") },
                  { value: "sun", label: uiText("Dia de descobertas") },
                ]}
              />
            )}
            {creating === "material" && (
              <>
                <PaperChoice
                  disabled={!!editingId}
                  label={uiText("Tipo")}
                  value={materialKind}
                  onChange={(value) => setMaterialKind(value as StudyMaterial["kind"])}
                  options={[
                    { value: "link", label: uiText("Link") },
                    { value: "text", label: uiText("Texto") },
                    { value: "pdf", label: "PDF" },
                  ]}
                />
                {materialKind === "pdf" ? (
                  !editingId && (
                    <label className="field">
                      <span>{uiText("PDF, até 20 MB")}</span>
                      <input
                        ref={fileInput}
                        required
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) => setFile(event.target.files?.[0])}
                      />
                      <small>
                        {uiText("O arquivo fica neste dispositivo, sem envio a terceiros.")}
                      </small>
                    </label>
                  )
                ) : (
                  <label className="field">
                    <span>{uiText(materialKind === "link" ? "Endereço do link" : "Conteúdo")}</span>
                    {materialKind === "link" ? (
                      <input
                        required
                        type="url"
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                      />
                    ) : (
                      <textarea
                        required
                        rows={7}
                        maxLength={100000}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                      />
                    )}
                  </label>
                )}
                <PaperChoice
                  label={uiText("Coleção")}
                  value={draftCollection}
                  onChange={setDraftCollection}
                  options={[
                    { value: "", label: uiText("Sem coleção") },
                    ...collections.map((item) => ({ value: item.id, label: item.title })),
                  ]}
                />
                <label className="field">
                  <span>{uiText("Etiquetas separadas por vírgula")}</span>
                  <input
                    maxLength={800}
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                  />
                </label>
              </>
            )}
            {creating === "card" && (
              <>
                <label className="field">
                  <span>{uiText("Frente")}</span>
                  <textarea
                    required
                    maxLength={10000}
                    value={front}
                    onChange={(event) => setFront(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{uiText("Verso")}</span>
                  <textarea
                    required
                    maxLength={10000}
                    value={back}
                    onChange={(event) => setBack(event.target.value)}
                  />
                </label>
              </>
            )}
            {error && <p role="alert">{error}</p>}
            {busy && <HelenaLoading compact label={uiText("Salvando material")} />}
            <button className="primary-button" disabled={busy} type="submit">
              {uiText(creating === "card" ? "Criar flashcard" : "Salvar")}
            </button>
          </form>
        </LibraryDialog>
      )}
      {(removing || removeCollection) && (
        <LibraryDialog
          title={uiText(removing ? "Excluir material" : "Excluir coleção")}
          onClose={() => {
            setRemoving(undefined);
            setRemoveCollection("");
          }}
        >
          <p>
            {removing
              ? removing.title
              : uiText("Os materiais serão mantidos no acervo, sem coleção.")}
          </p>
          <div className="library-tools">
            <button
              className="secondary-button"
              onClick={() => {
                setRemoving(undefined);
                setRemoveCollection("");
              }}
            >
              {uiText("Cancelar")}
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={async () => {
                if (removing) {
                  setBusy(true);
                  try {
                    if (removing.kind === "pdf") await libraryFile(scope, removing.id, null);
                    dispatch({ type: "material/removed", id: removing.id });
                    setRemoving(undefined);
                    setMessage(uiText("Material excluído."));
                  } catch {
                    setMessage(uiText("Não foi possível excluir o arquivo. Tente novamente."));
                  } finally {
                    setBusy(false);
                  }
                } else {
                  dispatch({ type: "library/collection-removed", id: removeCollection });
                  setCollection("");
                  setRemoveCollection("");
                }
              }}
            >
              {uiText("Excluir")}
            </button>
          </div>
        </LibraryDialog>
      )}
      {reviewing && (
        <LibraryDialog title={uiText("Revisar flashcards")} onClose={() => setReviewing(false)}>
          {review ? (
            <div className={`library-review ${revealed ? "is-revealed" : ""}`}>
              <p>{nameOf(review.subjectId)}</p>
              <h3>{review.front}</h3>
              {revealed ? (
                <>
                  <p className="library-answer">{review.back}</p>
                  <div className="library-tools">
                    {(["again", "hard", "easy"] as const).map((rating) => (
                      <button
                        className="secondary-button"
                        key={rating}
                        onClick={() => {
                          dispatch({
                            type: "flashcard/reviewed",
                            id: review.id,
                            rating,
                            reviewedOn: today,
                          });
                          setReviewed([...reviewed, review.id]);
                          setRevealed(false);
                        }}
                      >
                        {uiText(
                          rating === "again" ? "Errei" : rating === "hard" ? "Difícil" : "Fácil",
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <button className="primary-button" onClick={() => setRevealed(true)}>
                  {uiText("Revelar resposta")}
                </button>
              )}
              <small>
                {uiText("Revisados nesta sessão")}: {reviewed.length}
              </small>
            </div>
          ) : (
            <div className="library-empty">
              <PaperEditorIcon name="review" />
              <h3>{uiText("Revisão concluída!")}</h3>
              <p>{uiText("Os cartões voltarão conforme sua próxima revisão.")}</p>
            </div>
          )}
        </LibraryDialog>
      )}
      {active && (
        <Suspense fallback={<HelenaLoading label={uiText("Abrindo material")} />}>
          <MaterialReader
            key={active.id}
            material={active}
            workspace={workspace}
            dispatch={dispatch}
            scope={scope}
            onClose={() => setActiveId("")}
            onFocus={onFocus}
            onNotebook={onNotebook}
            onFlashcard={(text, page) => {
              setFront(text);
              setBack("");
              setSource({ id: active.id, page });
              startCreate("card", active);
            }}
          />
        </Suspense>
      )}
    </main>
  );
}
export default LibraryView;
