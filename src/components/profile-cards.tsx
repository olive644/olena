import { useEffect, useRef, useState } from "react";
import { uiLocale, uiText, useLanguage } from "../i18n/runtime";
import { oliverCardDates, oliverCollection } from "../data/math-place-rewards";
import { useArcanaCatalog, type ArcanaId, activeArcanaId } from "../data/arcana-catalog";
import { readStoredProfile, useStoredProfile } from "../hooks/use-stored-profile";
import {
  SYNCED_STORAGE_APPLIED_EVENT,
  SYNCED_STORAGE_EVENT,
  writeSyncedStorage,
} from "../data/synced-storage";
import { createMathSound } from "../data/math-sound";
import { effectiveCardFavorites } from "../domain/arcana-profile";
import { ARCANA_IDS } from "../data/arcana-ids";
import { useCardHighlightDrag } from "../hooks/use-card-highlight-drag";
import { OliverCard, ArcanaRarity } from "./oliver-card";
import { OliverCardInspection } from "./oliver-card-inspection";
import { LibraryDialog } from "./library-dialog";
import { PaperDigits } from "./paper-digits";
import { PaperArrow } from "./paper-arrow";
import { PaperCloseIcon } from "./paper-close-icon";
import { RoomPointsIcon } from "./room-paper-icons";
import { HelenaLoading } from "./helena-loading";
import { ArcanaIcon } from "./arcana-icon";
import { ArcanaShare } from "./arcana-share";
import "./oliver-card.css";
import "./profile-cards.css";
const groups = [
  ["all", "Todos"],
  ["major", "Arcano maior"],
  ["minor", "Arcano menor"],
  ["wands", "Paus · Fogo"],
  ["cups", "Copas · Água"],
  ["swords", "Espadas · Ar"],
  ["pentacles", "Ouros · Terra"],
] as const;
export function ProfileCards({
  initialOpen = false,
  onClose,
}: {
  initialOpen?: boolean;
  onClose?: () => void;
}) {
  useLanguage();
  const { cards: catalog, error: catalogError, retry } = useArcanaCatalog();
  const [profile] = useStoredProfile();
  const [, refresh] = useState(0);
  const [open, setOpen] = useState(initialOpen);
  const [selected, setSelected] = useState<ArcanaId>();
  const [group, setGroup] = useState("all");
  const [error, setError] = useState("");
  const sound = useRef<ReturnType<typeof createMathSound> | null>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => refresh((n) => n + 1);
    window.addEventListener(SYNCED_STORAGE_EVENT, update);
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, update);
    return () => {
      window.removeEventListener(SYNCED_STORAGE_EVENT, update);
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, update);
      sound.current?.dispose();
      sound.current = null;
    };
  }, []);
  useEffect(() => {
    if (open) {
      const dialog = content.current?.closest("dialog");
      if (dialog) {
        dialog.scrollTop = 0;
        dialog.querySelector<HTMLButtonElement>("header button")?.focus({ preventScroll: true });
      }
    }
  }, [open, selected]);
  const owned = oliverCollection(),
    dates = oliverCardDates(),
    earned = new Set(Object.keys(owned));
  const favorites = effectiveCardFavorites(profile.cardFavorites, earned, ARCANA_IDS)
    .map(activeArcanaId)
    .filter((id): id is ArcanaId => !!id);
  const drag = useCardHighlightDrag(favorites, earned, saveFavorites);
  const current = catalog.find((c) => c.id === selected);
  function cue(place = false) {
    sound.current ??= createMathSound();
    sound.current.unlock();
    sound.current.play(place ? "achievementPlace" : "cardReveal");
  }
  function saveFavorites(next: string[]) {
    try {
      writeSyncedStorage(
        "helena.profile.v1",
        JSON.stringify({ ...readStoredProfile(), cardFavorites: next }),
      );
      setError("");
      cue(true);
    } catch {
      setError(uiText("Não foi possível salvar as cartas favoritas. Tente novamente."));
    }
  }
  function favorite(id: ArcanaId) {
    if (!owned[id]) return;
    const next = favorites.includes(id) ? favorites.filter((v) => v !== id) : [...favorites, id];
    if (next.length > 3) {
      setError(uiText("Escolha no máximo três cartas favoritas."));
      return;
    }
    saveFavorites(next);
  }
  function inspect(id: ArcanaId, button: HTMLButtonElement) {
    origin.current = button;
    setSelected(id);
    setError("");
    setOpen(true);
    cue();
  }
  function miniature(id: ArcanaId) {
    return (
      <div className="profile-cards__miniature">
        <OliverCard id={id} thumbnail />
      </div>
    );
  }
  const highlights = (
    <div className="profile-cards__featured">
      {Array.from({ length: 3 }, (_, index) => {
        const id = favorites[index];
        const card = catalog.find((c) => c.id === id);
        return (
          <div
            key={index}
            className={`arcana-feature-slot${drag.target === index ? " is-target" : ""}`}
            data-arcana-slot={index}
          >
            <button
              className="profile-cards__tile"
              {...(id ? drag.events(id) : {})}
              aria-label={
                card
                  ? uiText("Inspecionar carta {0}", [card.title])
                  : uiText("Escolher carta favorita")
              }
              onClick={(e) => {
                if (drag.suppressClick()) return;
                if (id) inspect(id, e.currentTarget);
                else {
                  setSelected(undefined);
                  setOpen(true);
                }
              }}
            >
              {id ? (
                miniature(id)
              ) : (
                <span className="profile-cards__empty">
                  <span aria-hidden="true">✦</span>
                  <span>+</span>
                </span>
              )}
              <strong>{card?.title ?? uiText("Favorita")}</strong>
            </button>
            {open && id && (
              <button
                className="arcana-feature-remove"
                aria-label={uiText("Remover carta dos destaques")}
                onClick={() => favorite(id)}
              >
                <PaperCloseIcon />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
  const at = selected ? dates[selected] : undefined;
  const date = at === undefined ? "" : new Intl.DateTimeFormat(uiLocale()).format(new Date(at));
  const close = () => {
    setOpen(false);
    setSelected(undefined);
    setError("");
    onClose?.();
    queueMicrotask(() => origin.current?.isConnected && origin.current.focus());
  };
  return (
    <section className="profile-cards" aria-label={uiText("Arcano")}>
      {!initialOpen && (
        <>
          <header>
            <h2>{uiText("Arcano")}</h2>
            <span className="profile-cards__count">
              <PaperDigits value={String(Object.keys(owned).length)} />
              <span>/</span>
              <PaperDigits value="78" />
            </span>
            <button
              className="profile-cards__bare"
              aria-label={uiText("Ver todas as cartas")}
              onClick={() => {
                setSelected(undefined);
                setOpen(true);
                cue();
              }}
            >
              <PaperArrow />
            </button>
          </header>
          {highlights}
        </>
      )}
      {open && (
        <LibraryDialog
          title={current?.title ?? uiText("Arcano")}
          onClose={close}
          className="arcana-collection"
          headerContent={
            !current && (
              <section className="arcana-highlights" aria-label={uiText("Destaques do perfil")}>
                <h3>{uiText("Destaques do perfil")}</h3>
                {highlights}
                {drag.ghost && favorites.includes(drag.ghost.id) && (
                  <div
                    data-arcana-remove
                    className={`arcana-remove-target${drag.target === "remove" ? " is-target" : ""}`}
                  >
                    {uiText("Solte aqui para remover dos destaques")}
                  </div>
                )}
              </section>
            )
          }
        >
          <div className="profile-cards__dialog" ref={content}>
            {current && selected ? (
              <>
                <div className="profile-cards__actions">
                  <button
                    className="profile-cards__bare"
                    aria-label={uiText("Voltar à coleção")}
                    onClick={() => {
                      setSelected(undefined);
                      setError("");
                    }}
                  >
                    <PaperArrow back />
                  </button>
                  <div className="profile-cards__tools">
                    <button
                      className="profile-cards__bare"
                      disabled={!owned[selected]}
                      aria-label={uiText(
                        favorites.includes(selected)
                          ? "Remover carta dos destaques"
                          : "Destacar carta no perfil",
                      )}
                      aria-pressed={favorites.includes(selected)}
                      onClick={() => favorite(selected)}
                    >
                      <RoomPointsIcon />
                    </button>
                    <ArcanaShare
                      key={selected}
                      id={selected}
                      owner={profile.name ?? profile.username ?? ""}
                      earnedAt={at}
                      obtained={!!owned[selected]}
                      source={() =>
                        content.current?.querySelector<HTMLElement>(
                          ".oliver-inspection-front .arcana-paper",
                        ) ?? null
                      }
                    />
                  </div>
                </div>
                <div key={selected} className="profile-cards__inspection">
                  <OliverCardInspection id={selected} />
                </div>
                <div className="profile-cards__date">
                  <span>{uiText(owned[selected] ? "Obtida em" : "Ainda não obtida")}</span>
                  {owned[selected] &&
                    (date ? (
                      <time dateTime={new Date(at!).toISOString()}>
                        {date
                          .split(/(\d+)/)
                          .filter(Boolean)
                          .map((part, i) =>
                            /^\d+$/.test(part) ? (
                              <PaperDigits value={part} key={i} />
                            ) : (
                              <span key={i}>{part}</span>
                            ),
                          )}
                      </time>
                    ) : (
                      <span>{uiText("Data não registrada")}</span>
                    ))}
                </div>
              </>
            ) : (
              <>
                {catalogError && (
                  <p role="alert">
                    {uiText("Não foi possível carregar o baralho.")}
                    <button className="secondary-button" onClick={retry}>
                      {uiText("Tentar novamente")}
                    </button>
                  </p>
                )}
                {!catalogError && catalog.length === 0 && <HelenaLoading compact />}
                <nav className="arcana-category-tabs" aria-label={uiText("Categorias do baralho")}>
                  {groups.map(([id, label]) => (
                    <button
                      className="secondary-button"
                      key={id}
                      aria-label={uiText(label)}
                      title={uiText(label)}
                      aria-pressed={group === id}
                      onClick={() => setGroup(id)}
                    >
                      <ArcanaIcon name={id} />
                    </button>
                  ))}
                </nav>
                <p className="arcana-drag-help">
                  {uiText(
                    "Arraste as cartas para os destaques. No celular, arraste pela estrela e deslize sobre a carta para rolar.",
                  )}
                </p>
                <div className="profile-cards__gallery">
                  {catalog
                    .filter(
                      (c) =>
                        group === "all" ||
                        (group === "minor" && c.group !== "major") ||
                        c.group === group,
                    )
                    .map((card) => (
                      <div
                        key={card.id}
                        className={`profile-cards__gallery-item${owned[card.id] ? " is-owned" : " is-unowned"}${drag.ghost?.id === card.id ? " is-dragging" : ""}`}
                      >
                        <button
                          className="profile-cards__tile"
                          aria-label={uiText("Inspecionar carta {0}", [card.title])}
                          onClick={(e) => {
                            if (!drag.suppressClick()) inspect(card.id, e.currentTarget);
                          }}
                          {...drag.events(card.id)}
                        >
                          {miniature(card.id)}
                          <strong>{card.title}</strong>
                        </button>
                        <ArcanaRarity id={card.id} />
                        {owned[card.id] ? (
                          <button
                            className="profile-cards__bare arcana-favorite-handle"
                            aria-label={uiText(
                              favorites.includes(card.id)
                                ? "Remover carta dos destaques"
                                : "Destacar carta no perfil",
                            )}
                            aria-pressed={favorites.includes(card.id)}
                            onClick={() => {
                              if (!drag.suppressClick()) favorite(card.id);
                            }}
                            {...drag.events(card.id)}
                          >
                            <RoomPointsIcon />
                          </button>
                        ) : (
                          <small>{uiText("Ainda não obtida")}</small>
                        )}
                      </div>
                    ))}
                </div>
              </>
            )}
            {drag.ghost && (
              <div
                className="arcana-drag-ghost"
                aria-hidden="true"
                style={{ left: drag.ghost.x, top: drag.ghost.y }}
              >
                {miniature(drag.ghost.id)}
              </div>
            )}
            {error && <p role="alert">{error}</p>}
          </div>
        </LibraryDialog>
      )}
    </section>
  );
}
