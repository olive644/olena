import type { CSSProperties } from "react";
import type { NotebookTab } from "../domain/workspace";
import { PaperMoonMark } from "./notebook-paper-tools";

export function NotebookCover({
  subjectColor,
  title = "Ideias em papel",
  tabs = [],
  clasp = true,
}: {
  subjectColor: string;
  title?: string;
  tabs?: NotebookTab[];
  clasp?: boolean;
}) {
  return (
    <span
      className="book-cover"
      style={{ "--notebook-accent": subjectColor } as CSSProperties}
      aria-hidden="true"
    >
      <span className="book-cover__pages" />
      <span className="book-cover__face">
        <img
          className="book-cover__concept"
          src="/notebook-covers/helena-estrelas.webp"
          alt=""
          loading="lazy"
        />
        <span className="book-cover__corner is-top" />
        <span className="book-cover__corner is-bottom" />
        <span className="book-cover__label">
          <span className="book-cover__title">{title}</span>
        </span>
      </span>
      {clasp && (
        <span className="book-cover__clasp">
          <i />
        </span>
      )}
      <span className="book-cover__spine">
        <i />
        <i />
        <i />
      </span>
      {tabs.map((tab) => (
        <span
          key={tab.id}
          className={`book-cover__mark is-${tab.kind}`}
          style={{ "--tab-color": tab.color, "--tab-position": tab.position } as CSSProperties}
        >
          {tab.kind === "bookmark" && <PaperMoonMark motif={tab.motif} />}
        </span>
      ))}
    </span>
  );
}
