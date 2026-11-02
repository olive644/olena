import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState } from "react";
import { readStoredProfile } from "../hooks/use-stored-profile";
import { profileAvatarSource } from "../domain/profile-avatars";
import { PROFILE_COVERS, profileCover } from "../domain/profile-covers";
import {
  PROFILE_FRAMES,
  PROFILE_BACKGROUNDS,
  profileFrame,
  profileBackground,
  cosmeticUnlocked,
} from "../domain/profile-cosmetics";
import { mathAchievements } from "../domain/math-achievements";
import { readMathGame } from "../data/math-game-learning";
import { writeSyncedStorage } from "../data/synced-storage";
import { ProfileChoices } from "./app-navigation";
import { PaperCloseIcon } from "./paper-close-icon";
import { ProfileCoverArt } from "./profile-cover-art";
import { ProfileFrameArt } from "./profile-frame-art";
import { PaperCheckIcon } from "./paper-check-icon";
import "./profile-customization.css";
type Category = "avatar" | "frame" | "cover" | "background";
const tabs = [
  ["avatar", "Avatares"],
  ["frame", "Molduras"],
  ["cover", "Headers"],
  ["background", "Fundo do perfil"],
] as const;
export function ProfileAvatarDialog({
  onClose,
  initialCategory = "avatar",
}: {
  onClose(): void;
  initialCategory?: Category;
}) {
  useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = useRef(new Set<keyof typeof chosen>());
  const [category, setCategory] = useState<Category>(initialCategory);
  const [chosen, setChosen] = useState(() => {
    const p = readStoredProfile();
    return {
      photoUrl: profileAvatarSource(p.photoUrl),
      frame: profileFrame(p.frame),
      cover: profileCover(p.cover),
      background: profileBackground(p.background),
    };
  });
  const [error, setError] = useState("");
  const earned = new Set(
    mathAchievements(readMathGame())
      .filter((item) => item.earned)
      .map((item) => item.id),
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function close() {
    dialog.current?.close();
    onClose();
  }
  const entries =
    category === "frame"
      ? PROFILE_FRAMES
      : category === "cover"
        ? PROFILE_COVERS
        : PROFILE_BACKGROUNDS;
  return (
    <dialog
      ref={dialog}
      className="profile-editor profile-avatar-dialog profile-customizer"
      aria-labelledby="profile-avatar-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id="profile-avatar-title">{uiText("Personalize seu perfil")}</h2>
        <button className="icon-button" type="button" aria-label={uiText(828)} onClick={close}>
          <PaperCloseIcon />
        </button>
      </header>
      <div className="profile-customizer-preview" data-profile-background={chosen.background}>
        <ProfileCoverArt theme={chosen.cover} />
        <div className="profile-customizer-portrait">
          <img src={chosen.photoUrl} width="100" height="100" alt={uiText(829)} />
          <ProfileFrameArt frame={chosen.frame} />
        </div>
      </div>
      <nav className="profile-customizer-tabs" aria-label={uiText("Categorias de personalização")}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="secondary-button"
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
          >
            {uiText(label)}
          </button>
        ))}
      </nav>
      {category === "avatar" ? (
        <ProfileChoices
          selectedPhotoUrl={chosen.photoUrl}
          onChoose={(avatar) => {
            dirty.current.add("photoUrl");
            setChosen({ ...chosen, photoUrl: profileAvatarSource(avatar.photoUrl) });
          }}
        />
      ) : (
        <div
          className="profile-customizer-options"
          role="group"
          aria-label={uiText(
            category === "cover"
              ? "Temas de capa"
              : category === "frame"
                ? "Molduras"
                : "Fundo do perfil",
          )}
        >
          {entries.map((item) => {
            const unlocked = cosmeticUnlocked(category, item.id, earned);
            const selected = chosen[category] === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className="secondary-button"
                aria-pressed={selected}
                aria-disabled={!unlocked}
                onClick={() => {
                  if (unlocked) {
                    dirty.current.add(category);
                    setChosen({ ...chosen, [category]: item.id });
                  }
                }}
              >
                {category === "cover" ? (
                  <ProfileCoverArt theme={profileCover(item.id)} />
                ) : category === "frame" ? (
                  <div className="profile-customizer-frame">
                    <img src={chosen.photoUrl} alt="" width="70" height="70" />
                    <ProfileFrameArt frame={item.id} />
                  </div>
                ) : (
                  <div className="profile-background-swatch" data-profile-background={item.id} />
                )}
                <span>
                  {uiText(item.name)} {selected && <PaperCheckIcon size={16} />}
                </span>
                {!unlocked && (
                  <small>
                    {uiText(
                      category === "frame"
                        ? "Complete uma ilha de Matemática."
                        : "Acerte 100 contas em Matemática.",
                    )}
                  </small>
                )}
              </button>
            );
          })}
        </div>
      )}
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
              const current = readStoredProfile();
              const allowed = { ...chosen };
              if (!cosmeticUnlocked("frame", chosen.frame, earned))
                allowed.frame = profileFrame(current.frame);
              if (!cosmeticUnlocked("cover", chosen.cover, earned))
                allowed.cover = profileCover(current.cover);
              if (!cosmeticUnlocked("background", chosen.background, earned))
                allowed.background = profileBackground(current.background);
              writeSyncedStorage(
                "helena.profile.v1",
                JSON.stringify({
                  ...current,
                  ...Object.fromEntries([...dirty.current].map((key) => [key, allowed[key]])),
                }),
              );
              close();
            } catch {
              setError(uiText(830));
            }
          }}
        >
          {uiText(
            category === "avatar" ? 831 : category === "cover" ? 835 : "Salvar personalização",
          )}
        </button>
      </footer>
    </dialog>
  );
}
