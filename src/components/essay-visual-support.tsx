import { useEffect, useState, type CSSProperties } from "react";
import { uiText } from "../i18n/runtime";
import { ESSAY_VISUALS } from "../data/essay-visuals";
import { LibraryDialog } from "./library-dialog";
import { PaperEditorIcon } from "./paper-editor-icon";
export function EssayVisualSupport({ proposalId }: { proposalId: keyof typeof ESSAY_VISUALS }) {
  const visual = ESSAY_VISUALS[proposalId];
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setExpandedSource(null), 180);
    return () => window.clearTimeout(timer);
  }, [closing]);
  return (
    <section
      className="essay-visual-support"
      style={{ "--essay-image-ratio": visual.width / visual.height } as CSSProperties}
    >
      <figure>
        {failedSource === visual.src ? (
          <p role="status">{uiText("Imagem indisponível. Consulte a fonte original abaixo.")}</p>
        ) : (
          <div className="essay-visual-support__preview">
            <img
              className="essay-visual-support__thumbnail"
              src={visual.src}
              width={visual.width}
              height={visual.height}
              loading="lazy"
              decoding="async"
              data-kind={visual.kind}
              alt={uiText(visual.alt)}
              onError={() => setFailedSource(visual.src)}
            />
            <button
              type="button"
              className="essay-visual-support__expand"
              aria-label={uiText("Ver imagem em tela cheia")}
              onClick={() => {
                setClosing(false);
                setExpandedSource(visual.src);
              }}
            >
              <PaperEditorIcon name="expand" />
            </button>
          </div>
        )}
        <figcaption>
          <p>{uiText(visual.caption)}</p>
          <small>
            {uiText("Fonte:")}{" "}
            <a href={visual.sourceUrl} target="_blank" rel="noopener noreferrer">
              {uiText(visual.sourceLabel)}
            </a>
            {". "}
            {uiText("Elaboração editorial Olena a partir da referência indicada.")}
          </small>
        </figcaption>
      </figure>
      <p>{uiText(visual.question)}</p>
      {expandedSource === visual.src && (
        <LibraryDialog
          title={uiText(visual.title)}
          onClose={() => setClosing(true)}
          className={`essay-visual-modal${closing ? " essay-visual-modal--closing" : ""}`}
        >
          <div
            className="essay-visual-modal__content"
            onAnimationEnd={() => {
              if (closing) setExpandedSource(null);
            }}
          >
            <img
              className="essay-visual-modal__image"
              src={visual.src}
              width={visual.width}
              height={visual.height}
              alt={uiText(visual.alt)}
            />
          </div>
        </LibraryDialog>
      )}
    </section>
  );
}
