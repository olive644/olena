import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { useProfilePresentation } from "./use-profile-presentation";
import { createInitialWorkspace } from "../domain/workspace";
import { upgradeMasteryProgress } from "../domain/math-mastery-progress";
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
it("publica nível, streaks e redes sem enviar registros privados", async () => {
  mocks.request.mockResolvedValue({});
  localStorage.setItem("helena.account.v1", "alice-id");
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Alice", socialLinks: ["github.com/alice", "javascript:alert(1)"] }),
  );
  renderHook(() => useProfilePresentation("alice", "Aluno", createInitialWorkspace()));
  await waitFor(() => expect(mocks.request).toHaveBeenCalled());
  expect(mocks.request.mock.calls[0]?.[0].details).toEqual({
    level: 1,
    streaks: { islands: 0, timer: 0, pomodoro: 0 },
    socialLinks: ["github.com/alice"],
  });
  expect(mocks.request.mock.calls[0]?.[0].workspace).toBeUndefined();
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
      achievements: [],
      achievementDates: {},
      achievementFavorites: [],
      cards: [],
      cardDates: {},
      cardFavorites: [],
    }),
  );
});
it("publica conquistas novas durante a sessão sem abrir a interface do perfil", async () => {
  mocks.request.mockResolvedValue({});
  localStorage.setItem("helena.account.v1", "alice-id");
  renderHook(() => useProfilePresentation("alice", "Alice"));
  await waitFor(() => expect(mocks.request).toHaveBeenCalled());
  mocks.request.mockClear();
  localStorage.setItem(
    "helena.mathGame.v5",
    JSON.stringify({ foundations: { ...upgradeMasteryProgress(), correct: 1 } }),
  );
  fireEvent(window, new Event("helena:synced-storage-change"));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({ achievements: ["correct-1"] }),
    ),
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
const REVEALED = Date.parse("2026-10-10T10:00:00Z");
function seedCards() {
  localStorage.setItem("helena.account.v1", "alice-id");
  localStorage.setItem(
    "helena.mathPlaceRewards.v1",
    JSON.stringify({
      foundations: {
        points: 0,
        receipts: [],
        chests: [
          {
            id: "a",
            unlockAt: null,
            opened: true,
            cards: ["cups-01", "wands-02"],
            revealed: 2,
            revealedAt: [REVEALED, REVEALED + 1000],
          },
          {
            id: "b",
            unlockAt: null,
            opened: true,
            cards: ["swords-03", "pentacles-04"],
            revealed: 2,
            revealedAt: [null, REVEALED + 2000],
          },
        ],
      },
    }),
  );
}
it("publica cartas obtidas, datas conhecidas e sugere três destaques quando não há escolha", async () => {
  mocks.request.mockResolvedValue({});
  seedCards();
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Alice" }));
  renderHook(() => useProfilePresentation("alice", "Aluno"));
  await waitFor(() => expect(mocks.request).toHaveBeenCalled());
  const sent = mocks.request.mock.calls[0]?.[0];
  expect(sent.cards).toEqual(["wands-02", "cups-01", "swords-03", "pentacles-04"]);
  expect(sent.cardFavorites).toEqual(["wands-02", "cups-01", "swords-03"]);
  expect(sent.cardDates).toEqual({
    "cups-01": new Date(REVEALED).toISOString(),
    "wands-02": new Date(REVEALED + 1000).toISOString(),
    "pentacles-04": new Date(REVEALED + 2000).toISOString(),
  });
});
it("publica a escolha explícita na ordem, descarta não obtidas e mantém [] vazio", async () => {
  mocks.request.mockResolvedValue({});
  seedCards();
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({ name: "Alice", cardFavorites: ["swords-03", "major-00", "cups-01"] }),
  );
  const first = renderHook(() => useProfilePresentation("alice", "Aluno"));
  await waitFor(() => expect(mocks.request).toHaveBeenCalled());
  expect(mocks.request.mock.calls[0]?.[0].cardFavorites).toEqual(["swords-03", "cups-01"]);
  first.unmount();
  mocks.request.mockClear();
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Alice", cardFavorites: [] }));
  renderHook(() => useProfilePresentation("alice", "Aluno"));
  await waitFor(() => expect(mocks.request).toHaveBeenCalled());
  expect(mocks.request.mock.calls[0]?.[0].cardFavorites).toEqual([]);
});
