export const PROFILE_COVERS = [
  { id: "helena", name: "Noite da Helena" },
  { id: "solar", name: "Eclipse Solar" },
  { id: "aurora", name: "Aurora" },
  { id: "forest", name: "Bosque" },
  { id: "ocean", name: "Oceano" },
] as const;
export type ProfileCover = (typeof PROFILE_COVERS)[number]["id"];
export function profileCover(value: unknown): ProfileCover {
  return PROFILE_COVERS.find((cover) => cover.id === value)?.id ?? "helena";
}
