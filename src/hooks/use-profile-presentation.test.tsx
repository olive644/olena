import { afterEach, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { useProfilePresentation } from "./use-profile-presentation";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  user: { uid: "alice-id", isAnonymous: false },
}));
vi.mock("../data/profile-social", () => ({ requestSocial: mocks.request }));
vi.mock("../data/firebase-account", () => ({
  getFirebaseAccountServices: async () => ({
    auth: { authStateReady: async () => {}, currentUser: mocks.user },
  }),
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  mocks.request.mockReset();
});
it("publica nome, personagem e capa sem toggle quando os dados pertencem à conta", async () => {
  mocks.request.mockResolvedValue({});
  localStorage.setItem("helena.account.v1", "alice-id");
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Alice", photoUrl: "/profile-avatars/alice.svg", cover: "ocean" }),
  );
  renderHook(() => useProfilePresentation("alice", "Aluno"));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith({
      action: "share",
      enabled: true,
      name: "Alice",
      photoUrl: "/profile-avatars/alice.svg",
      cover: "ocean",
      expectedUsername: "alice",
    }),
  );
});
it("não publica dados de outro dono nem de guest", async () => {
  localStorage.setItem("helena.account.v1", "old-account");
  renderHook(() => useProfilePresentation("alice", "Outro nome"));
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(mocks.request).not.toHaveBeenCalled();
  renderHook(() => useProfilePresentation("", "Convidado"));
  expect(mocks.request).not.toHaveBeenCalled();
});
