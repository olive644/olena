import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import type { BingoReviewDecision, PublicLocalRoomState } from "../domain/local-room";
import { BINGO_FREE, BINGO_MODE_LABELS } from "../domain/number-bingo";
import { playBingoClaimSound } from "../data/room-feedback-sound";
import { BingoPlanet } from "./bingo-planet";
import { RoomConfetti } from "./room-paper-icons";

export function BingoReview({
  state,
  isHost,
  onReview,
}: {
  state: PublicLocalRoomState;
  isHost: boolean;
  onReview?: ((claimId: string, decision: BingoReviewDecision) => Promise<void>) | undefined;
}) {
  useLanguage();

  const dialog = useRef<HTMLDialogElement>(null);
  const played = useRef("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const claim = state.bingoClaim;
  const player = state.participants.find((p) => p.id === claim?.participantId);
  useEffect(() => {
    if (!claim) return;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    if (played.current !== claim.id) {
      played.current = claim.id;
      playBingoClaimSound();
    }
  }, [claim]);
  async function decide(decision: BingoReviewDecision) {
    if (!claim || !onReview || busy) return;
    setBusy(true);
    setError("");
    try {
      await onReview(claim.id, decision);
    } catch {
      setError(uiText(132));
    } finally {
      setBusy(false);
    }
  }
  if (!claim || !player) return null;
  return (
    <dialog
      ref={dialog}
      className="bingo-review"
      aria-labelledby="bingo-announcement"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="bingo-review-burst" key={claim.id}>
        <RoomConfetti />
        <img src="/room-icons/bingo-claim.svg" alt="" width="84" height="84" />
        <h2 id="bingo-announcement" tabIndex={-1}>
          {player.displayName} {uiText(133)}
        </h2>
        <p>{BINGO_MODE_LABELS[state.settings.bingoMode ?? "line"]}</p>
        {!!state.bingoClaimQueue?.length && (
          <p role="status">
            {uiText(134)} {state.bingoClaimQueue.length} {uiText(135)}
          </p>
        )}
      </div>
      {isHost ? (
        <>
          <div className="bingo-review-content">
            <div className="bingo-review-instructions">
              <img src="/profile-avatars/poliana.webp" alt="" width="100" height="100" />
            </div>
            {!state.settings.bingoPhysical && (
              <section className="bingo-solar-card" aria-label={uiText(136)}>
                <header>
                  <h3>{player.displayName}</h3>
                  <small>{uiText(137)}</small>
                </header>
                <div className="bingo-card-heading" aria-hidden="true">
                  {[uiText(1621), uiText(1622), uiText(1623), uiText(1624), uiText(1625)].map(
                    (letter, i) => (
                      <div key={letter}>
                        <BingoPlanet index={i} />
                        <strong>{letter}</strong>
                      </div>
                    ),
                  )}
                </div>
                <div className="bingo-card-grid">
                  {player.bingoCard?.map((id, i) => {
                    const marked = id === BINGO_FREE || player.bingoMarks?.includes(id) === true;
                    return (
                      <button
                        key={id}
                        type="button"
                        className="secondary-button"
                        data-orbit={i % 5}
                        disabled
                        aria-pressed={marked}
                        aria-label={
                          id === BINGO_FREE
                            ? uiText(1626)
                            : `${[uiText(1621), uiText(1622), uiText(1623), uiText(1624), uiText(1625)][i % 5]} ${id}`
                        }
                      >
                        {id === BINGO_FREE ? (
                          <img src="/favicon-star.svg" alt="" width="34" height="34" />
                        ) : (
                          <BingoPlanet index={i % 5} number={id} />
                        )}
                        {marked && <span className="bingo-cell-star" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
          <div className="bingo-review-actions">
            {(
              [
                ["reject", uiText(1627)],
                ["continue", uiText(1628)],
                ["restart", uiText(138)],
                ["finish", (state.bingoWinnerIds?.length ?? 0) > 0 ? uiText(1629) : uiText(1630)],
              ] as const
            ).map(([decision, label]) => (
              <button
                key={decision}
                type="button"
                className={decision === "continue" ? "primary-button" : "secondary-button"}
                disabled={busy || !onReview}
                onClick={() => void decide(decision)}
              >
                <img src={`/room-icons/bingo-${decision}.svg`} alt="" width="32" height="32" />
                {label}
              </button>
            ))}
          </div>
          {error && <p role="alert">{uiText(error)}</p>}
        </>
      ) : (
        <p className="bingo-review-wait" role="status">
          {uiText(139)}
        </p>
      )}
    </dialog>
  );
}
