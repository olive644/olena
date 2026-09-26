import { useDeferredValue, useId, useMemo, useState } from "react";
import {
  MIN_QUERY_LENGTH,
  searchNotebooks,
  type SearchHit,
  type SearchSource,
} from "../domain/notebook-search";
import type { WorkspaceState } from "../domain/workspace";

const SOURCE_LABEL: Record<SearchSource, string> = {
  caderno: "Caderno",
  folha: "Folha",
  texto: "Texto",
  "post-it": "Post-it",
  lista: "Lista",
  anexo: "Anexo",
};

type NotebookSearchProps = {
  workspace: Pick<WorkspaceState, "notebooks" | "notes">;
  onOpen: (hit: SearchHit) => void;
};

export function NotebookSearch({ workspace, onOpen }: NotebookSearchProps) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const hits = useMemo(() => searchNotebooks(workspace, deferred), [workspace, deferred]);
  const resultsId = useId();
  const searching = Array.from(query.trim()).length >= MIN_QUERY_LENGTH;

  return (
    <section className="notebook-search" aria-label="Buscar nos cadernos">
      <input
        type="search"
        value={query}
        placeholder="Buscar nos cadernos"
        aria-label="Buscar nos cadernos"
        aria-controls={resultsId}
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setQuery("");
        }}
      />
      <div id={resultsId} role="region" aria-live="polite">
        {searching && hits.length === 0 && (
          <p className="notebook-search__empty">
            Nada encontrado. A busca vê títulos, textos digitados, post-its e listas; a escrita à
            mão em si é imagem e não entra.
          </p>
        )}
        {hits.length > 0 && (
          <>
            <p className="notebook-search__count">
              {hits.length} {hits.length === 1 ? "resultado" : "resultados"}
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
