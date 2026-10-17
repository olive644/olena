import { useEffect, useRef, useState } from "react";
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

function Person({ person, onVisit }: { person: SocialProfile; onVisit(username: string): void }) {
  return (
    <button
      type="button"
      className="social-person"
      aria-label={`Visitar perfil de @${person.username}`}
      onClick={() => onVisit(person.username)}
    >
      <img src={person.photoUrl} alt="" width="44" height="44" />
      <span>
        <strong title={person.name}>{person.name}</strong>
        <small title={`@${person.username}`}>@{person.username}</small>
        {person.followsYou && <small className="social-person-relation">Segue você</small>}
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
        setStatus(
          "Nome selecionado. Toque Buscar para procurar perfis que compartilham esse nome.",
        );
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setError("Não foi possível abrir contatos. Use a busca por nome ou @.");
    }
  }
  const generation = useRef(0);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, []);
  function close() {
    dialog.current?.close();
    onClose();
  }
  async function load(username?: string) {
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
        setError(cause instanceof Error ? cause.message : "Não foi possível consultar amigos.");
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
          setError(cause instanceof Error ? cause.message : "Não foi possível consultar amigos.");
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
        setError(cause instanceof Error ? cause.message : "Não foi possível abrir a lista.");
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
        setError(cause instanceof Error ? cause.message : "Não foi possível alterar a conexão.");
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
  return (
    <dialog
      ref={dialog}
      className="profile-editor social-directory"
      aria-labelledby="social-directory-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id="social-directory-title">
          {sharing ? "Compartilhar perfil" : "Encontre seus amigos"}
        </h2>
        <button type="button" className="icon-button" aria-label="Fechar amigos" onClick={close}>
          <PaperCloseIcon />
        </button>
      </header>
      {sharing && feed ? (
        <>
          <button type="button" className="secondary-button" onClick={() => setSharing(false)}>
            <PaperArrow back />
            Voltar para amigos
          </button>
          {ownCard && <ProfileShareCard person={ownCard} />}
        </>
      ) : (
        <>
          <nav className="social-directory-actions" aria-label="Encontrar amigos">
            <button
              type="button"
              className="secondary-button"
              disabled={!contacts || !feed}
              onClick={() => void chooseContact()}
            >
              <svg className="profile-friend-icon" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M9 5h30l5 5v34H9Z" fill="#B88C13" />
                <path d="M7 2h30l5 5v34H7Z" fill="#FACC15" />
                <path d="M35 2h4v39h-4ZM2 10h10v4H2Zm0 12h10v4H2Zm0 12h10v4H2Z" fill="#FFF9EF" />
                <path d="m21 8 8 2 3 7-6 5-8-3Zm-4 17h14l4 11H13Z" fill="#7C3AED" />
              </svg>
              Escolher nos contatos
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                dialog.current?.querySelector<HTMLInputElement>("#social-search")?.focus()
              }
            >
              <svg className="profile-friend-icon" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#0B5C66"
                  fillRule="evenodd"
                  d="m15 3 14 3 8 12-5 14-15 5L4 28 2 14Zm1 7-7 7 1 8 9 5 9-3 3-9-5-7Z"
                />
                <path fill="#62CED0" d="m15 1 14 3 8 12-6 1-6-8-10-2-7 7 1 11-5 1-2-14Z" />
                <path fill="#EF7B72" d="m31 29 6-1 11 14-6 5-13-13Z" />
                <path fill="#FFB2A3" d="m31 29 6-1 11 14-5-1Z" />
              </svg>
              Buscar por nome
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!feed}
              onClick={() => setSharing(true)}
            >
              {feed && <img src={feed.self.photoUrl} alt="" width="32" height="32" />}
              <PaperEditorIcon name="share" />
              Compartilhar perfil
            </button>
          </nav>
          {!contacts && (
            <p className="social-support-note">
              Este navegador não oferece seleção de contatos. Use a busca ou compartilhe seu perfil.
            </p>
          )}
          {contacts && (
            <p className="social-support-note">
              Somente o nome do contato escolhido é preenchido aqui. Não lemos telefones ou e-mails.
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void load();
            }}
          >
            <label htmlFor="social-search">Buscar por nome ou @</label>
            <div className="social-search-row">
              <input
                id="social-search"
                value={search}
                maxLength={80}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome ou nome de usuário"
                autoComplete="off"
              />
              <button type="submit" className="secondary-button" disabled={busy}>
                Buscar
              </button>
            </div>
          </form>
          {error && <p role="alert">{error}</p>}
          {status && <p role="status">{status}</p>}
          {busy && <HelenaLoading label="Consultando amigos" compact />}
          {list && feed && (
            <section className="social-connections" aria-label="Lista de conexões">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setList(undefined);
                  void load(list.owner === feed.self.username ? undefined : list.owner);
                }}
              >
                <PaperArrow back />
                Voltar
              </button>
              <nav aria-label="Seguidores e seguindo">
                {(["following", "followers"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className="secondary-button"
                    aria-pressed={list.kind === kind}
                    disabled={busy}
                    onClick={() => void loadList(kind, list.owner)}
                  >
                    {kind === "following" ? "Seguindo" : "Seguidores"}
                  </button>
                ))}
              </nav>
              {feed.connections?.people.map((item) => (
                <div key={item.username} className="social-connection-row">
                  <Person person={item} onVisit={(username) => void load(username)} />
                  {item.username !== feed.self.username &&
                    (list.kind === "followers" && list.owner === feed.self.username ? (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => setConfirmation({ person: item, action: "remove-follower" })}
                      >
                        Remover
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => void follow(item)}
                      >
                        {item.followed ? "Seguindo" : "Seguir"}
                      </button>
                    ))}
                </div>
              ))}
              {!busy && !feed.connections?.people.length && (
                <p role="status">
                  {list.kind === "followers"
                    ? "Nenhum seguidor ainda."
                    : "Ainda não segue ninguém."}
                </p>
              )}
              {feed.connections?.next !== undefined && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void loadList(list.kind, list.owner, feed.connections!.next)}
                >
                  Ver mais
                </button>
              )}
            </section>
          )}
          {person && !list && (
            <section className="social-profile" aria-label={`Perfil de @${person.username}`}>
              <div className="social-visit-cover">
                <ProfileCoverArt theme={profileCover(person.cover)} />
              </div>
              <img
                src={person.photoUrl}
                width="104"
                height="104"
                alt={`Avatar de ${person.name}`}
              />
              <h3>{person.name}</h3>
              <ProfileLabels username={person.username} creks={person.username === "oliver644"} />
              <p>@{person.username}</p>
              <div className="social-profile-counts">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void loadList("followers", person.username)}
                >
                  {person.followers} Seguidores
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void loadList("following", person.username)}
                >
                  {person.following} Seguindo
                </button>
              </div>
              {person.followsYou && <p>Segue você</p>}
              {person.username !== feed.self.username && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => void follow(person)}
                >
                  <FriendIcon />
                  {person.followed
                    ? "Seguindo"
                    : person.followsYou
                      ? "Seguir de volta"
                      : "Adicionar amigo"}
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
          {feed?.results?.length === 0 && <p>Nenhuma pessoa encontrada com esse início de @.</p>}
          {feed && !person && !list && (
            <section aria-label="Sugestões de amigos">
              <h3>Sugestões de amigos</h3>
              {feed.suggestions?.length ? (
                feed.suggestions.map((item) => (
                  <div key={item.username}>
                    <Person person={item} onVisit={(username) => void load(username)} />
                    <small>{item.mutualCount} conexão em comum</small>
                  </div>
                ))
              ) : (
                <p>As sugestões aparecem quando suas conexões seguirem outras pessoas.</p>
              )}
            </section>
          )}
        </>
      )}
      {confirmation && (
        <section
          className="social-confirm"
          role="alertdialog"
          aria-label="Confirmar alteração da conexão"
        >
          <p>
            {confirmation.action === "unfollow"
              ? "Deixar de seguir"
              : "Remover dos seus seguidores"}{" "}
            @{confirmation.person.username}?
          </p>
          <button
            type="button"
            className="secondary-button"
            disabled={busy}
            onClick={() => setConfirmation(undefined)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={busy}
            onClick={() =>
              void mutate({ action: confirmation.action, username: confirmation.person.username })
            }
          >
            {confirmation.action === "unfollow" ? "Deixar de seguir" : "Remover seguidor"}
          </button>
        </section>
      )}
      {sharing && error && <p role="alert">{error}</p>}
    </dialog>
  );
}

export function SocialVisitListener() {
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
