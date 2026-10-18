import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { readStoredProfile } from "../hooks/use-stored-profile";
import { profileAvatarSource } from "../domain/profile-avatars";
import { writeSyncedStorage } from "../data/synced-storage";
import { ProfileChoices } from "./app-navigation";
import { PaperCloseIcon } from "./paper-close-icon";
export function ProfileAvatarDialog({ onClose }: { onClose(): void }) {
  useLanguage();

  const dialog = useRef<HTMLDialogElement>(null);
  const [chosen, setChosen] = useState(() => profileAvatarSource(readStoredProfile().photoUrl));
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function close() {
    dialog.current?.close();
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="profile-editor profile-avatar-dialog"
      aria-labelledby="profile-avatar-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id="profile-avatar-title">{uiText(827)}</h2>
        <button className="icon-button" type="button" aria-label={uiText(828)} onClick={close}>
          <PaperCloseIcon />
        </button>
      </header>
      <img
        className="profile-avatar-dialog__preview"
        src={chosen}
        width="160"
        height="160"
        alt={uiText(829)}
      />
      <ProfileChoices
        selectedPhotoUrl={chosen}
        onChoose={(avatar) => setChosen(profileAvatarSource(avatar.photoUrl))}
      />
      {error && <p role="alert">{uiText(error)}</p>}
      <footer>
        <button className="secondary-button" type="button" onClick={close}>
          {uiText(155)}
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            try {
              writeSyncedStorage(
                "helena.profile.v1",
                JSON.stringify({ ...readStoredProfile(), photoUrl: chosen }),
              );
              close();
            } catch {
              setError(uiText(830));
            }
          }}
        >
          {uiText(831)}
        </button>
      </footer>
    </dialog>
  );
}
