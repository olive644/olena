import type { User, UserCredential } from "firebase/auth";
import { getFirebaseAccountServices } from "./firebase-account";
import { uiText } from "../i18n/runtime";

export type AccountServices = Awaited<ReturnType<typeof getFirebaseAccountServices>>;

export function setAccountLanguage(services: AccountServices): void {
  services.auth.languageCode = document.documentElement.lang.startsWith("en") ? "en" : "pt-BR";
}

export function accountAuthError(cause: unknown): string {
  const code = cause && typeof cause === "object" && "code" in cause ? cause.code : "";
  if (code === "auth/network-request-failed")
    return uiText("Sem conexão. Confira sua internet e tente novamente.");
  if (code === "auth/too-many-requests")
    return uiText("Muitas tentativas. Aguarde um pouco antes de tentar novamente.");
  if (code === "auth/operation-not-allowed" || code === "auth/unauthorized-domain")
    return uiText("Este método de acesso ainda não está configurado. Use outro método.");
  if (
    code === "auth/account-exists-with-different-credential" ||
    code === "auth/email-already-in-use"
  )
    return uiText(
      "Não foi possível criar este acesso. Entre pelo método que já utiliza ou recupere sua senha.",
    );
  if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements")
    return uiText("A senha não atende à política de segurança da conta.");
  return uiText("Não foi possível entrar. Confira seus dados e tente novamente.");
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
