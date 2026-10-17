import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SystemUpdates } from "./system-updates";
import { applySyncedStorage } from "../data/synced-storage";
import { SYSTEM_UPDATES_READ_KEY } from "../data/system-updates";
import type { SocialFeed } from "../domain/profile-social";
const social = vi.hoisted(() => ({
  feed: undefined as SocialFeed | undefined,
  request: vi.fn(async () => ({})),
  visit: vi.fn(),
}));
vi.mock("../hooks/use-social-feed", () => ({ useSocialFeed: () => social.feed }));
vi.mock("../data/profile-social", () => ({
  requestSocial: social.request,
  visitSocialProfile: social.visit,
  SOCIAL_VISIT: "olena:social-visit",
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  social.feed = undefined;
  social.request.mockClear();
  social.visit.mockClear();
});

it("mostra seguidor real com visita, seguir de volta e leitura na conta", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("[]")),
  );
  const person = {
    username: "alice",
    name: "Alice",
    photoUrl: "/profile-avatars/alice.svg",
    followers: 0,
    following: 1,
    followsYou: true,
    followed: false,
    shared: true,
  };
  social.feed = {
    self: { ...person, username: "bob", name: "Bob" },
    notifications: [{ person, at: Date.now(), read: false }],
  };
  render(<SystemUpdates />);
  expect(screen.getByText("Começou a seguir você.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Visitar perfil de @alice" }));
  expect(social.visit).toHaveBeenCalledWith("alice");
  fireEvent.click(screen.getByRole("button", { name: "Seguir de volta" }));
  await waitFor(() =>
    expect(social.request).toHaveBeenCalledWith({ action: "follow", username: "alice" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Marcar como lidas" }));
  await waitFor(() => expect(social.request).toHaveBeenCalledWith({ action: "read" }));
});
it("counts unread updates, persists reading and reacts to account sync", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            {
              id: 408,
              version: "beta.408",
              title: "Agenda",
              date: new Date(Date.now() - 3600000).toISOString(),
            },
            { id: 409, version: "beta.409", title: "Compactar", date: new Date().toISOString() },
          ]),
        ),
    ),
  );
  render(<SystemUpdates />);
  await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
  fireEvent.click(screen.getByText("Marcar como lidas"));
  expect(localStorage.getItem(SYSTEM_UPDATES_READ_KEY)).toBe("[408,409]");
  expect(screen.queryByText("2")).toBeNull();
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(screen.queryByText("2")).toBeNull());
  applySyncedStorage({ [SYSTEM_UPDATES_READ_KEY]: "[408]" });
  await waitFor(() => expect(screen.getByText("1")).toBeTruthy());
});
