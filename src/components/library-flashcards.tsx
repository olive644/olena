import { useState, type Dispatch } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { flashcardsTsv, parseFlashcardsTsv } from "../domain/flashcard-study";
import type { Flashcard, WorkspaceAction, WorkspaceState } from "../domain/workspace";
import { toDateKey } from "../domain/workspace";
import { LibraryDialog } from "./library-dialog";
import { PaperChoice } from "./agenda-paper-fields";
import { PaperEditorIcon } from "./paper-editor-icon";

export default function LibraryFlashcards({
  workspace,
  dispatch,
  query,
  subject,
  deck,
  onDeck,
  onEdit,
  onSource,
}: {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
  query: string;
  subject: string;
  deck: string;
  onDeck: (value: string) => void;
  onEdit: (card: Flashcard) => void;
  onSource: (card: Flashcard) => void;
}) {
  useLanguage();
  const [removing, setRemoving] = useState<Flashcard>();
  const [importing, setImporting] = useState(false),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  const [draftSubject, setDraftSubject] = useState(subject || workspace.subjects[0]?.id || "");
  const [rows, setRows] = useState<ReturnType<typeof parseFlashcardsTsv>>();
  const [notice, setNotice] = useState("");
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const cards = workspace.flashcards.filter(
    (card) =>
      (!subject || card.subjectId === subject) &&
      (!deck || card.deck === deck) &&
      normalize(`${card.front} ${card.back} ${card.deck ?? ""}`).includes(normalize(query)),
  );
  const total = cards.reduce((sum, card) => sum + (card.reviews ?? 0), 0);
  const correct = cards.reduce((sum, card) => sum + (card.correct ?? 0), 0);
  function previewImport() {
    try {
      const result = parseFlashcardsTsv(text);
      if (!result.length) throw new Error();
      setRows(result);
      setError("");
    } catch {
      setRows(undefined);
      setError(uiText("Use TSV com frente, verso e baralho opcional, até 500 cartões e 1 MB."));
    }
  }
  return (
    <section className="library-flashcards">
      <header className="library-tools">
        <h2>{uiText("Flashcards")}</h2>
        <button
          className="secondary-button"
          onClick={() => {
            setImporting(true);
            setRows(undefined);
            setError("");
          }}
        >
          {uiText("Importar TSV")}
        </button>
        <button
          className="secondary-button"
          disabled={!cards.length}
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([flashcardsTsv(cards)], { type: "text/tab-separated-values;charset=utf-8" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "olena-flashcards.tsv";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 0);
          }}
        >
          {uiText("Exportar TSV")}
        </button>
      </header>
      <div className="library-filters">
        <PaperChoice
          label={uiText("Baralho")}
          value={deck}
          onChange={onDeck}
          options={[
            { value: "", label: uiText("Todos os baralhos") },
            ...[
              ...new Set(
                workspace.flashcards
                  .map((card) => card.deck)
                  .filter((value): value is string => !!value),
              ),
            ]
              .sort()
              .map((value) => ({ value, label: value })),
          ]}
        />
        <label className="field">
          <span>{uiText("Cartões novos por dia")}</span>
          <input
            type="number"
            min={0}
            max={100}
            value={workspace.studyPreferences.flashcardNewLimit ?? 20}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isSafeInteger(value) && value >= 0 && value <= 100)
                dispatch({
                  type: "study/preferences-updated",
                  preferences: { ...workspace.studyPreferences, flashcardNewLimit: value },
                });
            }}
          />
        </label>
        <p>
          {uiText("Revisões")}: {total} · {uiText("Acertos")}:{" "}
          {total ? Math.round((correct * 100) / total) + "%" : uiText("Sem revisões")}
        </p>
      </div>
      {notice && <p role="status">{notice}</p>}
      <ul>
        {cards.map((card) => (
          <li key={card.id}>
            <strong>{card.front}</strong>
            <small>
              {workspace.subjects.find((item) => item.id === card.subjectId)?.name} ·{" "}
              {card.deck || uiText("Sem baralho")} · {uiText("Próxima revisão")}: {card.nextReview}
            </small>
            <div className="library-tools">
              <button
                className="library-icon"
                aria-label={uiText("Editar flashcard")}
                onClick={() => onEdit(card)}
              >
                <PaperEditorIcon name="pen" />
              </button>
              <button
                className="library-icon"
                aria-label={uiText("Excluir flashcard")}
                onClick={() => setRemoving(card)}
              >
                <PaperEditorIcon name="trash" />
              </button>
              {(card.materialId || card.noteId) && (
                <button className="text-button" onClick={() => onSource(card)}>
                  {uiText("Ver fonte")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {removing && (
        <LibraryDialog title={uiText("Excluir flashcard")} onClose={() => setRemoving(undefined)}>
          <p>{removing.front}</p>
          <div className="library-tools">
            <button className="secondary-button" onClick={() => setRemoving(undefined)}>
              {uiText("Cancelar")}
            </button>
            <button
              className="primary-button"
              onClick={() => {
                dispatch({ type: "flashcard/removed", id: removing.id });
                setRemoving(undefined);
              }}
            >
              {uiText("Excluir")}
            </button>
          </div>
        </LibraryDialog>
      )}
      {importing && (
        <LibraryDialog title={uiText("Importar TSV")} onClose={() => setImporting(false)}>
          <PaperChoice
            label={uiText("Matéria")}
            value={draftSubject}
            onChange={setDraftSubject}
            options={workspace.subjects.map((item) => ({ value: item.id, label: item.name }))}
          />
          <label className="field">
            <span>{uiText("Arquivo TSV")}</span>
            <input
              type="file"
              accept=".tsv,.txt,text/tab-separated-values,text/plain"
              onChange={async (event) => {
                setRows(undefined);
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 1_000_000) {
                  setError(
                    uiText("Use TSV com frente, verso e baralho opcional, até 500 cartões e 1 MB."),
                  );
                  return;
                }
                try {
                  setText(await file.text());
                  setRows(undefined);
                  setError("");
                } catch {
                  setError(uiText("Não foi possível ler o arquivo."));
                }
              }}
            />
          </label>
          <label className="field">
            <span>{uiText("Conteúdo TSV")}</span>
            <textarea
              rows={7}
              maxLength={1_000_000}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setRows(undefined);
              }}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="secondary-button" onClick={previewImport}>
            {uiText("Prévia da importação")}
          </button>
          {rows && (
            <>
              <p role="status">
                {rows.length} {uiText("cartões para importar")}
              </p>
              <ul>
                {rows.slice(0, 5).map((row, i) => (
                  <li key={i}>
                    {row.front} · {row.back} · {row.deck}
                  </li>
                ))}
              </ul>
              <button
                className="primary-button"
                disabled={!draftSubject}
                onClick={() => {
                  dispatch({
                    type: "flashcards/imported",
                    cards: rows,
                    subjectId: draftSubject,
                    createdOn: toDateKey(new Date()),
                  });
                  setImporting(false);
                  setNotice(uiText("Importação concluída. Cartões duplicados foram ignorados."));
                }}
              >
                {uiText("Confirmar importação")}
              </button>
            </>
          )}
        </LibraryDialog>
      )}
    </section>
  );
}
