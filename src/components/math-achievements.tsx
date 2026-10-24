import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { uiLocale, uiText, useLanguage } from "../i18n/runtime";
import { MATH_COURSES, type MathCourseId } from "../data/math-courses";
import { ALL_ACHIEVEMENTS, type Achievement } from "../domain/math-achievements";
import {
  achievementFamilies,
  achievementFamily,
  ACHIEVEMENT_MATERIALS,
} from "../domain/achievement-presentation";
import type { WorkspaceState } from "../domain/workspace";
import { useMathAchievements, type AchievementProgress } from "../hooks/use-math-achievements";
import { useStoredProfile, readStoredProfile } from "../hooks/use-stored-profile";
import { writeSyncedStorage } from "../data/synced-storage";
import { PaperCloseIcon } from "./paper-close-icon";
import { PaperEditorIcon } from "./paper-editor-icon";
import { PaperArrow } from "./paper-arrow";
import { PaperDigits } from "./paper-digits";
import { PaperCardTitle } from "./paper-card-title";
import { RoomPointsIcon } from "./room-paper-icons";
import { GeneralAchievementScene } from "./general-achievement-art";
import { useAchievementDrag } from "../hooks/use-achievement-drag";
import { isMotionReduced } from "../data/accessibility-preferences";
import "./math-achievements.css";
import "./achievement-motion.css";

const rarityName = (rarity: Achievement["rarity"]) =>
  uiText(rarity === "rare" ? "Rara" : rarity === "uncommon" ? 2791 : 2371);
const materialName = (item: Achievement) =>
  item.category === "general" && item.tier ? uiText(ACHIEVEMENT_MATERIALS[item.tier].label) : "";
const title = (item: Achievement) =>
  uiText(item.name) +
  (item.category === "general"
    ? materialName(item)
      ? " · " + materialName(item)
      : ""
    : " " + item.target);
export function AchievementArt({
  item,
  locked = false,
  thumb = false,
}: {
  item: Achievement;
  locked?: boolean;
  thumb?: boolean;
}) {
  const general = item.category === "general";
  const folder = (general ? "general/" : "math/") + (thumb ? "thumb/" : "");
  return (
    <span
      className={
        "math-achievement-art is-" +
        item.rarity +
        (general ? " is-general" : "") +
        (locked ? " is-locked" : "")
      }
      data-art={item.id}
      data-tier={general ? item.tier : undefined}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" aria-hidden="true">
        {!thumb && (
          <image
            data-achievement-preview=""
            href={
              "/achievement-badges/" +
              (general ? "general" : "math") +
              "/thumb/" +
              item.id +
              ".webp"
            }
            width="160"
            height="160"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {general ? (
          <GeneralAchievementScene item={item} thumb={thumb} />
        ) : (
          <image
            href={"/achievement-badges/" + folder + item.id + ".webp"}
            width="160"
            height="160"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        <g
          className="achievement-paper-number"
          style={
            {
              "--digit-face": "#292432",
              "--digit-depth": "#17131D",
              "--digit-fold": "#51465D",
              "--digit-edge": "#211B29",
            } as CSSProperties
          }
        >
          {[...String(item.target)].map((digit, i, all) => (
            <use
              key={i}
              href={"/paper-digits.svg#digit-" + digit}
              x={general ? 80 - all.length * 6 + i * 12 : 80 - all.length * 7 + i * 14}
              y={general ? "109" : "115"}
              width={general ? "12" : "14"}
              height={general ? "18" : "21"}
            />
          ))}
        </g>
      </svg>
      {(item.rarity === "rare" || (general && item.tier)) && !locked && (
        <span
          className="achievement-foil"
          style={{ maskImage: "url(/achievement-badges/" + folder + item.id + ".webp)" }}
          aria-hidden="true"
        />
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
  favorites,
  onFavoritesChange,
  onInspectionClose,
}: {
  ids: readonly string[];
  values?: readonly AchievementProgress[] | undefined;
  compact?: boolean;
  initialId?: string;
  courseId?: MathCourseId;
  dates?: Readonly<Record<string, string>> | undefined;
  ownerName?: string;
  favorites?: readonly string[] | undefined;
  onFavoritesChange?: ((ids: string[]) => void) | undefined;
  onInspectionClose?: (() => void) | undefined;
}) {
  useLanguage();
  const [selected, setSelected] = useState(() =>
    ALL_ACHIEVEMENTS.find((item) => item.id === initialId),
  );
  // Sentido da troca de etapa: a arte nova entra pelo lado de onde a etapa vem.
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [gallery, setGallery] = useState(!compact);
  const [category, setCategory] = useState<"mathematics" | "general">(
    initialId?.startsWith("general-") ? "general" : "mathematics",
  );
  const [sharing, setSharing] = useState(false),
    [preview, setPreview] = useState(""),
    [file, setFile] = useState<File>(),
    [error, setError] = useState("");
  const inspection = useRef<HTMLDialogElement>(null),
    book = useRef<HTMLDialogElement>(null),
    art = useRef<HTMLDivElement>(null),
    generation = useRef(0);
  const earned = new Set(ids);
  const catalog = ALL_ACHIEVEMENTS.filter((item) => !courseId || item.course === courseId);
  const groups = achievementFamilies(catalog, earned);
  const featured = (
    favorites ??
    groups
      .filter((item) => earned.has(item.id))
      .map((item) => item.id)
      .slice(0, 3)
  )
    .filter((id) => earned.has(id))
    .slice(0, 3);
  const featuredItems = featured.flatMap(
    (id) => ALL_ACHIEVEMENTS.find((item) => item.id === id) ?? [],
  );
  const visible = groups.filter((item) => (item.category ?? "mathematics") === category);
  const drag = useAchievementDrag(featured, earned, onFavoritesChange, () =>
    setError(uiText(2860)),
  );
  const value = values?.find((item) => item.id === selected?.id);
  const earnedAt = value?.earnedAt ?? (selected ? dates[selected.id] : undefined);
  useEffect(() => {
    if (selected) inspection.current?.showModal();
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    for (const item of catalog.filter(
      (item) => achievementFamily(item) === achievementFamily(selected),
    )) {
      for (const size of ["thumb/", ""]) {
        const image = new Image();
        image.src = `/achievement-badges/${item.category === "general" ? "general" : "math"}/${size}${item.id}.webp`;
        void image.decode?.().catch(() => {});
      }
    }
    // A família é estável e o browser mantém as respostas no cache da própria origem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);
  useEffect(() => {
    if (gallery) book.current?.showModal();
  }, [gallery]);
  useEffect(() => {
    const root = book.current;
    if (!gallery || !root || typeof IntersectionObserver === "undefined" || isMotionReduced())
      return;
    root.dataset["reveal"] = "true";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset["revealed"] = "true";
            observer.unobserve(entry.target);
          }
      },
      { root, threshold: 0.08 },
    );
    root.querySelectorAll(".achievement-tile").forEach((tile) => observer.observe(tile));
    return () => observer.disconnect();
  }, [gallery, category]);
  // Aquece o cache das miniaturas em ociosidade: a categoria atual antes de abrir a galeria
  // e a outra aba depois, para a troca de abas não esperar rede.
  useEffect(() => {
    const wanted = groups.filter(
      (item) => ((item.category ?? "mathematics") === category) !== gallery,
    );
    const timer = window.setTimeout(() => {
      for (const item of wanted) {
        new Image().src =
          "/achievement-badges/" +
          (item.category === "general" ? "general/" : "math/") +
          "thumb/" +
          item.id +
          ".webp";
      }
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery, category, courseId]);
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
    onInspectionClose?.();
  }
  function changeFavorite(id: string) {
    if (!onFavoritesChange || !earned.has(id)) return;
    const next = featured.includes(id)
      ? featured.filter((value) => value !== id)
      : [...featured, id];
    if (next.length > 3) {
      setError(uiText(2859));
      return;
    }
    try {
      onFavoritesChange(next);
      setError("");
    } catch {
      setError(uiText(2860));
    }
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
      if (token === generation.current) setError(uiText(2838));
    } finally {
      if (token === generation.current) setSharing(false);
    }
  }
  async function share() {
    if (!file) return;
    setError("");
    if (!navigator.canShare?.({ files: [file] }) || !navigator.share) {
      setError(uiText(2839));
      return;
    }
    try {
      await navigator.share({ files: [file], title: uiText(2788) });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(uiText(2840));
    }
  }
  function tiles(items: readonly Achievement[], summary = false) {
    return (
      <div className={"math-achievement-grid" + (summary ? " is-preview" : "")}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="achievement-tile"
            data-draggable={!summary && !!onFavoritesChange && earned.has(item.id)}
            {...(!summary ? drag.events(item) : {})}
            onClick={() => {
              if (drag.suppressClick()) return;
              setError("");
              setSelected(item);
            }}
            aria-label={title(item) + ". " + uiText(earned.has(item.id) ? 2792 : 2793)}
          >
            <AchievementArt item={item} locked={!earned.has(item.id)} thumb />
            <strong>{uiText(item.name)}</strong>
            {!summary && (
              <span className={"achievement-rarity is-" + item.rarity}>
                {materialName(item) || rarityName(item.rarity)}
              </span>
            )}
            {!summary && item.course && (
              <small>
                {uiText(MATH_COURSES.find((course) => course.id === item.course)!.title)}
              </small>
            )}
            {!summary && (
              <small className="achievement-counter">
                <PaperDigits
                  value={String(
                    values?.find((entry) => entry.id === item.id)?.value ??
                      (earned.has(item.id) ? item.target : 0),
                  )}
                />
                <span aria-hidden="true">/</span>
                <PaperDigits value={String(item.target)} />
              </small>
            )}
          </button>
        ))}
        {summary &&
          onFavoritesChange &&
          Array.from({ length: Math.max(0, 3 - items.length) }, (_, i) => (
            <button
              key={"empty-" + i}
              type="button"
              className="achievement-empty"
              aria-label={uiText(2858)}
              onClick={() => setGallery(true)}
            >
              <PaperEditorIcon name="add" />
            </button>
          ))}
      </div>
    );
  }
  const mount = document.querySelector(".app-shell") ?? document.body;
  return (
    <section className="math-achievements profile-card--wide" aria-label={uiText(2788)}>
      <header>
        <h2>{uiText(2788)}</h2>
        <button
          type="button"
          className="achievement-gallery-open"
          onClick={() => setGallery(true)}
          aria-label={uiText(2795)}
        >
          <span className="achievement-counter">
            <PaperDigits value={String(catalog.filter((item) => earned.has(item.id)).length)} />
            <span aria-hidden="true">/</span>
            <PaperDigits value={String(catalog.length)} />
          </span>
          <PaperArrow />
        </button>
      </header>
      {compact && tiles(featuredItems, true)}
      {gallery &&
        createPortal(
          <dialog
            ref={book}
            className="achievement-gallery"
            aria-label={uiText(2841)}
            onCancel={(event) => {
              event.preventDefault();
              book.current?.close();
              setGallery(false);
            }}
          >
            <header>
              <h2>
                <PaperCardTitle value={uiText(2788)} />
              </h2>
              <button
                type="button"
                className="icon-button"
                aria-label={uiText(2801)}
                onClick={() => {
                  book.current?.close();
                  setGallery(false);
                }}
              >
                <PaperCloseIcon />
              </button>
            </header>
            {onFavoritesChange && (
              <section className="achievement-feature-picker" aria-label={uiText(2854)}>
                <h3>{uiText(2854)}</h3>
                <div>
                  {[0, 1, 2].map((index) => {
                    const item = featuredItems[index];
                    return (
                      <button
                        type="button"
                        key={index}
                        className={"achievement-feature-slot" + (item ? " is-filled" : "")}
                        data-achievement-slot={index}
                        data-drop-target={drag.target === index}
                        data-landed={drag.landed?.slot === index}
                        data-draggable={!!item}
                        {...(item ? drag.events(item) : {})}
                        aria-label={item ? uiText(2856, [title(item)]) : uiText(2857, [index + 1])}
                        onClick={() => {
                          if (drag.suppressClick()) return;
                          if (item) changeFavorite(item.id);
                          else
                            book.current
                              ?.querySelector<HTMLButtonElement>(
                                '.achievement-tile[data-draggable="true"]',
                              )
                              ?.focus();
                        }}
                      >
                        {item ? (
                          <>
                            <AchievementArt item={item} />
                            <span>{uiText(item.name)}</span>
                            <span className="achievement-feature-remove" aria-hidden="true">
                              <PaperCloseIcon />
                            </span>
                          </>
                        ) : (
                          <PaperEditorIcon name="add" />
                        )}
                        {drag.landed?.slot === index && (
                          <span
                            key={drag.landed.tick}
                            className="achievement-drop-burst"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            <div role="tablist" aria-label={uiText(2853)} className="achievement-tabs">
              {(["mathematics", "general"] as const)
                .filter((tab) => !courseId || tab === "mathematics")
                .map((tab) => (
                  <button
                    type="button"
                    role="tab"
                    aria-label={uiText(tab === "general" ? 2851 : 1406)}
                    title={uiText(tab === "general" ? 2851 : 1406)}
                    key={tab}
                    aria-selected={category === tab}
                    className={category === tab ? "is-selected" : ""}
                    onClick={() => setCategory(tab)}
                    onKeyDown={(event) => {
                      if (
                        !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key) ||
                        courseId
                      )
                        return;
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? "mathematics"
                          : event.key === "End"
                            ? "general"
                            : tab === "mathematics"
                              ? "general"
                              : "mathematics";
                      setCategory(next);
                      event.currentTarget.parentElement
                        ?.querySelectorAll<HTMLButtonElement>("button")
                        [next === "general" ? 1 : 0]?.focus();
                    }}
                  >
                    <img
                      src={`/navigation-icons/paper/achievement-${tab}.svg`}
                      width="48"
                      height="48"
                      alt=""
                    />
                  </button>
                ))}
            </div>
            <div role="tabpanel" aria-label={uiText(category === "general" ? 2852 : 2789)}>
              {tiles(visible)}
            </div>
            {error && <p role="alert">{error}</p>}
            {drag.ghost && (
              <div
                className="achievement-drag-ghost"
                style={{ left: drag.ghost.x, top: drag.ghost.y }}
                aria-hidden="true"
              >
                <AchievementArt item={drag.ghost.item} thumb />
              </div>
            )}
          </dialog>,
          mount,
        )}
      {selected &&
        createPortal(
          <dialog
            ref={inspection}
            className="achievement-inspection"
            aria-label={title(selected)}
            data-rarity={selected.rarity}
            onCancel={(event) => {
              event.preventDefault();
              closeInspection();
            }}
          >
            <header>
              <button
                className="achievement-bare-action"
                type="button"
                aria-label={uiText(2797)}
                title={uiText(2797)}
                onClick={closeInspection}
              >
                <PaperCloseIcon />
              </button>
              <div>
                {preview && (
                  <button
                    className="achievement-bare-action"
                    type="button"
                    aria-label={uiText(2845)}
                    title={uiText(2845)}
                    onClick={() => {
                      setPreview("");
                      setFile(undefined);
                    }}
                  >
                    <PaperArrow back />
                  </button>
                )}
                {onFavoritesChange && !preview && (
                  <button
                    className="achievement-bare-action achievement-favorite"
                    type="button"
                    aria-label={uiText(featured.includes(selected.id) ? 2861 : 2862)}
                    title={uiText(featured.includes(selected.id) ? 2861 : 2862)}
                    aria-pressed={featured.includes(selected.id)}
                    disabled={!earned.has(selected.id)}
                    onClick={() => changeFavorite(selected.id)}
                  >
                    <RoomPointsIcon />
                  </button>
                )}
                {earned.has(selected.id) && !preview && (
                  <button
                    className="achievement-bare-action"
                    type="button"
                    aria-label={uiText(2843)}
                    title={uiText(2843)}
                    onClick={() => void prepareShare()}
                    disabled={sharing}
                  >
                    <PaperEditorIcon name="share" />
                  </button>
                )}
              </div>
            </header>
            {preview ? (
              <div className="achievement-share-preview">
                <img src={preview} alt={uiText(2844)} />
                <div>
                  <button
                    className="achievement-bare-action"
                    type="button"
                    aria-label={uiText(677)}
                    title={uiText(677)}
                    onClick={() => void share()}
                  >
                    <PaperEditorIcon name="share" />
                  </button>
                  <a
                    className="achievement-bare-action achievement-save"
                    aria-label={uiText(2909)}
                    title={uiText(2909)}
                    href={preview}
                    download={file?.name}
                  >
                    <PaperEditorIcon name="download" />
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div ref={art} className="achievement-static-art" data-direction={direction}>
                  <AchievementArt
                    key={selected.id}
                    item={selected}
                    locked={!earned.has(selected.id)}
                  />
                </div>
                <p key={selected.id} className="achievement-status">
                  <span className={"achievement-rarity is-" + selected.rarity}>
                    {rarityName(selected.rarity)}
                  </span>
                  <span aria-hidden="true"> · </span>
                  {uiText(earned.has(selected.id) ? 2792 : 2793)}
                </p>
                {earned.has(selected.id) && (
                  <p className="achievement-earned-date">
                    {earnedAt ? (
                      <time
                        dateTime={earnedAt}
                        aria-label={new Date(earnedAt).toLocaleDateString(uiLocale())}
                      >
                        <span aria-hidden="true">
                          {new Date(earnedAt)
                            .toLocaleDateString(uiLocale(), {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                            .split(/(\D+)/)
                            .map((part, i) =>
                              /\d/.test(part) ? (
                                <PaperDigits key={i} value={part} />
                              ) : (
                                <span key={i}>{part}</span>
                              ),
                            )}
                        </span>
                      </time>
                    ) : (
                      uiText(2846)
                    )}
                  </p>
                )}
                <h2>{title(selected)}</h2>
                {selected.course && (
                  <p>{uiText(MATH_COURSES.find((item) => item.id === selected.course)!.title)}</p>
                )}
                <p>{uiText(earned.has(selected.id) ? 2847 : 2848)}</p>
                <p>
                  <strong>{uiText(selected.description, [selected.target])}</strong>
                </p>
                {value && !value.earned && (
                  <>
                    <progress value={value.value} max={value.target} aria-label={uiText(2799)} />
                    <p>
                      {value.value}/{value.target}
                    </p>
                  </>
                )}
                <div className="achievement-tier-steps" aria-label={uiText(2863)}>
                  {catalog
                    .filter((item) => achievementFamily(item) === achievementFamily(selected))
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          (item.id === selected.id ? "is-selected " : "") +
                          (earned.has(item.id) ? "is-earned" : "")
                        }
                        aria-pressed={item.id === selected.id}
                        aria-label={uiText(2864, [materialName(item) || item.target])}
                        onClick={() => {
                          setDirection(item.target < selected.target ? "down" : "up");
                          setSelected(item);
                          setError("");
                        }}
                      >
                        {materialName(item) || <PaperDigits value={String(item.target)} />}
                      </button>
                    ))}
                </div>
              </>
            )}
            {sharing && <p role="status">{uiText(2849)}</p>}
            {error && <p role="alert">{error}</p>}
          </dialog>,
          mount,
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
      favorites={profile.achievementFavorites}
      onFavoritesChange={(ids) =>
        writeSyncedStorage(
          "helena.profile.v1",
          JSON.stringify({ ...readStoredProfile(), achievementFavorites: ids }),
        )
      }
      compact
    />
  );
}
