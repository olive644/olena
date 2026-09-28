import type { StudyNote, StudyNotebook } from "../domain/workspace";
import "./text-note.css";

export function TextNotePreview({ title, content = "" }: { title: string; content?: string }) {
  return (
    <span className="text-note-preview" aria-hidden="true">
      <span className="text-note-preview__sheet">
        <span className="text-note-preview__label">NOTE</span>
        <strong>{title}</strong>
        <span className="text-note-preview__excerpt">
          {content.slice(0, 520) || "Uma ideia começa aqui..."}
        </span>
        <span className="text-note-preview__footer">OLENA / SUAS IDEIAS</span>
      </span>
    </span>
  );
}

export function TextNoteEditor({
  notebook,
  note,
  onBack,
  onTitle,
  onContent,
}: {
  notebook: StudyNotebook;
  note: StudyNote | undefined;
  onBack: () => void;
  onTitle: (title: string) => void;
  onContent: (content: string) => void;
}) {
  const content = note?.content ?? "";
  const words = content.trim() ? content.trim().split(/\s+/u).length : 0;
  return (
    <section className="text-note-workspace" aria-label="Editor de Note">
      <header className="text-note-toolbar">
        <button
          type="button"
          className="notebook-paper-tool notebook-back-tool"
          aria-label="Voltar à vitrine"
          onClick={onBack}
        >
          <img src="/paper-arrow.svg" alt="" />
        </button>
        <span>
          NOTE <small>Salvamento automático</small>
        </span>
        <span className="text-note-word-count">
          {words} {words === 1 ? "palavra" : "palavras"}
        </span>
      </header>
      <div className="text-note-paper">
        <span className="text-note-paper__eyebrow">ESPAÇO PARA SUAS IDEIAS</span>
        <input
          aria-label="Título da Note"
          value={notebook.title}
          maxLength={80}
          onChange={(event) => onTitle(event.target.value)}
          placeholder="Minha Note"
        />
        <textarea
          aria-label="Texto da Note"
          value={content}
          onChange={(event) => onContent(event.target.value)}
          placeholder="Comece a escrever..."
          spellCheck
        />
        <footer>
          Uma palavra de cada vez.<span>01</span>
        </footer>
      </div>
    </section>
  );
}
