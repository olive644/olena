import { useEffect, useId, useRef, useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { MATH_COURSES, type MathCourseId } from "../data/math-courses";
import { MATH_ACHIEVEMENTS, type Achievement } from "../domain/math-achievements";
import type { WorkspaceState } from "../domain/workspace";
import { useMathAchievements } from "../hooks/use-math-achievements";
import { PaperCloseIcon } from "./paper-close-icon";
import { PaperArtInspection } from "./paper-art-inspection";
import "./math-achievements.css";
import { readMathGame } from "../data/math-game-learning";
import { mathAchievements } from "../domain/math-achievements";

const rarityName = (rarity: Achievement["rarity"]) =>
  uiText(rarity === "rare" ? "Rara" : rarity === "uncommon" ? "Incomum" : "Comum");

export function AchievementArt({ item, locked = false }: { item: Achievement; locked?: boolean }) {
  return (
    <span className={`math-achievement-art is-${item.rarity}${locked ? " is-locked" : ""}`}>
      <svg viewBox="0 0 160 180" aria-hidden="true">
        <path fill="#51259B" d="m40 107-9 65 33-17 18 19 8-68zm39 0 8 67 22-19 26 17-18-65z" />
        <path fill="#A779EF" d="m40 107-9 65 16-21 9-45zm39 0 8 67 12-23-6-44z" />
        <path
          fill="var(--achievement-base)"
          d="m80 5 47 16 25 44-7 51-37 35H53l-38-35-7-51 25-44z"
        />
        <path
          fill="var(--achievement-light)"
          d="m80 5 47 16-13 13-34-9-34 9-13-13L8 65l20 4 18-35z"
        />
        <path
          fill="var(--achievement-shade)"
          d="m152 65-7 51-37 35H53l-38-35 21-6 22 22h44l25-22 6-40z"
        />
        <path fill="#FFF9EF" d="m80 32 31 10 16 29-4 34-23 20H60l-23-20-4-34 16-29z" />
        <use
          href={`/navigation-icons/paper/math-achievements.svg#${item.art}`}
          x="38"
          y="38"
          width="84"
          height="84"
        />
        {item.rarity === "rare" && (
          <path
            className="achievement-spark"
            fill="#FFF9EF"
            d="m129 14 4 12 12 4-12 4-4 12-4-12-12-4 12-4zM24 88l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"
          />
        )}
      </svg>
      <b>{item.target}</b>
    </span>
  );
}

export function AchievementCollection({
  ids,
  values,
  compact = false,
  initialId,
  courseId,
}: {
  ids: readonly string[];
  values?: ReturnType<typeof useMathAchievements>;
  compact?: boolean;
  initialId?: string;
  courseId?: MathCourseId;
}) {
  useLanguage();
  const [selected, setSelected] = useState<Achievement | undefined>(() =>
    MATH_ACHIEVEMENTS.find((item) => item.id === initialId),
  );
  const [showAll, setShowAll] = useState(!compact);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const earned = new Set(ids);
  const catalog = MATH_ACHIEVEMENTS.filter((item) => !courseId || item.course === courseId);
  const items = showAll
    ? catalog
    : [
        ...catalog.filter((item) => earned.has(item.id)),
        ...catalog.filter((item) => !earned.has(item.id)),
      ].slice(0, 6);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  function close() {
    dialog.current?.close();
    setSelected(undefined);
  }
  const course = MATH_COURSES.find((item) => item.id === selected?.course);
  const value = values?.find((item) => item.id === selected?.id);
  return (
    <section
      className="math-achievements profile-card profile-card--wide"
      aria-label={uiText("Conquistas de matemática")}
    >
      <header>
        <div>
          <span className="section-label">{uiText("Conquistas")}</span>
          <h2>{uiText("Sua coleção de descobertas")}</h2>
        </div>
        <strong>
          {catalog.filter((item) => earned.has(item.id)).length}/{catalog.length}
        </strong>
      </header>
      {compact && (
        <button type="button" className="secondary-button" onClick={() => setShowAll(!showAll)}>
          {uiText(showAll ? "Mostrar destaques" : "Ver todas as conquistas")}
        </button>
      )}
      {!items.length && <p>{uiText("Cada conta resolvida aproxima uma nova conquista.")}</p>}
      <div className="math-achievement-grid">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="achievement-tile"
            onClick={() => setSelected(item)}
            aria-label={`${uiText(item.name)} ${item.target}. ${uiText(earned.has(item.id) ? "Conquistada" : "Bloqueada")}`}
          >
            <AchievementArt item={item} locked={!earned.has(item.id)} />
            <strong>{uiText(item.name)}</strong>
            {item.course && (
              <small>{MATH_COURSES.find((course) => course.id === item.course)?.title}</small>
            )}
            <small>
              {rarityName(item.rarity)} ·{" "}
              {uiText(earned.has(item.id) ? "Conquistada" : "Bloqueada")}
            </small>
          </button>
        ))}
      </div>
      {selected && (
        <dialog
          ref={dialog}
          className="achievement-inspection profile-editor"
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
        >
          <header>
            <h2 id={titleId}>{uiText(selected.name)}</h2>
            <button
              className="icon-button"
              type="button"
              aria-label={uiText("Fechar conquista")}
              onClick={close}
            >
              <PaperCloseIcon />
            </button>
          </header>
          <PaperArtInspection
            resetLabel={uiText("Centralizar conquista")}
            label={uiText("Girar conquista. Use as setas ou arraste. Home para centralizar.")}
            artwork={<AchievementArt item={selected} locked={!earned.has(selected.id)} />}
            backArtwork={
              <div className="achievement-reverse">
                <strong>{"OlenaStudy"}</strong>
                <span>{uiText("Conquistas de matemática")}</span>
                <AchievementArt item={selected} />
              </div>
            }
          />
          <p>
            {rarityName(selected.rarity)} ·{" "}
            {uiText(earned.has(selected.id) ? "Conquistada" : "Bloqueada")}
          </p>
          {course && <h3>{course.title}</h3>}
          <p>{uiText(selected.description, [selected.target])}</p>
          {value && (
            <>
              <progress
                value={value.value}
                max={value.target}
                aria-label={uiText("Progresso da conquista")}
              />
              <p>
                {value.value}/{value.target}
              </p>
            </>
          )}
        </dialog>
      )}
    </section>
  );
}
export function MathAchievements({ workspace }: { workspace: WorkspaceState }) {
  const values = useMathAchievements(workspace);
  return (
    <AchievementCollection
      ids={values.filter((item) => item.earned).map((item) => item.id)}
      values={values}
      compact
    />
  );
}

export function IslandAchievementBook({ courseId }: { courseId: MathCourseId }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);
  const values = mathAchievements(readMathGame());
  return (
    <>
      <button
        type="button"
        className="secondary-button island-achievement-open"
        onClick={() => {
          setOpened(true);
          dialog.current?.showModal();
        }}
      >
        {uiText("Conquistas da ilha")}
      </button>
      <dialog
        ref={dialog}
        className="achievement-island-book profile-editor"
        aria-label={uiText("Conquistas da ilha")}
        onClose={() => setOpened(false)}
      >
        <button
          className="icon-button"
          type="button"
          aria-label={uiText("Fechar conquistas")}
          onClick={() => dialog.current?.close()}
        >
          <PaperCloseIcon />
        </button>
        {opened && (
          <AchievementCollection
            courseId={courseId}
            ids={values.filter((item) => item.earned).map((item) => item.id)}
            values={values}
          />
        )}
      </dialog>
    </>
  );
}
