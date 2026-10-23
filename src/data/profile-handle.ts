import { uiText } from "../i18n/runtime.js";
import { getFirebaseAccountServices } from "./firebase-account";

export type ProfileHandle = { username: string; creks: boolean; preferredUsername?: string };
export const PROFILE_HANDLE_CHANGED = "olena:profile-handle-changed";
export async function requestProfileHandle(
  method: "GET" | "POST" | "DELETE",
  username = "",
): Promise<ProfileHandle> {
  const { auth } = await getFirebaseAccountServices().catch(() => {
    throw new Error(uiText(1072));
  });
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error(uiText(840));
  const token = await user.getIdToken().catch(() => {
    throw new Error(uiText(1073));
  });
  const response = await fetch("/api/profile-handle", {
    method,
    signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(method === "POST" ? { body: JSON.stringify({ username }) } : {}),
  }).catch(() => {
    throw new Error(uiText(1074));
  });
  const body = (await response.json().catch(() => {
    throw new Error(uiText(1075));
  })) as Partial<ProfileHandle> & { error?: string };
  if (auth.currentUser?.uid !== user.uid) throw new Error(uiText(1076));
  if (!response.ok) throw new Error(body.error || uiText(2300));
  if (
    typeof body.username !== "string" ||
    !/^[a-z0-9._]{0,30}$/.test(body.username) ||
    typeof body.creks !== "boolean"
  )
    throw new Error(uiText(1077));
  return {
    username: body.username,
    creks: body.creks,
    ...(typeof body.preferredUsername === "string"
      ? { preferredUsername: body.preferredUsername }
      : {}),
  };
}
