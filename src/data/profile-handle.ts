import { uiText } from "../i18n/runtime.js";
import { getFirebaseAccountServices } from "./firebase-account";

export type ProfileHandle = { username: string; creks: boolean; preferredUsername?: string };
export const PROFILE_HANDLE_CHANGED = "olena:profile-handle-changed";
export async function requestProfileHandle(
  method: "GET" | "POST" | "DELETE",
  username = "",
): Promise<ProfileHandle> {
  const { auth } = await getFirebaseAccountServices().catch(() => {
    throw new Error(uiText("Não foi possível conectar sua conta. Tente novamente."));
  });
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error(uiText("Entre na conta para criar um @."));
  const token = await user.getIdToken().catch(() => {
    throw new Error(uiText("Entre novamente para confirmar seu @."));
  });
  const response = await fetch("/api/profile-handle", {
    method,
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify({ username }) } : {}),
  }).catch(() => {
    throw new Error(
      uiText("Não foi possível confirmar o @. Verifique sua conexão e tente novamente."),
    );
  });
  const body = (await response.json().catch(() => {
    throw new Error(uiText("Não foi possível confirmar o @. Tente novamente."));
  })) as Partial<ProfileHandle> & { error?: string };
  if (auth.currentUser?.uid !== user.uid)
    throw new Error(uiText("A conta mudou. Abra o perfil novamente."));
  if (!response.ok) throw new Error(body.error || uiText("Não foi possível confirmar o @."));
  if (
    typeof body.username !== "string" ||
    !/^[a-z0-9._]{0,30}$/.test(body.username) ||
    typeof body.creks !== "boolean"
  )
    throw new Error(uiText("Resposta inválida ao confirmar o @."));
  return {
    username: body.username,
    creks: body.creks,
    ...(typeof body.preferredUsername === "string"
      ? { preferredUsername: body.preferredUsername }
      : {}),
  };
}
