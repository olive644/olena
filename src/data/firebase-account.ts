export async function getFirebaseAccountServices() {
  const apiKey = import.meta.env["VITE_FIREBASE_API_KEY"];
  const authDomain = import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"];
  const projectId = import.meta.env["VITE_FIREBASE_PROJECT_ID"];
  const databaseURL =
    import.meta.env["VITE_FIREBASE_DATABASE_URL"] ??
    (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined);
  if (!apiKey || !authDomain || !projectId || !databaseURL) throw new Error("setup");

  const [appApi, authApi] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app =
    appApi.getApps().find((item) => item.name === "helena-account") ??
    appApi.initializeApp({ apiKey, authDomain, projectId, databaseURL }, "helena-account");
  const auth = authApi.getAuth(app);
  // Resolve um retorno de signInWithRedirect ANTES de mexer na persistencia:
  // trocar a persistencia (abaixo) pode fazer o SDK perder o rastro do login
  // pendente se isso acontecer antes de getRedirectResult ser lido, fazendo a
  // pessoa "voltar" pro login mesmo depois de escolher a conta no Google.
  const redirectResult = await authApi.getRedirectResult(auth).catch(() => null);
  await authApi.setPersistence(auth, authApi.browserLocalPersistence);
  return {
    auth,
    authApi,
    databaseURL,
    redirectResult,
  };
}
