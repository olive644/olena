import type { SocialProfileDetails } from "./social-profile-details.js";
export type SocialProfile = {
  blocked?: boolean;
  achievements?: string[];
  username: string;
  name: string;
  photoUrl: string;
  followers: number;
  following: number;
  followsYou: boolean;
  followed: boolean;
  shared: boolean;
  cover?: string;
  details?: SocialProfileDetails;
};
export type SocialActivitySummary = {
  id: string;
  kind: "practice" | "focus" | "quiz" | "streak" | "module";
  course?: string;
  level?: number;
  value: number;
  at: number;
};
export type SocialActivity = SocialActivitySummary & {
  person: SocialProfile;
  liked: boolean;
  likes: { username: string; name: string }[];
};
export type SocialNotice = {
  person: SocialProfile;
  at: number;
  read: boolean;
  kind?: "activity" | "like";
  activity?: SocialActivitySummary;
};
export type SocialFeed = {
  self: SocialProfile;
  notifications: SocialNotice[];
  activities?: SocialActivity[];
  activitySharing?: boolean;
  results?: SocialProfile[];
  profile?: SocialProfile;
  suggestions?: (SocialProfile & { mutualCount: number })[];
  connections?: {
    kind: "followers" | "following";
    owner: string;
    people: SocialProfile[];
    next?: number;
  };
};
export type SocialAction =
  | { action: "block" | "unblock"; username: string }
  | { action: "activity-privacy"; enabled: boolean }
  | { action: "publish-activities" }
  | { action: "like-activity"; username: string; activityId: string; liked: boolean }
  | { action: "follow" | "unfollow" | "remove-follower"; username: string }
  | { action: "read" }
  | {
      action: "share";
      enabled: boolean;
      name?: string;
      photoUrl?: string;
      cover?: string;
      expectedUsername?: string;
      details?: SocialProfileDetails;
      achievements?: string[];
    };
