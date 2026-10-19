import { getFirebaseAccountServices } from "./firebase-account";
import type { AccountDevice } from "../domain/account-devices";

const KEY = "helena.security-device.v1";
export function accountDeviceId(uid: string): string {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null") as {
      uid?: string;
      id?: string;
    } | null;
    if (stored?.uid === uid && /^[a-f0-9-]{36}$/.test(stored.id ?? "")) return stored!.id!;
  } catch {
    /* Armazenamento indisponível não altera autenticação. */
  }
  const id = crypto.randomUUID();
  localStorage.setItem(KEY, JSON.stringify({ uid, id }));
  return id;
}
export async function requestAccountDevices(method: "GET" | "POST" | "DELETE" = "POST") {
  const { auth } = await getFirebaseAccountServices();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("auth");
  const id = accountDeviceId(user.uid);
  const response = await fetch("/api/account-devices", {
    method,
    signal: AbortSignal.timeout(12000),
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    },
    ...(method !== "GET" ? { body: JSON.stringify({ id }) } : {}),
  });
  if (auth.currentUser?.uid !== user.uid) throw new Error("account-changed");
  if (!response.ok) throw new Error(response.status === 429 ? "quota" : "unavailable");
  const body = (await response.json()) as { devices: AccountDevice[] };
  if (
    !Array.isArray(body.devices) ||
    body.devices.length > 30 ||
    !body.devices.every(
      (device) =>
        device &&
        typeof device.id === "string" &&
        typeof device.browser === "string" &&
        typeof device.system === "string" &&
        Number.isFinite(device.lastSeen) &&
        device.lastSeen > 0 &&
        device.lastSeen <= Date.now() + 60_000,
    )
  )
    throw new Error("response");
  return { devices: body.devices, currentId: id };
}
