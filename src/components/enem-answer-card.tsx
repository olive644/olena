import { answerRows } from "../data/enem-answer-rows";
import type { EnemSection } from "../data/enem-sections";
import type { EnemLanguage } from "../data/enem-tri";
import { uiText } from "../i18n/runtime";
import { PaperDigits } from "./paper-digits";
import { PaperEditorIcon } from "./paper-editor-icon";

export function EnemAnswerCard({
  section,
  language = "english",
  answers,
  onAnswer,
  onClose,
}: {
  section: EnemSection;
  language?: EnemLanguage;
  answers: Record<string, string>;
  onAnswer(key: string, answer: string): void;
  onClose(): void;
}) {
  const rows = answerRows(section, language);
  return (
    <aside className="enem-answer-card" aria-label={uiText("Cartão de respostas")}>
      <header>
        <button type="button" aria-label={uiText("Recolher cartão de respostas")} onClick={onClose}>
          <PaperEditorIcon name="writingWindow" />
        </button>
        <strong>{uiText("Cartão de respostas")}</strong>
      </header>
      <div className="enem-answer-rows">
        <h3>{uiText(section.label)}</h3>
        {rows.map((row, index) => (
          <div key={row.key}>
            {(index === 0 || rows[index - 1]?.group !== row.group) && <h4>{uiText(row.group)}</h4>}
            <div
              className="enem-answer-row"
              role="group"
              aria-label={`${uiText(row.group)}, ${uiText("Questão")} ${row.number}`}
            >
              <PaperDigits value={String(row.number)} />
              {["A", "B", "C", "D", "E"].map((letter) => (
                <button
                  type="button"
                  key={letter}
                  aria-label={`${uiText(row.group)}, ${uiText("Questão")} ${row.number}, ${letter}`}
                  aria-pressed={answers[`${section.id}:${row.key}`] === letter}
                  onClick={() =>
                    onAnswer(
                      `${section.id}:${row.key}`,
                      answers[`${section.id}:${row.key}`] === letter ? "" : letter,
                    )
                  }
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
