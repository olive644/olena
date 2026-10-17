import { PROFILE_AVATARS } from "./profile-avatars.js";
import { PROFILE_COVERS } from "./profile-covers.js";

export const PROFILE_STEPS = ["identity", "avatar", "cover"] as const;
export type ProfileStep = (typeof PROFILE_STEPS)[number];
export type ProfileCompletion = {
  version: 1;
  steps: { id: ProfileStep; done: boolean }[];
  completed: number;
  complete: boolean;
  next: ProfileStep | null;
};
export function profileCompletion(profile: unknown, username: unknown): ProfileCompletion {
  const value =
    profile && typeof profile === "object" && !Array.isArray(profile)
      ? (profile as Record<string, unknown>)
      : {};
  const done = [
    typeof value["name"] === "string" &&
      value["name"].trim().length > 0 &&
      value["name"].trim().length <= 60 &&
      typeof username === "string" &&
      /^[a-z0-9._]{1,30}$/.test(username),
    PROFILE_AVATARS.some((avatar) => avatar.photoUrl === value["photoUrl"]),
    PROFILE_COVERS.some((cover) => cover.id === value["cover"]),
  ];
  const steps = PROFILE_STEPS.map((id, index) => ({ id, done: done[index] === true }));
  const completed = steps.filter((step) => step.done).length;
  return {
    version: 1,
    steps,
    completed,
    complete: completed === steps.length,
    next: steps.find((step) => !step.done)?.id ?? null,
  };
}
