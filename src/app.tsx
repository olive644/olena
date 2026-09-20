import { lazy, Suspense, useState } from "react";
import { MobileNavigation, Sidebar, type AppView } from "./components/app-navigation";
import { HelenaLoading } from "./components/helena-loading";
import { MobileMenuContext } from "./components/mobile-menu-context";
import { readLocalRoomCodeFromUrl, readLocalRoomProjectorCodeFromUrl } from "./domain/room-code";
import { useWorkspace } from "./hooks/use-workspace";
import { useCloudSync } from "./hooks/use-cloud-sync";
import { HabitsView } from "./views/habits-view";
import { TodayView } from "./views/today-view";

const LearnView = lazy(() => import("./views/learn-view"));
const OnboardingView = lazy(() => import("./views/onboarding-view"));
const LibraryView = lazy(() => import("./views/library-view"));
const LessonBuilderView = lazy(() => import("./views/lesson-builder-view"));
const NotesView = lazy(() => import("./views/notes-view"));
const ActivityBankView = lazy(() => import("./views/activity-bank-view"));
const PlannerView = lazy(() =>
  import("./views/planner-view").then((module) => ({ default: module.PlannerView })),
);
const FocusView = lazy(() =>
  import("./views/focus-view").then((module) => ({ default: module.FocusView })),
);
const ProfileView = lazy(() =>
  import("./views/profile-view").then((module) => ({ default: module.ProfileView })),
);

function hasCompletedOnboarding() {
  try {
    return JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "null")?.completed === true;
  } catch {
    return false;
  }
}

function AppContent({ signedOut = false }: { signedOut?: boolean }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [projectorCode] = useState(() => readLocalRoomProjectorCodeFromUrl(window.location.href));
  const [joinCode] = useState(
    () => projectorCode ?? readLocalRoomCodeFromUrl(window.location.href),
  );
  const [view, setView] = useState<AppView>(joinCode ? "learn" : "today");
  const { workspace, dispatch } = useWorkspace();
  const [onboarding, setOnboarding] = useState(() => {
    if (joinCode) return false;
    if (signedOut) return true;
    if (new URLSearchParams(window.location.search).has("onboarding")) return true;
    try {
      return !hasCompletedOnboarding();
    } catch {
      return true;
    }
  });

  if (onboarding)
    return (
      <Suspense fallback={<HelenaLoading label="Preparando sua jornada…" />}>
        <OnboardingView
          loginOnly={signedOut && hasCompletedOnboarding()}
          onFinish={(setup) => {
            if (setup) {
              dispatch({ type: "study/preferences-updated", preferences: setup.preferences });
            }
            setOnboarding(false);
          }}
        />
      </Suspense>
    );

  return (
    <MobileMenuContext.Provider value={{ open: moreOpen, setOpen: setMoreOpen }}>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Ir para o conteúdo
        </a>
        <Sidebar view={view} onNavigate={setView} />
        <Suspense
          fallback={
            <div className="main-content loading-view">
              <HelenaLoading label="Abrindo módulo…" />
            </div>
          }
        >
          {view === "today" && (
            <TodayView workspace={workspace} dispatch={dispatch} onNavigate={setView} />
          )}
          {view === "planner" && <PlannerView workspace={workspace} dispatch={dispatch} />}
          {view === "focus" && <FocusView workspace={workspace} dispatch={dispatch} />}
          {view === "habits" && <HabitsView workspace={workspace} dispatch={dispatch} />}
          {view === "notes" && <NotesView workspace={workspace} dispatch={dispatch} />}
          {view === "lesson-builder" && <LessonBuilderView onBack={() => setView("today")} />}
          {view === "learn" && (
            <LearnView
              workspace={workspace}
              dispatch={dispatch}
              joinCode={joinCode}
              projectorMode={Boolean(projectorCode)}
            />
          )}
          {view === "library" && <LibraryView workspace={workspace} dispatch={dispatch} />}
          {view === "activity-bank" && <ActivityBankView onBack={() => setView("today")} />}
          {view === "profile" && <ProfileView workspace={workspace} dispatch={dispatch} />}
        </Suspense>
        <MobileNavigation view={view} onNavigate={setView} />
      </div>
    </MobileMenuContext.Provider>
  );
}

export function App() {
  // Nunca bloqueia a primeira renderizacao esperando a sincronizacao com a
  // nuvem: isso fazia todo mundo (logado ou nao) esperar o SDK de auth do
  // Firebase baixar e responder antes de ver qualquer coisa. A tela renderiza
  // com os dados locais na hora; quando a sincronizacao resolve, a troca de
  // `key` remonta com os dados corretos (sincronizados ou anonimos).
  const cloud = useCloudSync();
  return (
    <AppContent key={cloud.revision} signedOut={cloud.enabled && cloud.authenticated === false} />
  );
}
