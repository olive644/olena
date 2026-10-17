import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useStoredProfile } from "../hooks/use-stored-profile";
import type { WorkspaceAction, WorkspaceState } from "../domain/workspace";
import type { Dispatch } from "react";
import { ProfileProgress } from "./profile-preferences";
import { useAccessibility } from "../data/accessibility-preferences";
import { ProfileEditor, ProfilePaperIcon } from "./profile-editor";
import { recognizeSocialLink, SOCIAL_LABELS } from "../domain/profile-identity";
import { PaperEditorIcon } from "./paper-editor-icon";
import { ProfileAvatarDialog } from "./profile-avatar-dialog";
import { profileAvatarSource } from "../domain/profile-avatars";
import { ProfileStreaks } from "./profile-streaks";
import { useProfileHandle } from "../hooks/use-profile-handle";
import { ProfileCoverArt } from "./profile-cover-art";
import { ProfileCoverDialog } from "./profile-cover-dialog";
import { profileCover } from "../domain/profile-covers";
import { FriendIcon } from "./profile-friend-icon";
import { useSocialFeed } from "../hooks/use-social-feed";
import { useProfilePresentation } from "../hooks/use-profile-presentation";
import { HelenaLoading } from "./helena-loading";
import "./profile-social.css";
const SocialDirectory = lazy(() =>
  import("./profile-social").then((module) => ({ default: module.SocialDirectory })),
);

import { ProfileLabels } from "./profile-labels";
import { ProfileXpBar, ProfileLevelBadge, ProfileStudyWidgets } from "./profile-study-widgets";
import { ProfileQrIcon } from "./profile-qr-icon";
import { ProfileJourney } from "./profile-journey";
import "./profile-journey.css";
import { useProfileCompletion } from "../hooks/use-profile-completion";

export function ProfileShowcase({
  children,
  settingsOpen,
  nameFallback,
  guest = false,
  workspace,
  presentationReady = true,
  syncStatus,
}: {
  children: ReactNode;
  settingsOpen: boolean;
  nameFallback: string;
  guest?: boolean;
  workspace?: WorkspaceState;
  presentationReady?: boolean;
  syncStatus?: string;
}) {
  const [profile] = useStoredProfile();
  const [belowJourney, setBelowJourney] = useState(() => window.innerWidth <= 1000);
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 1000px)");
    if (!media) return;
    const update = () => setBelowJourney(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const { handle } = useProfileHandle(guest);
  const [editing, setEditing] = useState(false);
  const [choosingAvatar, setChoosingAvatar] = useState(false);
  const [choosingCover, setChoosingCover] = useState(false);
  const [connectionList, setConnectionList] = useState<"followers" | "following">();
  const [sharingProfile, setSharingProfile] = useState(false);
  const [friends, setFriends] = useState<string | undefined>(() => {
    const username = new URLSearchParams(window.location.search).get("usuario");
    return username && /^[a-z0-9._]{1,30}$/.test(username) ? username : undefined;
  });
  const social = useSocialFeed(!guest);
  useProfilePresentation(guest || !presentationReady ? "" : handle.username, nameFallback);
  const friendButton = useRef<HTMLButtonElement>(null);
  const friendActions = useRef<HTMLDivElement>(null);
  const connections = useRef<HTMLDivElement>(null);
  const journey = useRef<HTMLDivElement>(null);
  const { reduceMotion } = useAccessibility();
  const chrome = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const coverButton = useRef<HTMLButtonElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = chrome.current;
    const origin = anchor.current;
    if (!element || !origin || settingsOpen) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = -origin.getBoundingClientRect().top;
      const start = window.scrollY - distance;
      const availableScroll = document.documentElement.scrollHeight - window.innerHeight - start;
      const reservedHeight = element.nextElementSibling?.getBoundingClientRect().height ?? 398;
      const mobile = window.matchMedia?.("(max-width: 600px)").matches ?? window.innerWidth <= 600;
      const range = Math.max(1, Math.min(mobile ? 168 : reservedHeight, availableScroll));
      const progress = Math.min(1, Math.max(0, distance / range));
      element.style.setProperty(
        "--profile-collapse",
        String(motion?.matches || reduceMotion ? Number(progress > 0.5) : progress),
      );
      element.dataset["compact"] = String(progress >= 1);
      if (toolbar.current) {
        toolbar.current.dataset["compact"] = String(distance > 32);
        toolbar.current.style.setProperty(
          "--profile-collapse",
          String(motion?.matches || reduceMotion ? Number(progress > 0.5) : progress),
        );
      }
      if (editButton.current) editButton.current.inert = !mobile && progress > 0.2;
      if (coverButton.current) coverButton.current.inert = !mobile && progress > 0.2;
      if (friendButton.current) friendButton.current.inert = !mobile && progress > 0.2;
      if (friendActions.current) friendActions.current.inert = !mobile && progress > 0.2;
      if (connections.current) connections.current.inert = !mobile && progress > 0.2;
      if (journey.current) journey.current.inert = progress > 0.2;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion?.addEventListener?.("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion?.removeEventListener?.("change", schedule);
    };
  }, [settingsOpen, reduceMotion]);
  const name = guest ? nameFallback : profile.name?.trim() || nameFallback;
  const verification = useProfileCompletion(
    profile,
    handle.username,
    !guest && presentationReady,
    syncStatus,
  );
  const completion =
    !guest && presentationReady ? (
      <ProfileJourney
        verification={verification}
        profile={profile}
        username={handle.username}
        onChoose={(step) => {
          if (step === "identity") setEditing(true);
          else if (step === "avatar") setChoosingAvatar(true);
          else setChoosingCover(true);
        }}
      />
    ) : null;
  return (
    <>
      <div ref={anchor} className="profile-scroll-anchor" aria-hidden="true" />
      <div ref={toolbar} className="profile-toolbar">
        {children}
        {!settingsOpen && (
          <div className="profile-compact-identity" aria-hidden="true">
            <div>
              <strong>{name}</strong>
            </div>
            <div>
              {handle.username && <span>@{handle.username}</span>}
              {profile.pronouns && <span>{profile.pronouns}</span>}
            </div>
            <ProfileLabels creks={handle.creks} username={handle.username} />
            <img
              className="profile-compact-identity__avatar"
              src={profileAvatarSource(profile.photoUrl)}
              alt=""
              width="40"
              height="40"
              draggable={false}
            />
          </div>
        )}
      </div>
      <div ref={chrome} className="profile-chrome" data-settings={settingsOpen}>
        {!settingsOpen && completion && !belowJourney && (
          <div ref={journey} className="profile-journey-slot--side">
            {completion}
          </div>
        )}
        {!settingsOpen && (
          <section className="profile-cover" aria-label="Seu perfil">
            <div className="profile-cover__art">
              <ProfileCoverArt theme={profileCover(profile.cover)} />
            </div>
            <button
              ref={coverButton}
              className="secondary-button profile-cover__choose"
              type="button"
              onClick={() => setChoosingCover(true)}
              aria-label="Editar capa"
              title="Editar capa"
            >
              <PaperEditorIcon name="pen" />
            </button>
            <div className="profile-cover__shade" />
            <div className="profile-cover__details">
              <div className="profile-cover__identity">
                <h1 className="profile-cover__name" title={name}>
                  {name}
                </h1>
                <button
                  ref={editButton}
                  type="button"
                  className="secondary-button profile-cover__edit"
                  aria-label="Editar perfil"
                  title="Editar perfil"
                  onClick={() => setEditing(true)}
                >
                  <PaperEditorIcon name="pen" />
                </button>
              </div>
              <div className="profile-cover__handle">
                {handle.username && <strong>@{handle.username}</strong>}
                <ProfileLabels creks={handle.creks} username={handle.username} />
                {profile.pronouns && <span>{profile.pronouns}</span>}
              </div>
              <ProfileXpBar />
              <div ref={friendActions} className="profile-cover__actions">
                <button
                  ref={friendButton}
                  type="button"
                  className="secondary-button profile-cover__friends"
                  onClick={() => {
                    setSharingProfile(false);
                    setConnectionList(undefined);
                    setFriends("");
                  }}
                >
                  <FriendIcon />
                  Adicionar amigo
                </button>
                <button
                  type="button"
                  className="secondary-button profile-cover__qr"
                  aria-label="Compartilhar perfil por QR code"
                  onClick={() => {
                    setSharingProfile(true);
                    setConnectionList(undefined);
                    setFriends("");
                  }}
                >
                  <ProfileQrIcon />
                </button>
              </div>
              {profile.bio && (
                <p className="profile-cover__bio" title={profile.bio}>
                  {profile.bio}
                </p>
              )}
              <nav className="profile-cover__networks" aria-label="Redes sociais do perfil">
                {profile.socialLinks?.map((link) => {
                  const social = recognizeSocialLink(link);
                  return social ? (
                    <a
                      key={social.network}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-button"
                      aria-label={SOCIAL_LABELS[social.network]}
                      title={SOCIAL_LABELS[social.network]}
                    >
                      <ProfilePaperIcon name={social.network} />
                    </a>
                  ) : null;
                })}
              </nav>
              <div
                ref={connections}
                className="profile-cover__connections"
                aria-label="Conexões do perfil"
              >
                <button
                  type="button"
                  onClick={() => {
                    setConnectionList("followers");
                    setFriends("");
                  }}
                  title="Pessoas que seguem seu perfil"
                >
                  <ProfilePaperIcon name="followers" />
                  <strong>{social?.self.followers ?? (guest ? 0 : null)}</strong> Seguidores
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConnectionList("following");
                    setFriends("");
                  }}
                  title="Pessoas que você segue"
                >
                  <ProfilePaperIcon name="following" />
                  <strong>{social?.self.following ?? (guest ? 0 : null)}</strong> Seguindo
                </button>
                <div className="profile-cover__streaks" aria-label="Sequências de estudo">
                  {workspace && <ProfileStreaks workspace={workspace} />}
                </div>
              </div>
            </div>
            <span className="profile-cover__spark profile-cover__spark--one" aria-hidden="true">
              ✦
            </span>
            <span className="profile-cover__spark profile-cover__spark--two" aria-hidden="true">
              ✦
            </span>
          </section>
        )}
        {!settingsOpen && (
          <button
            type="button"
            className="profile-cover__portrait"
            aria-label="Abrir foto do perfil"
            title="Foto do perfil"
            onClick={() => setChoosingAvatar(true)}
          >
            <img
              className="profile-cover__avatar"
              draggable={false}
              src={profileAvatarSource(profile.photoUrl)}
              alt="Sua foto de perfil"
              width="144"
              height="144"
              onError={(event) => {
                event.currentTarget.onerror = null;
                if (!event.currentTarget.src.endsWith("/profile-avatars/helena.webp"))
                  event.currentTarget.src = "/profile-avatars/helena.webp";
              }}
            />
            <ProfileLevelBadge />
          </button>
        )}
      </div>
      {!settingsOpen && <div className="profile-cover-spacer" aria-hidden="true" />}
      {!settingsOpen && completion && belowJourney && (
        <div className="profile-journey-slot--below">{completion}</div>
      )}
      {editing && (
        <ProfileEditor
          profile={{ ...profile, name, username: handle.username || profile.username || "" }}
          guest={guest}
          onClose={() => setEditing(false)}
        />
      )}
      {choosingAvatar && <ProfileAvatarDialog onClose={() => setChoosingAvatar(false)} />}
      {choosingCover && <ProfileCoverDialog onClose={() => setChoosingCover(false)} />}
      {friends !== undefined && (
        <Suspense fallback={<HelenaLoading label="Abrindo amigos" compact />}>
          <SocialDirectory
            initialSharing={sharingProfile}
            {...(connectionList ? { initialList: connectionList } : {})}
            initialUsername={friends}
            nameFallback={name}
            onClose={() => {
              setFriends(undefined);
              requestAnimationFrame(() => friendButton.current?.focus());
            }}
          />
        </Suspense>
      )}
    </>
  );
}

export function ProfileOverview({
  workspace,
  dispatch,
}: {
  workspace: WorkspaceState;
  dispatch?: Dispatch<WorkspaceAction> | undefined;
}) {
  return (
    <div className="profile-overview">
      <div className="profile-settings-grid">
        <ProfileProgress workspace={workspace} />
      </div>
      <div className="profile-study-grid">
        <ProfileStudyWidgets workspace={workspace} dispatch={dispatch} />
      </div>
    </div>
  );
}
