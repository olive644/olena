import {
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MobileMenuContext } from "./mobile-menu-context";
import { useTheme } from "../hooks/use-theme";
import {
  SYNCED_STORAGE_APPLIED_EVENT,
  SYNCED_STORAGE_EVENT,
  writeSyncedStorage,
} from "../data/synced-storage";
import { AppearanceToggle } from "./appearance-picker";
import { NavigationIcon, type NavigationIconName } from "./navigation-icon";

export type AppView =
  | "today"
  | "planner"
  | "focus"
  | "habits"
  | "notes"
  | "lesson-builder"
  | "learn"
  | "library"
  | "activity-bank"
  | "profile";

type NavigationProps = {
  view: AppView;
  onNavigate: (view: AppView) => void;
};

type NavigationItem = {
  view: AppView;
  label: string;
  mobileLabel?: string;
  icon: NavigationIconName;
};

type StoredProfile = { name?: string; photoUrl?: string };

const PROFILE_AVATARS = [
  { name: "Poliana", photoUrl: "/profile-avatars/poliana.webp" },
  { name: "Oliver", photoUrl: "/profile-avatars/oliver.webp" },
  { name: "Andreyna", photoUrl: "/profile-avatars/andreyna.webp" },
  { name: "Jairo", photoUrl: "/profile-avatars/jairo.webp" },
  { name: "Helena", photoUrl: "/profile-avatars/helena.webp" },
  { name: "Alice", photoUrl: "/profile-avatars/alice.svg" },
  { name: "Soso Estrelinha", photoUrl: "/profile-avatars/soso-estrelinha.svg" },
  { name: "Nicolas", photoUrl: "/profile-avatars/nicolas.svg" },
  { name: "Guilherme", photoUrl: "/profile-avatars/guilherme.svg" },
  { name: "Erick", photoUrl: "/profile-avatars/erick.svg" },
  { name: "Miau", photoUrl: "/profile-avatars/miau.svg" },
  { name: "Luizão", photoUrl: "/profile-avatars/luizao.svg" },
] as const;

function readStoredProfile(): StoredProfile {
  try {
    return JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}") as StoredProfile;
  } catch {
    return {};
  }
}

function useStoredProfile() {
  const [profile, setProfile] = useState(readStoredProfile);
  useEffect(() => {
    const refresh = () => setProfile(readStoredProfile());
    window.addEventListener(SYNCED_STORAGE_EVENT, refresh);
    window.addEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    return () => {
      window.removeEventListener(SYNCED_STORAGE_EVENT, refresh);
      window.removeEventListener(SYNCED_STORAGE_APPLIED_EVENT, refresh);
    };
  }, []);
  return [profile, setProfile] as const;
}

const NAVIGATION_SECTIONS: readonly { label: string; items: readonly NavigationItem[] }[] = [
  {
    label: "Área do aluno",
    items: [
      { view: "today", label: "Espaço do aluno", mobileLabel: "Espaço", icon: "today" },
      { view: "planner", label: "Agenda", icon: "planner" },
      { view: "focus", label: "Foco", icon: "focus" },
      { view: "learn", label: "Praticar", mobileLabel: "Praticar", icon: "learn" },
      { view: "profile", label: "Perfil", icon: "profile" },
    ],
  },
  {
    label: "Meus materiais",
    items: [
      { view: "library", label: "Biblioteca", icon: "library" },
      { view: "notes", label: "Cadernos", mobileLabel: "Cadernos", icon: "notes" },
      { view: "habits", label: "Hábitos", icon: "habits" },
    ],
  },
  {
    label: "Área do professor",
    items: [
      { view: "lesson-builder", label: "Planos de aula", icon: "lesson" },
      { view: "activity-bank", label: "Banco de atividades", icon: "activity-bank" },
    ],
  },
];

const MOBILE_ITEMS: readonly NavigationItem[] = [
  { view: "today", label: "Espaço do aluno", mobileLabel: "Espaço", icon: "today" },
  { view: "planner", label: "Agenda", icon: "planner" },
  { view: "learn", label: "Praticar", mobileLabel: "Praticar", icon: "learn" },
  { view: "focus", label: "Foco", icon: "focus" },
];

const MORE_ITEMS = NAVIGATION_SECTIONS.flatMap((section) => section.items).filter(
  (item) =>
    item.view !== "profile" && !MOBILE_ITEMS.some((mobileItem) => mobileItem.view === item.view),
);

function NavigationButton({
  item,
  active,
  onSelect,
}: {
  item: NavigationItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={active ? "nav-item nav-item--active" : "nav-item"}
      type="button"
      onClick={onSelect}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
    >
      <NavigationIcon
        name={item.icon}
        profileActive={item.view === "profile" && active}
        profileAdaptive
      />
      <span>{item.label}</span>
    </button>
  );
}

export function ThemeToggle({ showLabel }: { showLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? "Tema escuro" : "Tema claro";
  return (
    <button
      className="theme-toggle"
      type="button"
      data-theme={theme}
      onClick={toggleTheme}
      aria-label={`${label}. Toque para trocar de tema.`}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__celestial theme-toggle__moon">
          <NavigationIcon name="theme-dark" />
        </span>
        <span className="theme-toggle__celestial theme-toggle__sun">
          <NavigationIcon name="theme-light" />
        </span>
        <span className="theme-toggle__thumb" />
      </span>
      {showLabel && <span>{label}</span>}
    </button>
  );
}

export function Sidebar({ view, onNavigate }: NavigationProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className={expanded ? "sidebar sidebar--expanded" : "sidebar"}>
      <div className="sidebar__top">
        <button
          className="sidebar__toggle"
          type="button"
          aria-label={expanded ? "Recolher menu lateral" : "Expandir menu lateral"}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        {expanded && (
          <div className="sidebar__brand" aria-label="OliStudy">
            <strong>
              Oli<span>Study</span>
            </strong>
          </div>
        )}
      </div>
      <nav className="sidebar__nav" aria-label="Navegação principal">
        {NAVIGATION_SECTIONS.map((section) => (
          <section className="nav-section" aria-label={section.label} key={section.label}>
            <span className="nav-section__label">{section.label}</span>
            {section.items.map((item) => (
              <NavigationButton
                item={item}
                active={view === item.view}
                onSelect={() => onNavigate(item.view)}
                key={item.view}
              />
            ))}
          </section>
        ))}
      </nav>
    </aside>
  );
}

export function MobileNavigation({ view, onNavigate }: NavigationProps) {
  const { open: moreOpen, setOpen: setMoreOpen } = useContext(MobileMenuContext);
  const [profile] = useStoredProfile();
  const moreActive = MORE_ITEMS.some((item) => item.view === view);
  const [dragX, setDragX] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dragStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [moreOpen, setMoreOpen]);

  function navigate(itemView: AppView) {
    onNavigate(itemView);
    setMoreOpen(false);
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, summary")) return;
    dragStartX.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function drag(event: ReactPointerEvent<HTMLElement>) {
    if (dragStartX.current === null) return;
    setDragX(Math.min(0, event.clientX - dragStartX.current));
  }

  function finishDrag() {
    dragStartX.current = null;
    if (dragX < -80) setMoreOpen(false);
    setDragX(0);
  }

  return (
    <>
      {moreOpen && (
        <div className="mobile-more-layer">
          <button
            className="mobile-more-backdrop"
            type="button"
            aria-label="Fechar mais opções"
            onClick={() => setMoreOpen(false)}
          />
          <section
            id="mobile-more-panel"
            className={dragX === 0 ? "mobile-more-sheet" : "mobile-more-sheet is-dragging"}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            style={{ transform: `translateX(${dragX}px)` }}
            onPointerDown={startDrag}
            onPointerMove={drag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <header>
              <div>
                <span>
                  Oli<span>Study</span>
                </span>
                <h2 id="mobile-more-title">Mais ferramentas</h2>
              </div>
            </header>
            <div className="mobile-more-grid">
              {MORE_ITEMS.map((item) => (
                <button
                  className={view === item.view ? "more-item more-item--active" : "more-item"}
                  type="button"
                  onClick={() => navigate(item.view)}
                  aria-current={view === item.view ? "page" : undefined}
                  key={item.view}
                >
                  <NavigationIcon name={item.icon} />
                  <span>{item.mobileLabel ?? item.label}</span>
                </button>
              ))}
            </div>
            <button
              ref={closeButtonRef}
              className="mobile-more-edge-close"
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMoreOpen(false)}
            >
              <span aria-hidden="true">‹</span>
            </button>
          </section>
        </div>
      )}

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {MOBILE_ITEMS.map((item) => {
          const active = view === item.view;
          const featured = item.view === "learn";
          return (
            <button
              className={[
                "mobile-nav__item",
                active ? "mobile-nav__item--active" : "",
                featured ? "mobile-nav__item--featured" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => navigate(item.view)}
              aria-current={active ? "page" : undefined}
              key={item.view}
            >
              <span className="mobile-nav__icon">
                {item.view === "learn" ? (
                  <NavigationIcon name={item.icon} paperVariant={active ? "escuro" : "claro"} />
                ) : (
                  <NavigationIcon name={item.icon} />
                )}
              </span>
              <span>{item.mobileLabel ?? item.label}</span>
            </button>
          );
        })}
        <AppearanceToggle variant="nav" />
      </nav>

      <div className="mobile-top-bar">
        <button
          className={
            moreOpen || moreActive ? "mobile-more-trigger is-active" : "mobile-more-trigger"
          }
          type="button"
          aria-label="Mais ferramentas"
          aria-expanded={moreOpen}
          aria-controls="mobile-more-panel"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <NavigationIcon name="more" />
        </button>
        <button
          className="mobile-top-bar__profile"
          type="button"
          aria-label={profile.name ? `Perfil de ${profile.name}` : "Escolher perfil"}
          onClick={() => setMoreOpen((open) => !open)}
        >
          <img
            src={profile.photoUrl ?? "/profile-avatars/helena.webp"}
            alt=""
            width="34"
            height="34"
          />
        </button>
      </div>
    </>
  );
}

export function PageHeader() {
  const [profile, setProfile] = useStoredProfile();

  function chooseProfile(nextProfile: StoredProfile) {
    setProfile(nextProfile);
    try {
      writeSyncedStorage("helena.profile.v1", JSON.stringify(nextProfile));
    } catch {
      /* A escolha continua visível quando o armazenamento não está disponível. */
    }
  }

  return (
    <header className="page-header">
      <div className="page-header__actions">
        <div className="page-header__theme">
          <AppearanceToggle />
        </div>
        <details className="profile-menu">
          <summary
            className="user-profile"
            aria-label={profile.name ? `Perfil de ${profile.name}` : "Escolher perfil"}
          >
            <img
              src={profile.photoUrl ?? "/profile-avatars/helena.webp"}
              alt=""
              width="44"
              height="44"
            />
          </summary>
          <section className="profile-picker">
            <div className="profile-picker__heading">
              <strong>Quem está estudando?</strong>
            </div>
            <div className="profile-picker__options">
              {PROFILE_AVATARS.map((avatar) => (
                <button
                  type="button"
                  onClick={(event) => {
                    chooseProfile(avatar);
                    event.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                  key={avatar.name}
                >
                  <img src={avatar.photoUrl} alt="" width="72" height="72" />
                  <span>{avatar.name}</span>
                </button>
              ))}
            </div>
          </section>
        </details>
      </div>
    </header>
  );
}
