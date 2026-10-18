import { uiText, useLanguage } from "../i18n/runtime";
import type { StudyNote, StudyNotebook } from "../domain/workspace";
import "./text-note.css";

export function TextNotePreview({ title, content = "" }: { title: string; content?: string }) {
  useLanguage();

  return (
    <span className="text-note-preview" aria-hidden="true">
      <span className="text-note-preview__sheet">
        <span className="text-note-preview__label">{uiText(1037)}</span>
        <strong>{title}</strong>
        <span className="text-note-preview__excerpt">{content.slice(0, 520) || uiText(2073)}</span>
        <span className="text-note-preview__footer">{uiText(1038)}</span>
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
  useLanguage();

  const content = note?.content ?? "";
  const words = content.trim() ? content.trim().split(/\s+/u).length : 0;
  return (
    <section className="text-note-workspace" aria-label={uiText(1039)}>
      <header className="text-note-toolbar">
        <button
          type="button"
          className="notebook-paper-tool notebook-back-tool"
          aria-label={uiText(1040)}
          onClick={onBack}
        >
          <img src="/paper-arrow.svg" alt="" />
        </button>
        <span>
          {uiText(1037)} <small>{uiText(1041)}</small>
        </span>
        <span className="text-note-word-count">
          {words} {uiText(words === 1 ? "palavra" : "palavras")}
        </span>
      </header>
      <div className="text-note-paper">
        <span className="text-note-paper__eyebrow">{uiText(1042)}</span>
        <input
          aria-label={uiText(1043)}
          value={notebook.title}
          maxLength={80}
          onChange={(event) => onTitle(event.target.value)}
          placeholder={uiText(1044)}
        />
        <textarea
          aria-label={uiText(1045)}
          value={content}
          onChange={(event) => onContent(event.target.value)}
          placeholder={uiText(1046)}
          spellCheck
        />
        <footer>
          {uiText(1047)}
          <span>01</span>
        </footer>
      </div>
    </section>
  );
}
