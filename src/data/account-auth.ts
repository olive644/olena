import { PRIVACY_POLICY_VERSION, readPrivacyConsent } from "../domain/privacy-policy";
import type { User, UserCredential } from "firebase/auth";
import { getFirebaseAccountServices } from "./firebase-account";
import { uiText } from "../i18n/runtime";

export type AccountServices = Awaited<ReturnType<typeof getFirebaseAccountServices>>;

export function setAccountLanguage(services: AccountServices): void {
  services.auth.languageCode = document.documentElement.lang.startsWith("en") ? "en" : "pt-BR";
}

export function accountAuthError(cause: unknown): string {
  const code = cause && typeof cause === "object" && "code" in cause ? cause.code : "";
  if (code === "auth/network-request-failed") return uiText(3075);
  if (code === "auth/too-many-requests") return uiText(3076);
  if (code === "auth/operation-not-allowed" || code === "auth/unauthorized-domain")
    return uiText(3077);
  if (
    code === "auth/account-exists-with-different-credential" ||
    code === "auth/email-already-in-use"
  )
    return uiText(3078);
  if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements")
    return uiText(3079);
  return uiText(3080);
}

export async function reauthenticateAccount(
  services: AccountServices,
  user: User,
  password?: string,
): Promise<void> {
  const session = user.getIdTokenResult ? await user.getIdTokenResult(true) : undefined;
  const provider = session?.signInProvider ?? user.providerData?.[0]?.providerId;
  let appleResult: UserCredential | undefined;
  if (provider === "password") {
    if (!user.email || !password) throw new Error("password-required");
    await services.authApi.reauthenticateWithCredential(
      user,
      services.authApi.EmailAuthProvider.credential(user.email, password),
    );
  } else if (provider === "apple.com") {
    appleResult = await services.authApi.reauthenticateWithPopup(
      user,
      new services.authApi.OAuthProvider("apple.com"),
    );
  } else if (provider === "google.com" || (!provider && !user.getIdTokenResult)) {
    await services.authApi.reauthenticateWithPopup(user, new services.authApi.GoogleAuthProvider());
  } else {
    // A validade da autorização vem do servidor, sem confiar no relógio do aparelho.
    const response = await fetch("/api/olena?action=account-auth&step=recent", {
      method: "POST",
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    });
    const status: unknown = response.ok ? await response.json() : undefined;
    if (!status || typeof status !== "object" || !("recent" in status) || status.recent !== true)
      throw new Error("recent-login-required");
  }
  if (
    provider === "apple.com" ||
    user.providerData?.some((entry) => entry.providerId === "apple.com")
  ) {
    appleResult ??= await services.authApi.reauthenticateWithPopup(
      user,
      new services.authApi.OAuthProvider("apple.com"),
    );
    const credential = services.authApi.OAuthProvider.credentialFromResult(appleResult);
    if (!credential?.accessToken) throw new Error("apple-access-token-required");
    // Revogação exigida pela Apple antes de apagar conta e dados associados.
    await services.authApi.revokeAccessToken(services.auth, credential.accessToken);
  }
}

// Captura antes da saída/exclusão, envia somente depois da ação concluída.
export async function prepareAccountLog(
  user: User,
): Promise<((event: "login" | "logout" | "deleted" | "activity") => Promise<void>) | undefined> {
  if (user.isAnonymous || readPrivacyConsent(localStorage)?.version !== PRIVACY_POLICY_VERSION)
    return undefined;
  const token = await user.getIdToken();
  return async (event) => {
    await fetch("/api/olena?action=account-log", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ event, consent: PRIVACY_POLICY_VERSION }),
      signal: AbortSignal.timeout(5000),
    });
  };
}
