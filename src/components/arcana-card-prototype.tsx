import { PaperCardTitle } from "./paper-card-title";
import { PaperDigits } from "./paper-digits";
import { uiText } from "../i18n/runtime";
import { type CSSProperties } from "react";
import "./arcana-card-prototype.css";

/** Approved paper tarot frame shared by the preview and the active collection. */
export function ArcanaCardPrototype({
  back = false,
  title = "O Mago",
  mark = "I",
  art = "/arcana/mago-ink-v1.webp",
  indexColor = "#facc15",
  description = "Olena com varinha e os quatro símbolos do arcano O Mago.",
}: {
  back?: boolean;
  title?: string;
  mark?: string;
  art?: string;
  indexColor?: string;
  description?: string;
}) {
  if (back)
    return (
      <article
        className="arcana-paper arcana-paper--back"
        aria-label={uiText("Verso das cartas de arcano Olena")}
      >
        <svg
          viewBox="0 0 334 584"
          role="img"
          aria-label={uiText("Verso simétrico com luas e estrela de papel")}
        >
          <path fill="#17151c" d="M0 0h334v584H0Z" />
          <path fill="none" stroke="#6d28d9" strokeWidth="2" d="M13 13h308v558H13Z" />
          <path fill="none" stroke="#facc15" strokeWidth="1" d="M23 23h288v538H23Z" />
          <path
            fill="#6d28d9"
            d="M167 91c-60 0-85 76-38 112-27-11-45-37-45-66 0-45 36-81 81-81 45 0 81 36 81 81 0 29-18 55-45 66 47-36 22-112-34-112Z"
          />
          <path
            fill="#6d28d9"
            d="M167 493c-60 0-85-76-38-112-27 11-45 37-45 66 0 45 36 81 81 81 45 0 81-36 81-81 0-29-18-55-45-66 47 36 22 112-34 112Z"
          />
          <path fill="none" stroke="#8b5cf6" strokeWidth="2" d="m167 218 74 74-74 74-74-74Z" />
          <path
            fill="#facc15"
            d="m167 243 10 34 35-20-20 35 34 10-34 10 20 35-35-20-10 34-10-34-35 20 20-35-34-10 34-10-20-35 35 20Z"
          />
          <path fill="#17151c" d="m167 282 10 20-10 20-10-20Z" />
        </svg>
      </article>
    );
  return (
    <article
      className="arcana-paper"
      onDragStart={(event) => event.preventDefault()}
      aria-label={`${mark}, ${title}.`}
      style={{ "--arcana-title-size": `${Math.min(26, 430 / title.length)}px` } as CSSProperties}
    >
      <div className="arcana-paper__scene">
        <img src={art} width="900" height="1350" alt={description} draggable={false} />
        <span
          className="arcana-paper__index"
          style={
            {
              "--digit-face": indexColor,
              "--digit-fold": indexColor,
              "--digit-edge": indexColor,
              "--arcana-index-color": indexColor,
            } as CSSProperties
          }
        >
          {/^[0-9]+$/.test(mark) ? <PaperDigits value={mark} /> : <PaperCardTitle value={mark} />}
        </span>
      </div>
      <h2 className="arcana-paper__title">
        <span aria-hidden="true">✦</span>
        <PaperCardTitle value={title} />
        <span aria-hidden="true">✦</span>
      </h2>
    </article>
  );
}
