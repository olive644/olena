import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SystemUpdates } from "./system-updates";
import { applySyncedStorage } from "../data/synced-storage";
import { SYSTEM_UPDATES_READ_KEY } from "../data/system-updates";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
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
