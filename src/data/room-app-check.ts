let tokenProvider: Promise<() => Promise<string>> | undefined;
export async function roomAppCheckToken(): Promise<string | undefined> {
  const siteKey = import.meta.env["VITE_FIREBASE_APPCHECK_SITE_KEY"] as string | undefined;
  if (!siteKey) return undefined;
  tokenProvider ??= Promise.all([import("firebase/app"), import("firebase/app-check")])
    .then(([app, check]) => {
      const instance = app.initializeApp(
        {
          apiKey: import.meta.env["VITE_FIREBASE_API_KEY"],
          appId: import.meta.env["VITE_FIREBASE_APP_ID"],
          projectId: "appstudyoli",
        },
        "helena-room",
      );
      const appCheck = check.initializeAppCheck(instance, {
        provider: new check.ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
      return async () => (await check.getToken(appCheck)).token;
    })
    .catch((error: unknown) => {
      tokenProvider = undefined;
      throw error;
    });
  return (await tokenProvider)();
}
