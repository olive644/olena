import { uiText, useLanguage } from "./i18n/runtime";
import { lazy, Suspense, useState, useEffect } from "react";
import { useAppView } from "./hooks/use-app-view";
import { MobileNavigation, Sidebar } from "./components/app-navigation";
import { PullToRefresh } from "./components/pull-to-refresh";
import { HelenaLoading } from "./components/helena-loading";
import { MobileMenuContext } from "./components/mobile-menu-context";
import { isGuestSession, requiresLogin } from "./domain/guest-session";
import { readLocalRoomCodeFromUrl, readLocalRoomProjectorCodeFromUrl } from "./domain/room-code";
import { useWorkspace } from "./hooks/use-workspace";
import { useCloudSync, type CloudSyncState } from "./hooks/use-cloud-sync";
import { TodayView } from "./views/today-view";
import { useProfileHandle } from "./hooks/use-profile-handle";
import { useAccountDevice } from "./hooks/use-account-device";
import { readPendingOnboardingConfiguration } from "./data/onboarding-client";
import { accountHasProgress } from "./data/account-progress";
import { ACCOUNT_OWNER_KEY } from "./data/personal-data";
import { writeSyncedStorage } from "./data/synced-storage";
import { isReturningVisitor } from "./data/returning-visitor";

const LearnView = lazy(() => import("./views/learn-view"));
const AccountVerification = lazy(() =>
  import("./components/account-access-panel").then((module) => ({
    default: module.AccountAccessPanel,
  })),
);
const AchievementAnnouncer = lazy(() =>
  import("./components/achievement-announcer").then((module) => ({
    default: module.AchievementAnnouncer,
  })),
);
const NotificationsView = lazy(() =>
  import("./components/system-updates").then((module) => ({ default: module.SystemUpdates })),
);
const SocialActivityPublisher = lazy(() =>
  import("./components/social-activity-publisher").then((module) => ({
    default: module.SocialActivityPublisher,
  })),
);
const PrivacyNotice = lazy(() =>
  import("./components/privacy-notice").then((module) => ({ default: module.PrivacyNotice })),
);
const AgendaReminders = lazy(() =>
  import("./components/agenda-reminders").then((module) => ({ default: module.AgendaReminders })),
);
const HelenaChat = lazy(() =>
  import("./components/helena-chat").then((module) => ({ default: module.HelenaChat })),
);
const RoomView = lazy(() => import("./views/room-view"));
const OnboardingView = lazy(() => import("./views/onboarding-view"));
const NotFoundView = lazy(() => import("./views/not-found-view"));
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
    const record = JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "null");
    const owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
    return (
      record?.completed === true &&
      (!owner || !record.configurationOwner || record.configurationOwner === owner)
    );
  } catch {
    return false;
  }
}

// Conta que já passou pelo onboarding ou que já tem progresso. A marca de conclusão é só mais uma
// chave sincronizada e pode faltar (aparelho novo, nuvem sem ela); o progresso real não deixa a
// pessoa voltar às perguntas.
function hasReturningAccountData() {
  return hasCompletedOnboarding() || accountHasProgress(localStorage);
}

function AppContent({ cloud, signedOut = false }: { cloud: CloudSyncState; signedOut?: boolean }) {
  useLanguage();

  const [moreOpen, setMoreOpen] = useState(false);
  const [libraryMaterialId, setLibraryMaterialId] = useState(
    () => new URLSearchParams(window.location.search).get("material")?.slice(0, 160) ?? "",
  );
  const [focusMaterialId, setFocusMaterialId] = useState("");
  const [projectorCode] = useState(() => readLocalRoomProjectorCodeFromUrl(window.location.href));
  const [joinCode] = useState(
    () => projectorCode ?? readLocalRoomCodeFromUrl(window.location.href),
  );
  const [view, setView] = useAppView(joinCode ? "room" : "today");
  useEffect(() => {
    const open = () => setView("notifications");
    window.addEventListener("olena:open-notifications", open);
    return () => window.removeEventListener("olena:open-notifications", open);
  }, [setView]);
  const { workspace, storageFull, dispatch, history, restoreSnapshot } = useWorkspace();
  // Convidado só vale sem conta: quem entrou com Google nunca aparece como Guest.
  const guest = cloud.authenticated !== true && isGuestSession();
  const previewCover =
    import.meta.env.DEV && new URLSearchParams(window.location.search).has("preview-cover");
  // A identidade confirmada fica pronta antes da primeira visita ao Perfil.
  const { handle } = useProfileHandle(cloud.authenticated !== true);
  const [profileName, setProfileName] = useState<string>();
  const [onboarding, setOnboarding] = useState(() => {
    if (cloud.authenticated === true && hasReturningAccountData()) return false;
    if (previewCover) return true;
    if (joinCode) return false;
    if (signedOut) return true;
    const entry = new URLSearchParams(window.location.search);
    if (entry.has("onboarding") || entry.has("login")) return true;
    try {
      return !hasCompletedOnboarding();
    } catch {
      return true;
    }
  });

  const returningAccount = cloud.ready && cloud.authenticated === true && hasReturningAccountData();

  // Conta com progresso e sem a marca: grava a marca, que também vai para a nuvem, para o próximo
  // aparelho não depender de adivinhar.
  useEffect(() => {
    if (!returningAccount || hasCompletedOnboarding()) return;
    const owner = localStorage.getItem(ACCOUNT_OWNER_KEY);
    writeSyncedStorage(
      "helena.onboarding.v1",
      JSON.stringify({
        answers: [],
        completed: true,
        ...(owner ? { configurationOwner: owner } : {}),
      }),
    );
  }, [returningAccount]);

  useEffect(() => {
    if (
      (onboarding && !returningAccount) ||
      !cloud.ready ||
      (!guest && cloud.authenticated !== true)
    )
      return;
    try {
      const raw = localStorage.getItem("helena.onboarding.v1");
      const configuration = readPendingOnboardingConfiguration(
        raw,
        guest ? "guest" : localStorage.getItem(ACCOUNT_OWNER_KEY),
      );
      if (configuration) {
        if (workspace.studyPreferences.onboardingSetupId !== configuration.id)
          dispatch({ type: "onboarding/configured", configuration });
        else
          writeSyncedStorage(
            "helena.onboarding.v1",
            JSON.stringify({ ...JSON.parse(raw!), configurationPending: false }),
          );
      }
    } catch {
      /* A entrada continua utilizável sem acesso ao armazenamento. */
    }
  }, [
    onboarding,
    returningAccount,
    cloud.ready,
    cloud.authenticated,
    guest,
    workspace.studyPreferences.onboardingSetupId,
    dispatch,
  ]);

  if (view === null)
    return (
      <Suspense fallback={<HelenaLoading label={uiText(0)} />}>
        <NotFoundView />
      </Suspense>
    );

  if (onboarding && !returningAccount)
    return (
      <Suspense fallback={<HelenaLoading label={uiText(0)} />}>
        <OnboardingView
          accountLoading={cloud.authenticated === true && !cloud.ready}
          authenticated={cloud.authenticated === true && cloud.ready}
          showCover={
            (previewCover && cloud.authenticated !== true) ||
            // A marca de convidado só dispensa a capa de quem já concluiu o onboarding (o convidado que
            // toca em Entrar dentro do app). Quem a guarda de antes, sem ter concluído, vê a capa.
            (cloud.authenticated !== true &&
              (!isGuestSession() || !hasCompletedOnboarding()) &&
              !new URLSearchParams(window.location.search).has("onboarding") &&
              !new URLSearchParams(window.location.search).has("login"))
          }
          loginOnly={
            !(
              import.meta.env.DEV && new URLSearchParams(window.location.search).has("onboarding")
            ) &&
            ((signedOut && hasCompletedOnboarding()) ||
              (cloud.authenticated !== true && isReturningVisitor()))
          }
          onFinish={(setup) => {
            if (setup) {
              setProfileName(setup.displayName);
              if (setup.configuration)
                dispatch({ type: "onboarding/configured", configuration: setup.configuration });
              else dispatch({ type: "study/preferences-updated", preferences: setup.preferences });
            }
            if (setup || (cloud.authenticated === true && cloud.ready && hasReturningAccountData()))
              setOnboarding(false);
          }}
        />
      </Suspense>
    );

  return (
    <MobileMenuContext.Provider value={{ open: moreOpen, setOpen: setMoreOpen }}>
      <div className="app-shell">
        {(view === "today" || view === "profile" || view === "notifications") && !moreOpen && (
          <PullToRefresh />
        )}
        {cloud.authenticated === true && (
          <Suspense fallback={null}>
            <AccountVerification verificationOnly />
          </Suspense>
        )}
        {cloud.ready && (
          <Suspense fallback={null}>
            <AchievementAnnouncer
              key={cloud.email ?? "guest"}
              workspace={workspace}
              username={
                !guest && cloud.authenticated && cloud.status !== "loading" ? handle.username : ""
              }
              nameFallback={cloud.displayName ?? ""}
            />
          </Suspense>
        )}
        <Suspense fallback={null}>
          <SocialActivityPublisher
            authenticated={cloud.authenticated === true && cloud.status === "synced"}
            savedAt={cloud.lastSyncedAt}
            signature={`${workspace.focusSessions.length}:${workspace.practiceActivities?.length ?? 0}:${workspace.quizAttempts.length}`}
          />
        </Suspense>
        <a className="skip-link" href="#main-content">
          {uiText(1)}
        </a>
        {storageFull && (
          <p className="storage-full-banner" role="alert">
            {uiText(2)}
          </p>
        )}
        {!storageFull && cloud.rejectedKeys && (
          <p className="storage-full-banner" role="status">
            {uiText(3713)}
          </p>
        )}
        <Sidebar view={view} onNavigate={setView} />
        {workspace.events.some((event) => event.reminders?.length) && (
          <Suspense fallback={null}>
            <AgendaReminders
              key={cloud.email ?? "guest"}
              scope={cloud.email ?? "guest"}
              events={workspace.events}
            />
          </Suspense>
        )}
        <Suspense
          fallback={
            <div className="main-content loading-view">
              <HelenaLoading label={uiText(3)} />
            </div>
          }
        >
          {view === "today" && (
            <TodayView workspace={workspace} dispatch={dispatch} onNavigate={setView} />
          )}
          {view === "notifications" && (
            <NotificationsView page workspace={workspace} onBack={() => setView("today")} />
          )}
          {view === "planner" && (
            <PlannerView
              workspace={workspace}
              dispatch={dispatch}
              onNavigate={setView}
              cloud={cloud}
            />
          )}
          {view === "focus" && (
            <FocusView
              workspace={workspace}
              dispatch={dispatch}
              initialMaterialId={focusMaterialId}
              onMaterial={(id) => {
                setLibraryMaterialId(id);
                setView("library");
              }}
            />
          )}
          {view === "notes" && (
            <NotesView workspace={workspace} dispatch={dispatch} cloud={cloud} />
          )}
          {view === "lesson-builder" && <LessonBuilderView onBack={() => setView("today")} />}
          {view === "learn" && <LearnView workspace={workspace} dispatch={dispatch} />}
          {view === "room" && (
            <RoomView
              joinCode={joinCode}
              projectorMode={Boolean(projectorCode)}
              accountName={cloud.displayName}
              guest={guest}
              accountLoading={cloud.enabled && cloud.authenticated === undefined && !cloud.ready}
              requireAccount={cloud.enabled}
              onExit={() => setView("today")}
              onSignIn={() => setOnboarding(true)}
            />
          )}
          {view === "library" && (
            <LibraryView
              workspace={workspace}
              dispatch={dispatch}
              scope={cloud.email ?? "guest"}
              initialMaterialId={libraryMaterialId}
              onFocus={(id) => {
                setFocusMaterialId(id);
                setView("focus");
              }}
              onNotebook={(id, page) => {
                setView("notes");
                const params = new URLSearchParams({ caderno: id });
                if (page) params.set("folha", page);
                window.history.replaceState(null, "", `/cadernos?${params}`);
              }}
            />
          )}
          {view === "activity-bank" && <ActivityBankView onBack={() => setView("today")} />}
          {view === "profile" && (
            <ProfileView
              workspace={workspace}
              dispatch={dispatch}
              cloud={profileName ? { ...cloud, displayName: profileName } : cloud}
              guest={guest}
              onSignIn={() => setOnboarding(true)}
              history={history}
              onRestoreSnapshot={restoreSnapshot}
            />
          )}
        </Suspense>
        <MobileNavigation view={view} onNavigate={setView} />
        {!projectorCode && (
          <Suspense fallback={null}>
            <HelenaChat currentView={view} materials={workspace.materials} />
            {(!cloud.enabled || cloud.authenticated === true || guest) && (
              <PrivacyNotice authenticated={cloud.authenticated === true && !guest} />
            )}
          </Suspense>
        )}
      </div>
    </MobileMenuContext.Provider>
  );
}

export function App() {
  useLanguage();

  // Nunca bloqueia a primeira renderizacao esperando a sincronizacao com a
  // nuvem: isso fazia todo mundo (logado ou nao) esperar o SDK de auth do
  // Firebase baixar e responder antes de ver qualquer coisa. A tela renderiza
  // com os dados locais na hora; quando a sincronizacao resolve, a troca de
  // `key` remonta com os dados corretos (sincronizados ou anonimos).
  const cloud = useCloudSync();
  useAccountDevice(cloud.authenticated === true && cloud.ready, cloud.email);
  return (
    <AppContent
      key={cloud.revision}
      cloud={cloud}
      signedOut={requiresLogin(cloud.enabled, cloud.authenticated, isGuestSession())}
    />
  );
}
