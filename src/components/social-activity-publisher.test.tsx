import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SocialFeed } from "../domain/profile-social";
import { SocialActivityPublisher } from "./social-activity-publisher";

const social = vi.hoisted(() => ({
  feed: undefined as SocialFeed | undefined,
  request: vi.fn(async () => ({})),
}));
vi.mock("../hooks/use-social-feed", () => ({ useSocialFeed: () => social.feed }));
vi.mock("../data/profile-social", () => ({ requestSocial: social.request }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  social.request.mockClear();
  social.feed = undefined;
});

it("publica a conquista que chega depois do salvamento, sem repetir ou ignorar privacidade", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
  social.feed = {
    self: {
      username: "alice",
      name: "Alice",
      photoUrl: "",
      followers: 0,
      following: 0,
      followsYou: false,
      followed: false,
      shared: true,
    },
    activitySharing: true,
    notifications: [],
  };
  const props = { authenticated: true, savedAt: Date.now(), signature: "1:1:1" };
  const view = render(<SocialActivityPublisher {...props} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(social.request).toHaveBeenCalledTimes(1);
  social.feed = {
    ...social.feed,
    self: {
      ...social.feed.self,
      achievements: ["english-part-0"],
      achievementDates: { "english-part-0": "2026-11-06T12:00:00Z" },
    },
  };
  view.rerender(<SocialActivityPublisher {...props} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(social.request).toHaveBeenCalledTimes(2);
  view.rerender(<SocialActivityPublisher {...props} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(social.request).toHaveBeenCalledTimes(2);
  social.feed = {
    ...social.feed,
    activitySharing: false,
    self: { ...social.feed.self, achievements: ["english-part-0", "english-correct-10"] },
  };
  view.rerender(<SocialActivityPublisher {...props} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(social.request).toHaveBeenCalledTimes(2);
});
