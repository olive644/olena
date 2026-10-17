import { useEffect, useRef, useState } from "react";
import { PROFILE_COVERS, profileCover } from "../domain/profile-covers";
import { readStoredProfile } from "../hooks/use-stored-profile";
import { writeSyncedStorage } from "../data/synced-storage";
import { PaperCloseIcon } from "./paper-close-icon";
import { ProfileCoverArt } from "./profile-cover-art";

export function ProfileCoverDialog({ onClose }: { onClose(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [chosen, setChosen] = useState(() => profileCover(readStoredProfile().cover));
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
      className="profile-editor profile-cover-dialog"
      aria-labelledby="profile-cover-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id="profile-cover-title">Capa do perfil</h2>
        <button className="icon-button" type="button" aria-label="Fechar capas" onClick={close}>
          <PaperCloseIcon />
        </button>
      </header>
      <div className="profile-cover-preview">
        <ProfileCoverArt theme={chosen} />
      </div>
      <div className="profile-cover-options" role="group" aria-label="Temas de capa">
        {PROFILE_COVERS.map((cover) => (
          <button
            key={cover.id}
            type="button"
            className="secondary-button"
            aria-pressed={chosen === cover.id}
            onClick={() => setChosen(cover.id)}
          >
            <ProfileCoverArt theme={cover.id} />
            <span>{cover.name}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <footer>
        <button className="secondary-button" type="button" onClick={close}>
          Cancelar
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            try {
              writeSyncedStorage(
                "helena.profile.v1",
                JSON.stringify({ ...readStoredProfile(), cover: chosen }),
              );
              close();
            } catch {
              setError("Não foi possível salvar. Sua escolha continua aqui para tentar novamente.");
            }
          }}
        >
          Usar capa
        </button>
      </footer>
    </dialog>
  );
}
