import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ProfileLevelBadge } from "./profile-study-widgets";
import type { SocialAction, SocialFeed, SocialProfile } from "../domain/profile-social";
import { requestSocial, SOCIAL_VISIT } from "../data/profile-social";
import { PaperCloseIcon } from "./paper-close-icon";
import { readStoredProfile } from "../hooks/use-stored-profile";
import { profileAvatarSource } from "../domain/profile-avatars";
import "./profile-social.css";
import { ProfileShareCard } from "./profile-share-card";
import { PaperEditorIcon } from "./paper-editor-icon";
import { HelenaLoading } from "./helena-loading";

import { FriendIcon } from "./profile-friend-icon";
import { ProfileLabels } from "./profile-labels";
import { PaperArrow } from "./paper-arrow";
import { profileCover } from "../domain/profile-covers";
import { ProfileCoverArt } from "./profile-cover-art";
import { ProfileNetworks } from "./profile-networks";
import { ProfileStreakValues } from "./profile-streaks";
import { ProfileSafety } from "./profile-safety";
import { AchievementCollection } from "./math-achievements";
import { PublicProfileCards } from "./public-profile-cards";

function ProfileVisitDialog({
  person,
  children,
  onClose,
  onBack,
}: {
  person: SocialProfile;
  children: ReactNode;
  onClose(): void;
  onBack?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => {
      if (node?.open) node.close();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="profile-editor social-directory profile-visit-dialog"
      data-inspecting="true"
      aria-label={uiText(1916, [person.username])}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 className="visually-hidden">{person.name}</h2>
        {onBack && (
          <button
            type="button"
            className="icon-button social-visit-back"
            aria-label={uiText(374)}
            title={uiText(374)}
            onClick={onBack}
          >
            <PaperArrow back />
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          aria-label={uiText(230)}
          title={uiText(230)}
          onClick={onClose}
        >
          <PaperCloseIcon />
        </button>
      </header>
      {children}
    </dialog>,
    document.querySelector(".app-shell") ?? document.body,
  );
}

function Person({ person, onVisit }: { person: SocialProfile; onVisit(username: string): void }) {
  useLanguage();

  return (
    <button
      type="button"
      className="social-person"
      aria-label={uiText(1912, [person.username])}
      onClick={() => onVisit(person.username)}
    >
      <img src={person.photoUrl} alt="" width="44" height="44" />
      <span>
        <strong title={person.name}>{person.name}</strong>
        <small title={`@${person.username}`}>@{person.username}</small>
        {person.followsYou && <small className="social-person-relation">{uiText(924)}</small>}
      </span>
    </button>
  );
}

export function SocialDirectory({
  initialUsername = "",
  onClose,
  nameFallback,
  initialList,
  initialSharing = false,
}: {
  initialUsername?: string;
  onClose(): void;
  nameFallback: string;
  initialList?: "followers" | "following";
  initialSharing?: boolean;
}) {
  useLanguage();

  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState(initialUsername);
  const [feed, setFeed] = useState<SocialFeed>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [sharing, setSharing] = useState(initialSharing);
  const [status, setStatus] = useState("");
  const [list, setList] = useState<
    { kind: "followers" | "following"; owner: string } | undefined
  >();
  const [confirmation, setConfirmation] = useState<{
    person: SocialProfile;
    action: "unfollow" | "remove-follower";
  }>();
  const [openedAt] = useState(Date.now);
  const inspecting = !!feed?.profile && !list && !sharing;
  const contacts = (
    navigator as Navigator & {
      contacts?: {
        select(fields: string[], options: { multiple: boolean }): Promise<{ name?: string[] }[]>;
      };
    }
  ).contacts;
  async function chooseContact() {
    if (!contacts) return;
    try {
      const selected = await contacts.select(["name"], { multiple: false });
      const name = selected[0]?.name?.[0];
      if (name) {
        setSearch(name.slice(0, 80));
        setStatus(uiText(925));
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(uiText(926));
    }
  }
  const generation = useRef(0);
  // Lista de onde o perfil foi aberto: o voltar retorna a ela em vez de recomeçar a busca.
  const [origin, setOrigin] = useState<{ kind: "followers" | "following"; owner: string }>();
  useEffect(() => {
    if (inspecting) return;
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, [inspecting]);
  function close() {
    dialog.current?.close();
    onClose();
  }
  async function load(username?: string) {
    if (username === undefined) setOrigin(undefined);
    setList(undefined);
    const current = ++generation.current;
    setBusy(true);
    setFeed(undefined);
    setError("");
    try {
      const value = await requestSocial(
        undefined,
        username
          ? `username=${encodeURIComponent(username)}`
          : search.trim()
            ? `search=${encodeURIComponent(search.trim().replace(/^@/, "").toLowerCase())}`
            : "",
      );
      if (current === generation.current) setFeed(value);
    } catch (cause) {
      if (current === generation.current)
        setError(cause instanceof Error ? cause.message : uiText(927));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    const current = ++generation.current;
    void requestSocial(
      undefined,
      `${initialUsername ? `username=${encodeURIComponent(initialUsername)}` : ""}${initialList ? `${initialUsername ? "&" : ""}list=${initialList}` : ""}`,
    )
      .then((value) => {
        if (active && current === generation.current) {
          setFeed(value);
          if (initialList)
            setList({ kind: initialList, owner: value.connections?.owner ?? value.self.username });
        }
      })
      .catch((cause: unknown) => {
        if (active && current === generation.current)
          setError(cause instanceof Error ? cause.message : uiText(927));
      })
      .finally(() => {
        if (active && current === generation.current) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [initialUsername, initialList]);
  async function loadList(kind: "followers" | "following", owner: string, offset = 0) {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    setList({ kind, owner });
    try {
      const value = await requestSocial(
        undefined,
        `username=${encodeURIComponent(owner)}&list=${kind}&offset=${offset}`,
      );
      if (current === generation.current)
        setFeed((previous) =>
          offset && previous?.connections
            ? {
                ...value,
                connections: {
                  ...value.connections!,
                  people: [...previous.connections.people, ...value.connections!.people],
                },
              }
            : value,
        );
    } catch (cause) {
      if (current === generation.current)
        setError(cause instanceof Error ? cause.message : uiText(928));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  async function follow(person: SocialProfile) {
    if (person.followed) {
      setConfirmation({ person, action: "unfollow" });
      return;
    }
    await mutate({ action: "follow", username: person.username });
  }
  async function mutate(action: SocialAction) {
    setBusy(true);
    setError("");
    const current = ++generation.current;
    try {
      const value = await requestSocial(action);
      if (current === generation.current) {
        setConfirmation(undefined);
        setFeed(value);
        if (list) await loadList(list.kind, list.owner);
      }
    } catch (cause) {
      if (current === generation.current)
        setError(cause instanceof Error ? cause.message : uiText(929));
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  const person = feed?.profile;
  const ownProfile = readStoredProfile();
  const ownCard = feed
    ? {
        ...feed.self,
        name: ownProfile.name?.trim() || nameFallback || feed.self.name,
        photoUrl: profileAvatarSource(ownProfile.photoUrl),
        cover: profileCover(ownProfile.cover),
      }
    : undefined;
  const confirmationPanel = confirmation && (
    <section className="social-confirm" role="alertdialog" aria-label={uiText(949)}>
      <p>
        {confirmation.action === "unfollow" ? uiText(1918) : uiText(1919)} @
        {confirmation.person.username}?
      </p>
      <button
        type="button"
        className="secondary-button"
        disabled={busy}
        onClick={() => setConfirmation(undefined)}
      >
        {uiText(155)}
      </button>
      <button
        type="button"
        className="primary-button"
        disabled={busy}
        onClick={() =>
          void mutate({ action: confirmation.action, username: confirmation.person.username })
        }
      >
        {confirmation.action === "unfollow" ? uiText(1918) : uiText(1920)}
      </button>
    </section>
  );
  if (person && feed && !list && !sharing)
    return (
      <ProfileVisitDialog
        person={person}
        onClose={() => {
          setConfirmation(undefined);
          close();
        }}
        {...(!initialUsername || origin
          ? {
              onBack: () => {
                setConfirmation(undefined);
                if (origin) {
                  const from = origin;
                  setOrigin(undefined);
                  void loadList(from.kind, from.owner);
                } else void load();
              },
            }
          : {})}
      >
        {" "}
        <section className="social-profile" aria-label={uiText(1916, [person.username])}>
          <div className="social-visit-cover">
            <ProfileCoverArt theme={profileCover(person.cover)} />
          </div>
          <div className="social-visit-avatar">
            <img src={person.photoUrl} width="140" height="140" alt={uiText(1910, [person.name])} />
            {person.details && <ProfileLevelBadge level={person.details.level} />}
          </div>
          <div className="social-profile-name">
            <h3>{person.name}</h3>{" "}
            <div className="social-profile-streaks" aria-label={uiText(919)}>
              {person.details?.updatedAt !== undefined &&
                openedAt - person.details.updatedAt < 86_400_000 && (
                  <ProfileStreakValues streaks={person.details.streaks} />
                )}
            </div>
          </div>
          <ProfileLabels username={person.username} creks={person.username === "oliver644"} />
          <p>@{person.username}</p>{" "}
          <div className="social-profile-counts">
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadList("followers", person.username)}
            >
              {person.followers} {uiText(916)}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadList("following", person.username)}
            >
              {person.following} {uiText(918)}
            </button>
          </div>
          {!person.blocked &&
            (person.achievements !== undefined ? (
              <AchievementCollection
                ids={person.achievements}
                dates={person.achievementDates}
                favorites={person.achievementFavorites ?? []}
                ownerName={person.name}
                compact
              />
            ) : (
              <p>{uiText(2837)}</p>
            ))}
          {!person.blocked && !!person.cardFavorites?.length && (
            <PublicProfileCards person={person} />
          )}
          <nav className="social-profile-networks" aria-label={uiText(913)}>
            <ProfileNetworks links={person.details?.socialLinks ?? []} />
          </nav>
          {person.followsYou && <p>{uiText(924)}</p>}
          {person.blocked && <p role="status">{uiText(2830)}</p>}
          {person.username !== feed.self.username && !person.blocked && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => void follow(person)}
            >
              <FriendIcon />
              {person.followed ? uiText(918) : person.followsYou ? uiText(1917) : uiText(911)}
            </button>
          )}
          {person.username !== feed.self.username && (
            <ProfileSafety key={person.username} person={person} onChange={setFeed} />
          )}
        </section>
        {error && <p role="alert">{uiText(error)}</p>}
        {busy && <HelenaLoading label={uiText(940)} compact />}
        {confirmationPanel}
      </ProfileVisitDialog>
    );
  return (
    <dialog
      ref={dialog}
      className="profile-editor social-directory"
      data-inspecting={!!person && !list}
      aria-labelledby="social-directory-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id="social-directory-title">
          {sharing ? uiText(903) : initialUsername ? uiText(1916, [initialUsername]) : uiText(1913)}
        </h2>
        <button type="button" className="icon-button" aria-label={uiText(930)} onClick={close}>
          <PaperCloseIcon />
        </button>
      </header>
      {sharing && feed ? (
        <>
          <button type="button" className="secondary-button" onClick={() => setSharing(false)}>
            <PaperArrow back />
            {uiText(931)}
          </button>
          {ownCard && (
            <ProfileShareCard
              person={ownCard}
              featured={(
                ownProfile.achievementFavorites ??
                feed.self.achievementFavorites ??
                []
              ).filter((id) => !feed.self.achievements || feed.self.achievements.includes(id))}
            />
          )}
        </>
      ) : (
        <>
          {!initialUsername && (
            <>
              <nav className="social-directory-actions" aria-label={uiText(932)}>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!contacts || !feed}
                  onClick={() => void chooseContact()}
                >
                  <img
                    className="profile-friend-icon"
                    src="/navigation-icons/paper/profile-contacts.svg"
                    width="24"
                    height="24"
                    alt=""
                  />
                  {uiText(933)}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    dialog.current?.querySelector<HTMLInputElement>("#social-search")?.focus()
                  }
                >
                  <img
                    className="profile-friend-icon"
                    src="/navigation-icons/paper/profile-search.svg"
                    width="24"
                    height="24"
                    alt=""
                  />
                  {uiText(934)}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!feed}
                  onClick={() => setSharing(true)}
                >
                  {feed && <img src={feed.self.photoUrl} alt="" width="32" height="32" />}
                  <PaperEditorIcon name="share" />
                  {uiText(903)}
                </button>
              </nav>
              {!contacts && <p className="social-support-note">{uiText(935)}</p>}
              {contacts && <p className="social-support-note">{uiText(936)}</p>}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void load();
                }}
              >
                <label htmlFor="social-search">{uiText(937)}</label>
                <div className="social-search-row">
                  <input
                    id="social-search"
                    value={search}
                    maxLength={80}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={uiText(938)}
                    autoComplete="off"
                  />
                  <button type="submit" className="secondary-button" disabled={busy}>
                    {uiText(939)}
                  </button>
                </div>
              </form>
            </>
          )}
          {error && <p role="alert">{uiText(error)}</p>}
          {status && <p role="status">{uiText(status)}</p>}
          {busy && <HelenaLoading label={uiText(940)} compact />}
          {list && feed && (
            <section className="social-connections" aria-label={uiText(941)}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setList(undefined);
                  void load(list.owner === feed.self.username ? undefined : list.owner);
                }}
              >
                <PaperArrow back />
                {uiText(374)}
              </button>
              <nav aria-label={uiText(942)}>
                {(["following", "followers"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className="secondary-button"
                    aria-pressed={list.kind === kind}
                    disabled={busy}
                    onClick={() => void loadList(kind, list.owner)}
                  >
                    {kind === "following" ? uiText(918) : uiText(916)}
                  </button>
                ))}
              </nav>
              {feed.connections?.people.map((item) => (
                <div key={item.username} className="social-connection-row">
                  <Person
                    person={item}
                    onVisit={(username) => {
                      setOrigin(list);
                      void load(username);
                    }}
                  />
                  {item.username !== feed.self.username &&
                    (list.kind === "followers" && list.owner === feed.self.username ? (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setConfirmation({ person: item, action: "remove-follower" })}
                      >
                        {uiText(44)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => void follow(item)}
                      >
                        {item.followed ? uiText(918) : uiText(1914)}
                      </button>
                    ))}
                </div>
              ))}
              {!busy && !feed.connections?.people.length && (
                <p role="status">{list.kind === "followers" ? uiText(1915) : uiText(943)}</p>
              )}
              {feed.connections?.next !== undefined && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void loadList(list.kind, list.owner, feed.connections!.next)}
                >
                  {uiText(944)}
                </button>
              )}
            </section>
          )}
          {!list &&
            feed?.results?.map((item) => (
              <Person
                key={item.username}
                person={item}
                onVisit={(username) => void load(username)}
              />
            ))}
          {feed?.results?.length === 0 && <p>{uiText(945)}</p>}
          {feed && !person && !list && (
            <section aria-label={uiText(946)}>
              <h3>{uiText(946)}</h3>
              {feed.suggestions?.length ? (
                feed.suggestions.map((item) => (
                  <div key={item.username}>
                    <Person person={item} onVisit={(username) => void load(username)} />
                    <small>
                      {item.mutualCount} {uiText(947)}
                    </small>
                  </div>
                ))
              ) : (
                <p>{uiText(948)}</p>
              )}
            </section>
          )}
        </>
      )}
      {confirmationPanel}
      {sharing && error && <p role="alert">{uiText(error)}</p>}
    </dialog>
  );
}

export function SocialVisitListener() {
  useLanguage();

  const [username, setUsername] = useState("");
  useEffect(() => {
    const visit = (event: Event) => {
      const value: unknown = (event as CustomEvent<unknown>).detail;
      if (typeof value === "string" && /^[a-z0-9._]{1,30}$/.test(value)) setUsername(value);
    };
    window.addEventListener(SOCIAL_VISIT, visit);
    return () => window.removeEventListener(SOCIAL_VISIT, visit);
  }, []);
  return username ? (
    <SocialDirectory
      key={username}
      initialUsername={username}
      nameFallback=""
      onClose={() => {
        setUsername("");
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>(".system-updates-trigger")?.focus(),
        );
      }}
    />
  ) : null;
}
