import { uiText, useLanguage } from "../i18n/runtime";
import { Plus } from "lucide-react";
import { useState, type Dispatch, type FormEvent } from "react";
import { PageHeader } from "../components/app-navigation";
import { toDateKey, type WorkspaceAction, type WorkspaceState } from "../domain/workspace";

type LibraryViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function LibraryView({ workspace, dispatch }: LibraryViewProps) {
  useLanguage();

  const defaultSubject = workspace.subjects[0];
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialKind, setMaterialKind] = useState<"link" | "text">("link");
  const [materialContent, setMaterialContent] = useState("");
  const [materialSubjectId, setMaterialSubjectId] = useState(defaultSubject?.id ?? "");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [cardSubjectId, setCardSubjectId] = useState(defaultSubject?.id ?? "");

  if (!defaultSubject) return null;

  function addMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = materialTitle.trim();
    const content = materialContent.trim();
    if (!title || !content) return;
    dispatch({
      type: "material/added",
      subjectId: materialSubjectId,
      title,
      kind: materialKind,
      content,
      createdAt: new Date().toISOString(),
    });
    setMaterialTitle("");
    setMaterialContent("");
  }

  function addFlashcard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = front.trim();
    const answer = back.trim();
    if (!question || !answer) return;
    dispatch({
      type: "flashcard/added",
      subjectId: cardSubjectId,
      front: question,
      back: answer,
      createdOn: toDateKey(new Date()),
    });
    setFront("");
    setBack("");
  }

  const subjectName = (subjectId: string) =>
    workspace.subjects.find((subject) => subject.id === subjectId)?.name ?? uiText(2278);

  return (
    <main className="main-content" id="main-content">
      <PageHeader />
      <header className="view-heading">
        <span className="section-label">{uiText(1311)}</span>
        <h1>{uiText(1312)}</h1>
        <p>{uiText(1313)}</p>
      </header>

      <div className="library-create-grid">
        <section className="module-panel" aria-labelledby="new-material-title">
          <div className="module-heading">
            <h2 id="new-material-title">{uiText(1314)}</h2>
          </div>
          <form className="compact-form" onSubmit={addMaterial}>
            <div className="field-row">
              <label className="field">
                <span>{uiText(1315)}</span>
                <select
                  value={materialKind}
                  onChange={(event) => setMaterialKind(event.target.value as "link" | "text")}
                >
                  <option value="link">{uiText(1316)}</option>
                  <option value="text">{uiText(361)}</option>
                </select>
              </label>
              <label className="field">
                <span>{uiText(1270)}</span>
                <select
                  value={materialSubjectId}
                  onChange={(event) => setMaterialSubjectId(event.target.value)}
                >
                  {workspace.subjects.map((subject) => (
                    <option value={subject.id} key={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>{uiText(284)}</span>
              <input
                value={materialTitle}
                onChange={(event) => setMaterialTitle(event.target.value)}
                placeholder={uiText(1317)}
                required
              />
            </label>
            <label className="field">
              <span>{materialKind === "link" ? uiText(1318) : uiText(1319)}</span>
              {materialKind === "link" ? (
                <input
                  type="url"
                  value={materialContent}
                  onChange={(event) => setMaterialContent(event.target.value)}
                  placeholder="https://..."
                  required
                />
              ) : (
                <textarea
                  value={materialContent}
                  onChange={(event) => setMaterialContent(event.target.value)}
                  placeholder={uiText(1320)}
                  rows={4}
                  required
                />
              )}
            </label>
            <button className="secondary-button" type="submit">
              <Plus size={16} /> {uiText(1321)}
            </button>
          </form>
        </section>

        <section className="module-panel" aria-labelledby="new-card-title">
          <div className="module-heading">
            <h2 id="new-card-title">{uiText(1322)}</h2>
          </div>
          <form className="compact-form" onSubmit={addFlashcard}>
            <label className="field">
              <span>{uiText(1270)}</span>
              <select
                value={cardSubjectId}
                onChange={(event) => setCardSubjectId(event.target.value)}
              >
                {workspace.subjects.map((subject) => (
                  <option value={subject.id} key={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{uiText(1323)}</span>
              <textarea
                value={front}
                onChange={(event) => setFront(event.target.value)}
                placeholder={uiText(1324)}
                rows={3}
                required
              />
            </label>
            <label className="field">
              <span>{uiText(1325)}</span>
              <textarea
                value={back}
                onChange={(event) => setBack(event.target.value)}
                placeholder={uiText(1326)}
                rows={3}
                required
              />
            </label>
            <button className="primary-button" type="submit">
              <Plus size={16} /> {uiText(1327)}
            </button>
          </form>
        </section>
      </div>

      <div className="library-content-grid">
        <section className="module-panel" aria-labelledby="material-list-title">
          <div className="module-heading">
            <h2 id="material-list-title">{uiText(1061)}</h2>
            <span>{workspace.materials.length}</span>
          </div>
          {workspace.materials.length === 0 ? (
            <div className="empty-state">
              <p>{uiText(1328)}</p>
            </div>
          ) : (
            <ul className="material-list">
              {workspace.materials.map((material) => {
                const href = material.kind === "link" ? safeUrl(material.content) : null;
                return (
                  <li key={material.id}>
                    <span>{material.kind === "link" ? uiText(1316) : uiText(361)}</span>
                    <div>
                      <strong>{material.title}</strong>
                      <small>{subjectName(material.subjectId)}</small>
                    </div>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer">
                        {uiText(630)}
                      </a>
                    ) : (
                      <p>{material.content}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="module-panel" aria-labelledby="card-list-title">
          <div className="module-heading">
            <h2 id="card-list-title">{uiText(1273)}</h2>
            <span>{workspace.flashcards.length}</span>
          </div>
          {workspace.flashcards.length === 0 ? (
            <div className="empty-state">
              <p>{uiText(1329)}</p>
            </div>
          ) : (
            <ul className="flashcard-list">
              {workspace.flashcards.map((card) => (
                <li key={card.id}>
                  <strong>{card.front}</strong>
                  <p>{card.back}</p>
                  <small>
                    {subjectName(card.subjectId)} {uiText(1330)} {card.nextReview}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default LibraryView;
