import { useEffect, useRef, useState } from "react";
import { uiLocale, uiText, useLanguage } from "../i18n/runtime";
import { oliverCardDates, oliverCollection } from "../data/math-place-rewards";
import { OLIVER_CARDS } from "../data/oliver-cards";
import { OLIVER_TAROT, type OliverArtworkId } from "../data/oliver-tarot";
import { readStoredProfile, useStoredProfile } from "../hooks/use-stored-profile";
import {
  SYNCED_STORAGE_APPLIED_EVENT,
  SYNCED_STORAGE_EVENT,
  writeSyncedStorage,
} from "../data/synced-storage";
import { createMathSound } from "../data/math-sound";
import { OliverCard } from "./oliver-card";
import { OliverCardInspection } from "./oliver-card-inspection";
import { LibraryDialog } from "./library-dialog";
import { PaperDigits } from "./paper-digits";
import { PaperArrow } from "./paper-arrow";
import { RoomPointsIcon } from "./room-paper-icons";
import "./oliver-card.css";
import "./profile-cards.css";

const catalog = [...OLIVER_CARDS, OLIVER_TAROT];
export function ProfileCards() {
  useLanguage();
  const [profile] = useStoredProfile();
  const [, refresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<OliverArtworkId>();
  const [error, setError] = useState("");
  const sound = useRef<ReturnType<typeof createMathSound> | null>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dialog = content.current?.closest("dialog");
    if (dialog) {
      dialog.scrollTop = 0;
      dialog.querySelector<HTMLButtonElement>("header button")?.focus({ preventScroll: true });
    }
  }, [open, selected]);
  useEffect(() => {
    const update = () => refresh((n) => n + 1);
    window.addEventListener(SYNCED_STORAGE_EVENT, update);
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, update);
    return () => {
      window.removeEventListener(SYNCED_STORAGE_EVENT, update);
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, update);
      sound.current?.dispose();
    };
  }, []);
  const owned = oliverCollection();
  const dates = oliverCardDates();
  const favorites = (
    profile.cardFavorites ??
    catalog
      .filter((card) => owned[card.id])
      .map((card) => card.id)
      .slice(0, 3)
  ).filter((id) => owned[id as OliverArtworkId]);
  const current = catalog.find((card) => card.id === selected);
  function cue(place = false) {
    sound.current ??= createMathSound();
    sound.current.unlock();
    sound.current.play(place ? "achievementPlace" : "cardReveal");
  }
  function inspect(id: OliverArtworkId, button: HTMLButtonElement) {
    origin.current = button;
    setSelected(id);
    setError("");
    setOpen(true);
    cue();
  }
  function favorite(id: OliverArtworkId) {
    const next = favorites.includes(id)
      ? favorites.filter((value) => value !== id)
      : [...favorites, id];
    if (next.length > 3) {
      setError(uiText("Escolha no máximo três cartas favoritas."));
      return;
    }
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
  function thumbnail(id: OliverArtworkId) {
    return (
      <svg className="profile-cards__miniature" viewBox="0 0 310 535" aria-hidden="true">
        <foreignObject width="310" height="535">
          <OliverCard id={id} thumbnail />
        </foreignObject>
      </svg>
    );
  }
  const at = selected ? dates[selected] : undefined;
  const date = at === undefined ? "" : new Intl.DateTimeFormat(uiLocale()).format(new Date(at));
  return (
    <section className="profile-cards" aria-label={uiText("Cartas do Oliver")}>
      <header>
        <h2>{uiText("Cartas do Oliver")}</h2>
        <span className="profile-cards__count">
          <PaperDigits value={String(Object.keys(owned).length)} />
          <span>/ {catalog.length}</span>
        </span>
        <button
          className="profile-cards__bare"
          aria-label={uiText("Ver todas as cartas")}
          onClick={() => {
            origin.current = document.activeElement as HTMLButtonElement;
            setSelected(undefined);
            setOpen(true);
            cue();
          }}
        >
          <PaperArrow />
        </button>
      </header>
      <div className="profile-cards__featured">
        {Array.from({ length: 3 }, (_, index) => {
          const id = favorites[index] as OliverArtworkId | undefined;
          const card = catalog.find((value) => value.id === id);
          return (
            <button
              key={id ?? index}
              className="profile-cards__tile"
              aria-label={
                card
                  ? uiText("Inspecionar carta {0}", [card.title])
                  : uiText("Escolher carta favorita")
              }
              onClick={(event) => {
                if (id) inspect(id, event.currentTarget);
                else {
                  origin.current = event.currentTarget;
                  setSelected(undefined);
                  setOpen(true);
                }
              }}
            >
              {id ? (
                thumbnail(id)
              ) : (
                <span className="profile-cards__empty">
                  <img src="/olena-favicon-180.png" alt="" width="48" height="48" />
                  <span>+</span>
                </span>
              )}
              <strong>{card?.title ?? uiText("Favorita")}</strong>
            </button>
          );
        })}
      </div>
      {open && (
        <LibraryDialog
          title={current?.title ?? uiText("Cartas do Oliver")}
          onClose={() => {
            setOpen(false);
            setSelected(undefined);
            setError("");
            queueMicrotask(() => origin.current?.isConnected && origin.current.focus());
          }}
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
                  <button
                    className="profile-cards__bare"
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
                </div>
                <div key={selected} className="profile-cards__inspection">
                  <OliverCardInspection id={selected} />
                </div>
                <div className="profile-cards__date">
                  <span>{uiText("Obtida em")}</span>
                  {date ? (
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
                  )}
                  <span>{uiText("Exemplares: {0}", [owned[selected] ?? 0])}</span>
                </div>
              </>
            ) : (
              <>
                <p>{uiText("Escolha até três cartas da sua coleção para destacar no perfil.")}</p>
                <div className="profile-cards__gallery">
                  {catalog.map((card) => (
                    <div key={card.id} className="profile-cards__gallery-item">
                      <button
                        className="profile-cards__tile"
                        disabled={!owned[card.id]}
                        aria-label={uiText("Inspecionar carta {0}", [card.title])}
                        onClick={(event) => inspect(card.id, event.currentTarget)}
                      >
                        {owned[card.id] ? (
                          thumbnail(card.id)
                        ) : (
                          <div className="profile-cards__locked">
                            <OliverCard id={card.id} back />
                          </div>
                        )}
                        <strong>{card.title}</strong>
                      </button>
                      {owned[card.id] ? (
                        <button
                          className="profile-cards__bare"
                          aria-label={uiText(
                            favorites.includes(card.id)
                              ? "Remover carta dos destaques"
                              : "Destacar carta no perfil",
                          )}
                          aria-pressed={favorites.includes(card.id)}
                          onClick={() => favorite(card.id)}
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
            {error && <p role="alert">{error}</p>}
          </div>
        </LibraryDialog>
      )}
    </section>
  );
}
