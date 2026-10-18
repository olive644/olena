import { uiText, useLanguage } from "../i18n/runtime";
import { useState } from "react";
import {
  buildLocalRoomJoinUrl,
  sanitizeRoomAvatar,
  type LocalRoomParticipant,
} from "../domain/local-room";
import { RoomSocialIcon } from "./room-social-icon";
import { PaperDigits } from "./paper-digits";
import { RoomQrCode } from "./room-qr-code";
import { PaperCheckIcon } from "./paper-check-icon";

export function ShareRoom({
  code,
  bingo = false,
  locked = false,
  onLock,
}: {
  code: string;
  bingo?: boolean;
  locked?: boolean;
  onLock?: (locked: boolean) => Promise<boolean>;
}) {
  useLanguage();

  const [copyStatus, setCopyStatus] = useState("");
  const joinUrl = buildLocalRoomJoinUrl(window.location.href, code);

  async function copy(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(success);
    } catch {
      setCopyStatus(uiText(454));
    }
    window.setTimeout(() => setCopyStatus(""), 2500);
  }

  return (
    <div className="local-room-share">
      <div className="local-room-share__code">
        <strong aria-label={uiText(455)}>{code}</strong>
        <button
          className="icon-button"
          type="button"
          onClick={() => void copy(code, uiText(456))}
          aria-label={uiText(457)}
        >
          <span className="local-room-copy-icon local-room-copy-icon--paper" aria-hidden="true">
            <RoomSocialIcon kind="copy" />
          </span>
        </button>
      </div>
      <details className="local-room-share__qr" open>
        <summary>{uiText(458)}</summary>
        <RoomQrCode value={joinUrl} bingo={bingo} />
      </details>
      <div className="local-room-share__link">
        <p>{uiText(459)}</p>
        <input aria-label={uiText(460)} value={joinUrl} readOnly />
        <div className="local-room-share__actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => void copy(joinUrl, uiText(1729))}
          >
            <span className="local-room-copy-label">
              <span className="local-room-copy-icon local-room-copy-icon--paper" aria-hidden="true">
                <RoomSocialIcon kind="copy" />
              </span>
              {uiText(461)}
            </span>
          </button>
          {onLock && <LobbyLockToggle locked={locked} onChange={onLock} />}
        </div>
        <p className="local-room-copy-status" role="status" aria-live="polite">
          {copyStatus}
          {copyStatus.endsWith("copiado") && <PaperCheckIcon size={14} />}
        </p>
      </div>
    </div>
  );
}

export function LobbyLockToggle({
  locked,
  onChange,
}: {
  locked: boolean;
  onChange(locked: boolean): Promise<boolean>;
}) {
  useLanguage();

  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await onChange(!locked);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="local-room-lock">
      <button
        type="button"
        className="secondary-button"
        disabled={busy}
        onClick={() => void toggle()}
      >
        <RoomSocialIcon kind={locked ? "open" : "lock"} />
        {locked ? uiText(1730) : uiText(462)}
      </button>
      {locked && (
        <p className="visually-hidden" role="status">
          {uiText(463)}
        </p>
      )}
    </div>
  );
}

export function RemoveParticipantButton({
  name,
  disabled = false,
  onRemove,
}: {
  name: string;
  disabled?: boolean;
  onRemove(): void;
}) {
  useLanguage();

  return (
    <button
      type="button"
      className="secondary-button local-room-remove"
      disabled={disabled}
      aria-label={uiText(1731, [name])}
      onClick={onRemove}
    >
      <RoomSocialIcon kind="remove" />
    </button>
  );
}

export function LobbyParticipants({
  participants,
  onRemove,
}: {
  participants: readonly LocalRoomParticipant[];
  onRemove?: (id: string) => Promise<boolean>;
}) {
  useLanguage();

  return (
    <ul className="local-room-participant-list">
      {participants.map((participant) => (
        <li key={participant.id}>
          <ParticipantLevel level={participant.level} />
          <img
            className="local-room-avatar"
            src={sanitizeRoomAvatar(participant.avatarUrl) ?? "/profile-avatars/helena.webp"}
            alt=""
            width="40"
            height="40"
            referrerPolicy="no-referrer"
            onError={(event) => {
              if (event.currentTarget.getAttribute("src") !== "/profile-avatars/helena.webp") {
                event.currentTarget.src = "/profile-avatars/helena.webp";
              }
            }}
          />
          <div className="local-room-participant-list__identity">
            <span className="local-room-participant-list__name">{participant.displayName}</span>
            <small className={participant.online === false ? "is-offline" : ""}>
              <RoomSocialIcon kind={participant.online === false ? "away" : "ready"} />
              {participant.online === false ? uiText(1732) : uiText(718)}
            </small>
          </div>
          {onRemove && (
            <RemoveParticipantButton
              name={participant.displayName}
              onRemove={() => void onRemove(participant.id)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export function ParticipantLevel({ level = 1 }: { level?: number | undefined }) {
  useLanguage();

  const safe = Number.isSafeInteger(level) && level >= 1 ? Math.min(level, 100) : 1;
  return (
    <span className="room-participant-level" aria-label={uiText(1733, [safe])}>
      <small aria-hidden="true">{uiText(464)}</small>
      <PaperDigits value={String(safe)} />
    </span>
  );
}
