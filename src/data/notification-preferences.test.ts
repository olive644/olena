import { afterEach, expect, it } from "vitest";
import {
  readNotificationPreferences,
  updateNotificationPreferences,
} from "./notification-preferences";
import { claimDeviceForAccount } from "./personal-data";

afterEach(() => localStorage.clear());
it("salva por tipo preservando identidade e usa a chave já sincronizada", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Aluno", photoUrl: "/profile-avatars/helena.webp" }),
  );
  updateNotificationPreferences({ followers: false });
  expect(readNotificationPreferences()).toEqual({
    followers: false,
    agenda: true,
    updates: true,
    rewards: true,
    activities: true,
  });
  expect(JSON.parse(localStorage.getItem("helena.profile.v1")!)).toMatchObject({
    name: "Aluno",
    photoUrl: "/profile-avatars/helena.webp",
  });
});
it("troca de conta não conserva preferências de outra pessoa", () => {
  claimDeviceForAccount(localStorage, "a");
  updateNotificationPreferences({ agenda: false, rewards: false });
  claimDeviceForAccount(localStorage, "b");
  expect(readNotificationPreferences().agenda).toBe(true);
  expect(readNotificationPreferences().rewards).toBe(true);
});
it("não sobrescreve perfil ilegível ao tentar mudar preferências", () => {
  localStorage.setItem("helena.profile.v1", "broken");
  expect(() => updateNotificationPreferences({ updates: false })).toThrow();
  expect(localStorage.getItem("helena.profile.v1")).toBe("broken");
});
