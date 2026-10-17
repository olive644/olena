export type SocialProfile = {
  username: string;
  name: string;
  photoUrl: string;
  followers: number;
  following: number;
  followsYou: boolean;
  followed: boolean;
  shared: boolean;
  cover?: string;
};
export type SocialNotice = { person: SocialProfile; at: number; read: boolean };
export type SocialFeed = {
  self: SocialProfile;
  notifications: SocialNotice[];
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
  | { action: "follow" | "unfollow" | "remove-follower"; username: string }
  | { action: "read" }
  | {
      action: "share";
      enabled: boolean;
      name?: string;
      photoUrl?: string;
      cover?: string;
      expectedUsername?: string;
    };
