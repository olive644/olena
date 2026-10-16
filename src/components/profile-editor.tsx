import { useEffect, useRef, useState } from "react";
import { readStoredProfile, type StoredProfile } from "../hooks/use-stored-profile";
import { writeSyncedStorage } from "../data/synced-storage";
import {
  recognizeSocialLink,
  SOCIAL_LABELS,
  validateProfileDraft,
  type ProfileDraft,
  type SocialNetwork,
} from "../domain/profile-identity";
import { PaperChoice } from "./agenda-paper-fields";
import { PaperCloseIcon } from "./paper-close-icon";
import { PaperEditorIcon } from "./paper-editor-icon";

export function ProfilePaperIcon({ name }: { name: SocialNetwork | "followers" | "following" }) {
  return (
    <img
      className="profile-paper-icon"
      src={`/navigation-icons/paper/profile-${name}.svg`}
      alt=""
      aria-hidden="true"
      width="28"
      height="28"
    />
  );
}

const PRONOUNS = ["", "Ela/dela", "Ele/dele", "Elu/delu"];

export function ProfileEditor({
  profile,
  guest,
  onClose,
}: {
  profile: StoredProfile;
  guest: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<ProfileDraft>(() => ({
    name: guest ? "Guest" : profile.name || "",
    username: profile.username || "",
    bio: profile.bio || "",
    pronouns: profile.pronouns || "",
    socialLinks: profile.socialLinks?.length ? [...profile.socialLinks] : [""],
  }));
  const [pronounChoice, setPronounChoice] = useState(
    PRONOUNS.includes(draft.pronouns) ? draft.pronouns : "custom",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function close() {
    dialog.current?.close();
    onClose();
  }
  function change(field: "name" | "username" | "bio" | "pronouns", value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }
  return (
    <dialog
      ref={dialog}
      className="profile-editor"
      aria-labelledby="profile-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id="profile-editor-title">Editar perfil</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar edição de perfil"
          onClick={close}
        >
          <PaperCloseIcon />
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const invalid = validateProfileDraft(draft);
          if (invalid) {
            setError(invalid);
            return;
          }
          try {
            writeSyncedStorage(
              "helena.profile.v1",
              JSON.stringify({
                ...readStoredProfile(),
                name: draft.name.trim(),
                username: draft.username.trim(),
                bio: draft.bio.trim(),
                pronouns: draft.pronouns.trim(),
                socialLinks: draft.socialLinks
                  .filter((link) => link.trim())
                  .map((link) => recognizeSocialLink(link)!.url),
              }),
            );
            close();
          } catch {
            setError(
              "Não foi possível salvar o perfil. Suas alterações continuam aqui para tentar novamente.",
            );
          }
        }}
      >
        <div className="profile-editor__fields">
          <label className="field">
            <span>Apelido</span>
            <input
              required
              maxLength={60}
              value={draft.name}
              readOnly={guest}
              onChange={(event) => change("name", event.target.value)}
              autoComplete="nickname"
            />
          </label>
          <label className="field">
            <span id="profile-username-label">Nome</span>
            <input
              maxLength={30}
              value={draft.username}
              onChange={(event) => change("username", event.target.value.toLowerCase())}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby="profile-username-help"
              aria-labelledby="profile-username-label"
            />
            <small id="profile-username-help">
              Letras minúsculas, números, ponto e _. Não é um nome de usuário exclusivo.
            </small>
          </label>
          <label className="field profile-editor__wide">
            <span id="profile-bio-label">Bio</span>
            <textarea
              maxLength={240}
              rows={3}
              aria-labelledby="profile-bio-label"
              value={draft.bio}
              onChange={(event) => change("bio", event.target.value)}
            />
            <small>{draft.bio.length}/240</small>
          </label>
          <div className="profile-editor__wide">
            <PaperChoice
              label="Pronomes"
              value={pronounChoice}
              options={[
                { value: "", label: "Não informar" },
                ...PRONOUNS.slice(1).map((value) => ({ value, label: value })),
                { value: "custom", label: "Personalizado" },
              ]}
              onChange={(value) => {
                setPronounChoice(value);
                change("pronouns", value === "custom" ? "" : value);
              }}
            />
            {pronounChoice === "custom" && (
              <label className="field">
                <span>Pronomes personalizados</span>
                <input
                  maxLength={40}
                  value={draft.pronouns}
                  onChange={(event) => change("pronouns", event.target.value)}
                  placeholder="Ex.: ele/dela"
                />
              </label>
            )}
          </div>
        </div>
        <fieldset className="profile-editor__socials">
          <legend>Redes sociais</legend>
          {draft.socialLinks.map((link, index) => {
            const detected = recognizeSocialLink(link);
            return (
              <div className="profile-editor__social-row" key={index}>
                <label className="field">
                  <span id={`profile-social-${index}-label`}>Rede social {index + 1}</span>
                  <input
                    type="text"
                    inputMode="url"
                    aria-labelledby={`profile-social-${index}-label`}
                    value={link}
                    maxLength={500}
                    placeholder="Cole o link do seu perfil"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        socialLinks: current.socialLinks.map((value, position) =>
                          position === index ? event.target.value : value,
                        ),
                      }))
                    }
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  {link && (
                    <small className="profile-editor__detected">
                      {detected && <ProfilePaperIcon name={detected.network} />}
                      {detected ? SOCIAL_LABELS[detected.network] : "Link não reconhecido"}
                    </small>
                  )}
                </label>
                <button
                  className="secondary-button"
                  type="button"
                  aria-label={`Remover rede social ${index + 1}`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      socialLinks: current.socialLinks.filter((_, position) => position !== index),
                    }))
                  }
                >
                  <PaperEditorIcon name="trash" />
                </button>
              </div>
            );
          })}
          <button
            className="secondary-button"
            type="button"
            disabled={draft.socialLinks.length >= 5}
            onClick={() =>
              setDraft((current) => ({ ...current, socialLinks: [...current.socialLinks, ""] }))
            }
          >
            <PaperEditorIcon name="add" />
            Adicionar rede
          </button>
        </fieldset>
        {guest && (
          <p className="profile-editor__hint">
            No modo convidado, o apelido é Guest e as alterações ficam neste aparelho.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            Salvar perfil
          </button>
        </footer>
      </form>
    </dialog>
  );
}
