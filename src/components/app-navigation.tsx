import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import {
  lazy,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { MobileMenuContext } from "./mobile-menu-context";
import { useTheme } from "../hooks/use-theme";
import { type StoredProfile } from "../hooks/use-stored-profile";
import { NavigationIcon, type NavigationIconName } from "./navigation-icon";
import { PROFILE_AVATARS } from "../domain/profile-avatars";
const SystemUpdates = lazy(() =>
  import("./system-updates").then((module) => ({ default: module.SystemUpdates })),
);

export type AppView =
  | "today"
  | "planner"
  | "focus"
  | "notes"
  | "lesson-builder"
  | "learn"
  | "room"
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

export function ProfileChoices({
  onChoose,
  selectedPhotoUrl,
}: {
  onChoose: (profile: StoredProfile) => void;
  selectedPhotoUrl?: string;
}) {
  useLanguage();

  return (
    <section className="profile-picker">
      <div className="profile-picker__heading">
        <strong>{uiText(112)}</strong>
      </div>
      <div className="profile-picker__options">
        {PROFILE_AVATARS.map((avatar) => (
          <button
            type="button"
            aria-pressed={selectedPhotoUrl ? selectedPhotoUrl === avatar.photoUrl : undefined}
            onClick={(event) => {
              onChoose(avatar);
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
  );
}

const NAVIGATION_SECTIONS: readonly { label: string; items: readonly NavigationItem[] }[] =
  localizeLabels(() => [
    {
      label: uiText(113),
      items: [
        { view: "today", label: uiText(114), mobileLabel: uiText(115), icon: "today" },
        { view: "planner", label: uiText(1550), icon: "planner" },
        { view: "focus", label: uiText(99), icon: "focus" },
        { view: "learn", label: uiText(101), mobileLabel: uiText(101), icon: "gamepad" },
        { view: "room", label: uiText(465), icon: "room" },
      ],
    },
    {
      label: uiText(1610),
      items: [
        { view: "library", label: uiText(1311), icon: "library" },
        { view: "notes", label: uiText(652), mobileLabel: uiText(652), icon: "notes" },
      ],
    },
  ]);

const MOBILE_ITEMS: readonly NavigationItem[] = localizeLabels(() => [
  { view: "today", label: uiText(114), mobileLabel: uiText(115), icon: "today" },
  { view: "planner", label: uiText(1550), icon: "planner" },
  { view: "learn", label: uiText(101), mobileLabel: uiText(101), icon: "gamepad" },
  { view: "focus", label: uiText(99), icon: "focus" },
]);

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
  useLanguage();

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
  useLanguage();

  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? uiText(1611) : uiText(1612);
  return (
    <button
      className="theme-toggle"
      type="button"
      data-theme={theme}
      onClick={toggleTheme}
      aria-label={uiText(1613, [label])}
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
  useLanguage();

  const [expanded, setExpanded] = useState(false);

  return (
    <aside className={expanded ? "sidebar sidebar--expanded" : "sidebar"}>
      <div className="sidebar__top">
        <button
          className="sidebar__toggle"
          type="button"
          aria-label={expanded ? uiText(1614) : uiText(1615)}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        {expanded && (
          <div className="sidebar__brand" aria-label={uiText(116)}>
            <strong>
              {uiText(117)}
              <span>{uiText(118)}</span>
            </strong>
          </div>
        )}
      </div>
      <nav className="sidebar__nav" aria-label={uiText(119)}>
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
        <section className="nav-section sidebar__profile" aria-label={uiText(120)}>
          <NavigationButton
            item={{ view: "profile", label: uiText(120), icon: "profile" }}
            active={view === "profile"}
            onSelect={() => onNavigate("profile")}
          />
        </section>
      </nav>
    </aside>
  );
}

export function MobileNavigation({ view, onNavigate }: NavigationProps) {
  useLanguage();

  const { open: moreOpen, setOpen: setMoreOpen } = useContext(MobileMenuContext);
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
            aria-label={uiText(121)}
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
                  {uiText(117)}
                  <span>{uiText(118)}</span>
                </span>
                <h2 id="mobile-more-title">{uiText(122)}</h2>
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
              aria-label={uiText(123)}
              onClick={() => setMoreOpen(false)}
            >
              <span aria-hidden="true">‹</span>
            </button>
          </section>
        </div>
      )}

      <nav className="mobile-nav" aria-label={uiText(124)}>
        {MOBILE_ITEMS.map((item) => {
          const active = view === item.view;
          return (
            <button
              className={["mobile-nav__item", active ? "mobile-nav__item--active" : ""]
                .filter(Boolean)
                .join(" ")}
              type="button"
              onClick={() => navigate(item.view)}
              aria-current={active ? "page" : undefined}
              key={item.view}
            >
              <span className="mobile-nav__icon">
                <NavigationIcon name={item.icon} />
              </span>
              <span>{item.mobileLabel ?? item.label}</span>
            </button>
          );
        })}
        <button
          className={
            view === "profile"
              ? "mobile-nav__item mobile-nav__profile mobile-nav__item--active"
              : "mobile-nav__item mobile-nav__profile"
          }
          type="button"
          aria-label={uiText(120)}
          aria-current={view === "profile" ? "page" : undefined}
          onClick={() => navigate("profile")}
        >
          <span className="mobile-nav__icon">
            <NavigationIcon name="profile" profileActive={view === "profile"} />
          </span>
          <span>{uiText(120)}</span>
        </button>
      </nav>
    </>
  );
}

export function PageHeader({
  showUpdates = true,
  leadingAction,
}: {
  showUpdates?: boolean;
  leadingAction?: ReactNode;
}) {
  useLanguage();

  useTheme();
  const { open: moreOpen, setOpen: setMoreOpen } = useContext(MobileMenuContext);

  return (
    <header className="page-header">
      <button
        className="mobile-more-trigger paper-menu"
        type="button"
        aria-label={uiText(122)}
        aria-expanded={moreOpen}
        aria-controls="mobile-more-panel"
        data-open={moreOpen}
        onClick={() => setMoreOpen((open) => !open)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <div className="page-header__actions">
        {
          <Suspense fallback={null}>
            <SystemUpdates hideBell={!showUpdates} />
          </Suspense>
        }
        {leadingAction}
      </div>
    </header>
  );
}
