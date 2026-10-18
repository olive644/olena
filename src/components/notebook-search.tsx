import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { useDeferredValue, useId, useMemo, useState } from "react";
import {
  MIN_QUERY_LENGTH,
  searchNotebooks,
  type SearchHit,
  type SearchSource,
} from "../domain/notebook-search";
import type { WorkspaceState } from "../domain/workspace";

const SOURCE_LABEL: Record<SearchSource, string> = localizeLabels(() => ({
  caderno: uiText(100),
  folha: uiText(698),
  texto: uiText(361),
  "post-it": "Post-it",
  lista: uiText(1840),
  anexo: uiText(1841),
}));

type NotebookSearchProps = {
  workspace: Pick<WorkspaceState, "notebooks" | "notes">;
  onOpen: (hit: SearchHit) => void;
};

export function NotebookSearch({ workspace, onOpen }: NotebookSearchProps) {
  const currentUiLanguage = useLanguage();

  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const hits = useMemo(
    () => searchNotebooks(workspace, deferred),
    [workspace, deferred, currentUiLanguage],
  );
  const resultsId = useId();
  const searching = Array.from(query.trim()).length >= MIN_QUERY_LENGTH;

  return (
    <section className="notebook-search" aria-label={uiText(720)}>
      <input
        type="search"
        value={query}
        placeholder={uiText(720)}
        aria-label={uiText(720)}
        aria-controls={resultsId}
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setQuery("");
        }}
      />
      <div id={resultsId} role="region" aria-live="polite">
        {searching && hits.length === 0 && <p className="notebook-search__empty">{uiText(721)}</p>}
        {hits.length > 0 && (
          <>
            <p className="notebook-search__count">
              {hits.length} {uiText(hits.length === 1 ? "resultado" : "resultados")}
            </p>
            <ul>
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button type="button" onClick={() => onOpen(hit)}>
                    <span className="notebook-search__where">
                      <strong>{hit.notebookTitle}</strong>
                      {hit.pageTitle && <span> › {hit.pageTitle}</span>}
                      <em>{SOURCE_LABEL[hit.source]}</em>
                    </span>
                    {hit.source !== "caderno" && hit.source !== "folha" && (
                      <span className="notebook-search__snippet">
                        {hit.before}
                        <mark>{hit.match}</mark>
                        {hit.after}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
