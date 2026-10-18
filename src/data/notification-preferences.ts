import { useEffect, useState } from "react";
import {
  SYNCED_STORAGE_EVENT,
  SYNCED_STORAGE_APPLIED_EVENT,
  writeSyncedStorage,
} from "./synced-storage";

export type NotificationPreferences = {
  followers: boolean;
  agenda: boolean;
  updates: boolean;
  rewards: boolean;
};
const defaults: NotificationPreferences = {
  followers: true,
  agenda: true,
  updates: true,
  rewards: true,
};
export function readNotificationPreferences(): NotificationPreferences {
  try {
    const profile: unknown = JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}");
    const value =
      profile && typeof profile === "object" && "notificationPreferences" in profile
        ? profile.notificationPreferences
        : undefined;
    if (value && typeof value === "object")
      return {
        followers: !("followers" in value) || value.followers !== false,
        agenda: !("agenda" in value) || value.agenda !== false,
        updates: !("updates" in value) || value.updates !== false,
        rewards: !("rewards" in value) || value.rewards !== false,
      };
  } catch {
    /* Sem preferências legíveis, manter os avisos existentes. */
  }
  return { ...defaults };
}
export function updateNotificationPreferences(update: Partial<NotificationPreferences>) {
  const stored: unknown = JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}");
  if (!stored || typeof stored !== "object" || Array.isArray(stored))
    throw new Error("Perfil indisponível.");
  writeSyncedStorage(
    "helena.profile.v1",
    JSON.stringify({
      ...stored,
      notificationPreferences: { ...readNotificationPreferences(), ...update },
    }),
  );
}
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState(readNotificationPreferences);
  useEffect(() => {
    const refresh = () => setPreferences(readNotificationPreferences());
    const events = [SYNCED_STORAGE_EVENT, SYNCED_STORAGE_APPLIED_EVENT, "storage"];
    events.forEach((event) => window.addEventListener(event, refresh));
    refresh();
    return () => events.forEach((event) => window.removeEventListener(event, refresh));
  }, []);
  return preferences;
}
