import { useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import type { WorkspaceState } from "../domain/workspace";

export function WorkspaceSearch({ workspace }: { workspace: WorkspaceState }) {
  useLanguage();
  const [query, setQuery] = useState("");
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const term = normalize(query.trim());
  const results = !term
    ? []
    : [
        ...workspace.materials
          .filter(
            (item) =>
              !item.archived &&
              normalize(
                `${item.title} ${item.kind === "text" ? item.content : ""} ${item.tags?.join(" ") ?? ""}`,
              ).includes(term),
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
            href: `/biblioteca?material=${encodeURIComponent(item.id)}`,
            kind: uiText("Biblioteca"),
          })),
        ...workspace.notes
          .filter((item) => normalize(`${item.title} ${item.content}`).includes(term))
          .flatMap((item) => {
            const book = workspace.notebooks.find((book) => book.pageIds.includes(item.id));
            return book
              ? [
                  {
                    id: item.id,
                    title: item.title,
                    href: `/cadernos?caderno=${encodeURIComponent(book.id)}&folha=${encodeURIComponent(item.id)}`,
                    kind: uiText("Cadernos"),
                  },
                ]
              : [];
          }),
        ...workspace.tasks
          .filter((item) => normalize(item.title).includes(term))
          .map((item) => ({
            id: item.id,
            title: item.title,
            href: "/planejador",
            kind: uiText("Agenda"),
          })),
        ...workspace.events
          .filter((item) => normalize(item.title).includes(term))
          .map((item) => ({
            id: item.id,
            title: item.title,
            href: "/planejador",
            kind: uiText("Agenda"),
          })),
      ].slice(0, 20);
  return (
    <section className="module-panel workspace-search">
      <label className="field">
        <span>{uiText("Buscar no Espaço")}</span>
        <input
          type="search"
          maxLength={160}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {term && (
        <ul>
          {results.map((item) => (
            <li key={item.kind + item.id}>
              <a href={item.href}>{item.title}</a>
              <small>{item.kind}</small>
            </li>
          ))}
          {!results.length && <li role="status">{uiText("Nenhum resultado encontrado.")}</li>}
        </ul>
      )}
    </section>
  );
}
