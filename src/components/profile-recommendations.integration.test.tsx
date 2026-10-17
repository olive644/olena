import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProfileShowcase } from "./profile-showcase";
import { profileCompletion } from "../domain/profile-completion";
import { writeSyncedStorage } from "../data/synced-storage";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../data/profile-completion", () => ({
  requestProfileCompletion: mocks.request,
  invalidateProfileCompletion: vi.fn(),
}));
vi.mock("../hooks/use-profile-handle", () => ({
  useProfileHandle: () => ({ handle: { username: "oli", creks: false } }),
}));
vi.mock("../hooks/use-social-feed", () => ({ useSocialFeed: () => undefined }));
const complete = { name: "Oli", photoUrl: "/profile-avatars/helena.webp", cover: "ocean" as const };
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mocks.request.mockReset();
});

it("integra a resposta completa da API sem montar ficha ou Revisar meu perfil", async () => {
  vi.useFakeTimers();
  localStorage.setItem("helena.profile.v1", JSON.stringify(complete));
  mocks.request.mockResolvedValue(profileCompletion(complete, "oli"));
  const { container } = render(
    <ProfileShowcase nameFallback="Oli" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  expect(screen.queryByRole("region", { name: "Complete seu perfil" })).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(mocks.request).toHaveBeenCalledOnce();
  expect(container.querySelector('[class^="profile-journey-slot"]')).toBeNull();
  expect(screen.queryByText("Revisar meu perfil")).toBeNull();
});

it("recomenda só a capa confirmada como ausente e desaparece ao salvá-la", async () => {
  vi.useFakeTimers();
  const partial = { name: "Oli", photoUrl: complete.photoUrl };
  localStorage.setItem("helena.profile.v1", JSON.stringify(partial));
  mocks.request
    .mockResolvedValueOnce(profileCompletion(partial, "oli"))
    .mockResolvedValue(profileCompletion(complete, "oli"));
  const { container } = render(
    <ProfileShowcase nameFallback="Oli" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  expect(screen.queryByRole("region", { name: "Complete seu perfil" })).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(screen.getByRole("button", { name: "Escolher minha capa" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Escolher meu nome" })).toBeNull();
  await act(async () => {
    writeSyncedStorage("helena.profile.v1", JSON.stringify(complete));
  });
  expect(container.querySelector('[class^="profile-journey-slot"]')).toBeNull();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(mocks.request).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[class^="profile-journey-slot"]')).toBeNull();
});

it("não inventa recomendações em erro de rede e permite dispensar após conferir", async () => {
  vi.useFakeTimers();
  mocks.request
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(profileCompletion({}, "oli"));
  const { container } = render(
    <ProfileShowcase nameFallback="Oli" settingsOpen={false}>
      {null}
    </ProfileShowcase>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(screen.queryByRole("region", { name: "Complete seu perfil" })).toBeNull();
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  fireEvent.click(screen.getByRole("button", { name: "Dispensar recomendação de perfil" }));
  expect(container.querySelector('[class^="profile-journey-slot"]')).toBeNull();
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  expect(container.querySelector('[class^="profile-journey-slot"]')).toBeNull();
});
