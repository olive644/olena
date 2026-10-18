import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  vi.useRealTimers();
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  social.feed = undefined;
  social.request.mockClear();
  social.visit.mockClear();
});

it("curtida chega no aviso, mostra apoio no post e não oferece seguir de volta", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("[]")),
  );
  const person = {
    username: "alice",
    name: "Alice",
    photoUrl: "/profile-avatars/helena.webp",
    followers: 0,
    following: 1,
    followsYou: true,
    followed: false,
    shared: true,
  };
  const activity = { id: "a".repeat(32), kind: "focus" as const, value: 25, at: Date.now() };
  social.feed = {
    self: { ...person, username: "bob" },
    notifications: [],
    activities: [
      { ...activity, person, liked: false, likes: [{ username: "carol", name: "Carol" }] },
    ],
  };
  const { rerender } = render(<SystemUpdates page />);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
  expect(screen.getByText("Curtido por Carol")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Curtir conquista" }));
  await waitFor(() =>
    expect(social.request).toHaveBeenCalledWith({
      action: "like-activity",
      username: "alice",
      activityId: activity.id,
      liked: true,
    }),
  );
  social.feed = {
    ...social.feed,
    notifications: [{ person, at: Date.now(), read: false, kind: "like", activity }],
  };
  rerender(<SystemUpdates page />);
  await waitFor(() => expect(document.querySelector(".social-follow-toast")).toBeTruthy());
  const toast = document.querySelector<HTMLElement>(".social-follow-toast")!;
  expect(toast.textContent).toContain("Curtiu sua conquista.");
  expect(within(toast).queryByRole("button", { name: "Seguir de volta" })).toBeNull();
});

it("avisa somente sobre seguidores novos e permite visitar pelo aviso mesmo sem sino", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("[]")),
  );
  const person = {
    username: "alice",
    name: "Alice",
    photoUrl: "/profile-avatars/alice.webp",
    followers: 0,
    following: 1,
    followsYou: true,
    followed: false,
    shared: true,
  };
  social.feed = { self: { ...person, username: "bob" }, notifications: [] };
  const { rerender } = render(<SystemUpdates hideBell />);
  expect(document.querySelector(".system-updates")).toBeNull();
  expect(screen.queryByText("Alice te seguiu")).toBeNull();
  social.feed = { ...social.feed, notifications: [{ person, at: Date.now(), read: false }] };
  rerender(<SystemUpdates hideBell />);
  await waitFor(() => expect(screen.getByText("Alice te seguiu")).toBeTruthy());
  const toast = document.querySelector<HTMLElement>(".social-follow-toast")!;
  expect(toast.parentElement).toBe(document.body);
  fireEvent.click(within(toast).getByRole("button", { name: "Visitar perfil de @alice" }));
  expect(social.visit).toHaveBeenCalledWith("alice");
  expect(document.querySelector(".social-follow-toast")).toBeNull();
});

it("avisa sobre um seguidor recebido agora na primeira consulta e encerra em seis segundos", async () => {
  vi.useFakeTimers();
  const person = {
    username: "alice",
    name: "Alice",
    photoUrl: "/profile-avatars/alice.webp",
    followers: 0,
    following: 1,
    followsYou: true,
    followed: false,
    shared: true,
  };
  social.feed = {
    self: { ...person, username: "bob" },
    notifications: [{ person, at: Date.now(), read: false }],
  };
  const { container } = render(<SystemUpdates hideBell />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  const toast = screen.getByRole("status");
  expect(within(toast).getByText("Alice te seguiu")).toBeTruthy();
  expect(within(toast).getByRole("button", { name: "Seguir de volta" })).toBeTruthy();
  expect(container.contains(toast)).toBe(false);
  expect(toast.querySelector("img")?.getAttribute("src")).toBe(person.photoUrl);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(6000);
  });
  expect(screen.queryByText("Alice te seguiu")).toBeNull();
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
    notifications: [{ person, at: Date.now() - 60000, read: false }],
  };
  render(<SystemUpdates page />);
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
  render(<SystemUpdates page />);
  fireEvent.click(screen.getByRole("button", { name: "Novidades" }));
  await waitFor(() => expect(screen.getByText("Agenda")).toBeTruthy());
  fireEvent.click(screen.getByText("Marcar como lidas"));
  expect(localStorage.getItem(SYSTEM_UPDATES_READ_KEY)).toBe("[408,409]");
  expect(screen.getByRole("button", { name: "Marcar como lidas" }).hasAttribute("disabled")).toBe(
    true,
  );
  fireEvent(window, new Event("focus"));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Marcar como lidas" }).hasAttribute("disabled")).toBe(
      true,
    ),
  );
  applySyncedStorage({ [SYSTEM_UPDATES_READ_KEY]: "[408]" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Marcar como lidas" }).hasAttribute("disabled")).toBe(
      false,
    ),
  );
});

it("sino navega em vez de abrir popup e a página inicia em atividades", async () => {
  const open = vi.fn();
  window.addEventListener("olena:open-notifications", open);
  const { rerender } = render(<SystemUpdates />);
  fireEvent.click(screen.getByRole("button", { name: /Atualizações do sistema/ }));
  expect(open).toHaveBeenCalledOnce();
  expect(document.querySelector(".system-update-sheet")).toBeNull();
  rerender(<SystemUpdates page />);
  expect(screen.getByRole("button", { name: "Atividades" }).getAttribute("aria-pressed")).toBe(
    "true",
  );
  window.removeEventListener("olena:open-notifications", open);
});

it("agrupa quatro seguidores e permite inspecionar as contas ao expandir", () => {
  const person = {
    username: "alice",
    name: "Alice",
    photoUrl: "/profile-avatars/helena.webp",
    followers: 0,
    following: 0,
    followed: false,
    followsYou: true,
    shared: true,
  };
  social.feed = {
    self: { ...person, username: "bob" },
    notifications: Array.from({ length: 4 }, (_, i) => ({
      person: { ...person, username: `alice${i}` },
      at: Date.now() - 60000,
      read: false,
    })),
  };
  render(<SystemUpdates page />);
  expect(screen.getByText("4 pessoas começaram a seguir você")).toBeTruthy();
  const group = document.querySelector("details")!;
  expect(group.open).toBe(false);
  fireEvent.click(screen.getByText("4 pessoas começaram a seguir você"));
  expect(group.open).toBe(true);
  expect(screen.getAllByRole("button", { name: /Visitar perfil/ })).toHaveLength(4);
});
