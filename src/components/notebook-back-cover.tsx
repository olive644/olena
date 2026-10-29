import { uiText, useLanguage } from "../i18n/runtime";
import type { CSSProperties } from "react";
import { PaperMoonMark } from "./paper-moon-mark";

/** Contracapa do caderno 2D: o espelho da capa, com a lombada à direita e a etiqueta de dono. */
export function NotebookBackCover({ subjectColor }: { subjectColor: string }) {
  useLanguage();

  return (
    <span
      className="book-cover is-back"
      style={{ "--notebook-accent": subjectColor } as CSSProperties}
      aria-hidden="true"
    >
      <span className="book-cover__backboard" />
      <span className="book-cover__pages" />
      <span className="book-cover__face">
        <span className="book-cover__medal">
          <PaperMoonMark compact />
        </span>
        <span className="book-cover__label">
          <span className="book-cover__title">{uiText(3166)}</span>
          <span className="book-cover__lines">
            <i />
            <i />
          </span>
        </span>
      </span>
      <span className="book-cover__spine">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}
