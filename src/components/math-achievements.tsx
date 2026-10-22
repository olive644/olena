import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uiLocale, uiText, useLanguage } from "../i18n/runtime";
import { MATH_COURSES, type MathCourseId } from "../data/math-courses";
import { MATH_ACHIEVEMENTS, type Achievement } from "../domain/math-achievements";
import type { WorkspaceState } from "../domain/workspace";
import { useMathAchievements } from "../hooks/use-math-achievements";
import { useStoredProfile } from "../hooks/use-stored-profile";
import { PaperCloseIcon } from "./paper-close-icon";
import { PaperArtInspection } from "./paper-art-inspection";
import { PaperEditorIcon } from "./paper-editor-icon";
import "./math-achievements.css";

const rarityName = (rarity: Achievement["rarity"]) =>
  uiText(rarity === "rare" ? "Rara" : rarity === "uncommon" ? "Incomum" : "Comum");

export function AchievementArt({ item, locked = false }: { item: Achievement; locked?: boolean }) {
  const index = MATH_ACHIEVEMENTS.findIndex((entry) => entry.id === item.id);
  return (
    <span
      className={`math-achievement-art is-${item.rarity}${locked ? " is-locked" : ""}`}
      data-art={item.id}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180" aria-hidden="true">
        <use href={`/navigation-icons/paper/achievement-objects.svg#a${index}`} />
        {item.rarity === "rare" && (
          <image href="/oliver-math-islands.png" x="28" y="5" width="108" height="137" />
        )}
        <use
          href={`/navigation-icons/paper/achievement-objects.svg#a${(index + 17) % 57}`}
          x="99"
          y="96"
          width="52"
          height="58"
        />
        <text
          x="80"
          y="157"
          textAnchor="middle"
          fill="#FFF9EF"
          stroke="#292432"
          strokeWidth=".8"
          paintOrder="stroke"
          fontFamily="Manrope, sans-serif"
          fontSize="13"
          fontWeight="900"
        >
          {item.target}
        </text>
      </svg>
      {item.rarity === "rare" && !locked && (
        <span className="achievement-foil" aria-hidden="true" />
      )}
    </span>
  );
}

export function AchievementCollection({
  ids,
  values,
  compact = false,
  initialId,
  courseId,
  dates = {},
  ownerName = "",
}: {
  ids: readonly string[];
  values?: ReturnType<typeof useMathAchievements>;
  compact?: boolean;
  initialId?: string;
  courseId?: MathCourseId;
  dates?: Readonly<Record<string, string>> | undefined;
  ownerName?: string;
}) {
  useLanguage();
  const [selected, setSelected] = useState<Achievement | undefined>(() =>
    MATH_ACHIEVEMENTS.find((item) => item.id === initialId),
  );
  const [gallery, setGallery] = useState(!compact);
  const [sharing, setSharing] = useState(false);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File>();
  const [error, setError] = useState("");
  const inspection = useRef<HTMLDialogElement>(null),
    book = useRef<HTMLDialogElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const earned = new Set(ids);
  const catalog = MATH_ACHIEVEMENTS.filter((item) => !courseId || item.course === courseId);
  const sorted = [
    ...catalog.filter((item) => earned.has(item.id)),
    ...catalog.filter((item) => !earned.has(item.id)),
  ];
  const value = values?.find((item) => item.id === selected?.id);
  const earnedAt = value?.earnedAt ?? (selected ? dates[selected.id] : undefined);
  useEffect(() => {
    if (selected) inspection.current?.showModal();
  }, [selected]);
  useEffect(() => {
    if (gallery) book.current?.showModal();
  }, [gallery]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  function closeInspection() {
    generation.current++;
    inspection.current?.close();
    setSelected(undefined);
    setSharing(false);
    setPreview("");
    setFile(undefined);
    setError("");
  }
  async function prepareShare() {
    if (!selected || !art.current || sharing) return;
    const token = ++generation.current;
    setSharing(true);
    setError("");
    try {
      const { achievementPng } = await import("../data/achievement-png");
      const result = await achievementPng(
        art.current.querySelector("svg")!,
        selected,
        ownerName,
        earnedAt,
      );
      if (token !== generation.current) return;
      setFile(result);
      setPreview(URL.createObjectURL(result));
    } catch {
      if (token === generation.current)
        setError(uiText("Não foi possível preparar o card. Tente novamente."));
    } finally {
      if (token === generation.current) setSharing(false);
    }
  }
  async function share() {
    if (!file) return;
    setError("");
    if (!navigator.canShare?.({ files: [file] }) || !navigator.share) {
      setError(uiText("Seu navegador não compartilha arquivos. Salve o card para enviar."));
      return;
    }
    try {
      await navigator.share({ files: [file], title: uiText("Conquistas de matemática") });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setError(uiText("Não foi possível compartilhar. Salve o card para enviar."));
    }
  }
  function tiles(items: readonly Achievement[], summary = false) {
    return (
      <div className={`math-achievement-grid${summary ? " is-preview" : ""}`}>
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
            {!summary && (
              <small>
                {item.course
                  ? MATH_COURSES.find((course) => course.id === item.course)?.title
                  : rarityName(item.rarity)}
              </small>
            )}
            {!summary && (
              <small>
                {values?.find((entry) => entry.id === item.id)?.value ??
                  (earned.has(item.id) ? item.target : 0)}
                /{item.target}
              </small>
            )}
          </button>
        ))}
      </div>
    );
  }
  return (
    <section
      className="math-achievements profile-card--wide"
      aria-label={uiText("Conquistas de matemática")}
    >
      <header>
        <h2>{uiText("Conquistas")}</h2>
        <button
          type="button"
          className="achievement-gallery-open"
          onClick={() => setGallery(true)}
          aria-label={uiText("Ver todas as conquistas")}
        >
          <span>
            {catalog.filter((item) => earned.has(item.id)).length}/{catalog.length}
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </header>
      {compact && tiles(sorted.slice(0, 3), true)}
      {gallery &&
        createPortal(
          <dialog
            ref={book}
            className="achievement-gallery"
            aria-label={uiText("Todas as conquistas")}
            onCancel={(event) => {
              event.preventDefault();
              book.current?.close();
              setGallery(false);
            }}
          >
            <header>
              <div>
                <span className="section-label">{"OlenaStudy"}</span>
                <h2>{uiText("Conquistas de matemática")}</h2>
                <p>{uiText("Cada descoberta tem sua história.")}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={uiText("Fechar conquistas")}
                onClick={() => {
                  book.current?.close();
                  setGallery(false);
                }}
              >
                <PaperCloseIcon />
              </button>
            </header>
            {tiles(sorted)}
          </dialog>,
          document.body,
        )}
      {selected &&
        createPortal(
          <dialog
            ref={inspection}
            className="achievement-inspection"
            aria-label={`${uiText(selected.name)} ${selected.target}`}
            data-rarity={selected.rarity}
            onCancel={(event) => {
              event.preventDefault();
              closeInspection();
            }}
          >
            <header>
              <button
                className="icon-button"
                type="button"
                aria-label={uiText("Fechar conquista")}
                onClick={closeInspection}
              >
                <PaperCloseIcon />
              </button>
              {earned.has(selected.id) && (
                <button
                  className="icon-button"
                  type="button"
                  aria-label={uiText("Compartilhar conquista")}
                  onClick={() => void prepareShare()}
                  disabled={sharing}
                >
                  <PaperEditorIcon name="share" />
                </button>
              )}
            </header>
            {preview ? (
              <div className="achievement-share-preview">
                <img src={preview} alt={uiText("Card da conquista para compartilhar")} />
                <div>
                  <button className="secondary-button" type="button" onClick={() => void share()}>
                    {uiText("Compartilhar")}
                  </button>
                  <a className="secondary-button" href={preview} download={file?.name}>
                    {uiText("Salvar imagem")}
                  </a>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setPreview("");
                      setFile(undefined);
                    }}
                  >
                    {uiText("Voltar à conquista")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div ref={art}>
                  <PaperArtInspection
                    compact
                    resetLabel={uiText("Centralizar conquista")}
                    label={uiText(
                      "Girar conquista. Use as setas ou arraste. Home para centralizar.",
                    )}
                    artwork={<AchievementArt item={selected} locked={!earned.has(selected.id)} />}
                    backArtwork={
                      <div className="achievement-reverse">
                        <strong>{"OlenaStudy"}</strong>
                        <span>{uiText("Conquistas de matemática")}</span>
                        <AchievementArt item={selected} locked={!earned.has(selected.id)} />
                      </div>
                    }
                  />
                </div>
                <p className="achievement-rarity">
                  {rarityName(selected.rarity)} ·{" "}
                  {uiText(earned.has(selected.id) ? "Conquistada" : "Bloqueada")}
                </p>
                {earned.has(selected.id) && (
                  <p className="achievement-earned-date">
                    {earnedAt ? (
                      <time dateTime={earnedAt}>
                        {new Date(earnedAt).toLocaleDateString(uiLocale(), {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </time>
                    ) : (
                      uiText("Data não registrada no histórico")
                    )}
                  </p>
                )}
                <h2>
                  {uiText(selected.name)} {selected.target}
                </h2>
                {selected.course && (
                  <p>{MATH_COURSES.find((item) => item.id === selected.course)?.title}</p>
                )}
                <p>
                  {uiText(
                    earned.has(selected.id) ? "Você conquistou este objetivo:" : "Para conquistar:",
                  )}
                </p>
                <p>
                  <strong>{uiText(selected.description, [selected.target])}</strong>
                </p>
                {value && !value.earned && (
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
              </>
            )}
            {sharing && <p role="status">{uiText("Preparando card…")}</p>}
            {error && <p role="alert">{error}</p>}
          </dialog>,
          document.body,
        )}
    </section>
  );
}
export function MathAchievements({ workspace }: { workspace: WorkspaceState }) {
  const values = useMathAchievements(workspace);
  const [profile] = useStoredProfile();
  return (
    <AchievementCollection
      ids={values.filter((item) => item.earned).map((item) => item.id)}
      values={values}
      ownerName={profile.name ?? profile.username ?? ""}
      compact
    />
  );
}
