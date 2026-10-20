import { localizeResource } from "../i18n/runtime.js";
export const PROFILE_COVERS = localizeResource([
  { id: "helena", name: "Noite da Olena" },
  { id: "solar", name: "Eclipse Solar" },
  { id: "aurora", name: "Aurora" },
  { id: "forest", name: "Bosque" },
  { id: "ocean", name: "Oceano" },
] as const);
export type ProfileCover = (typeof PROFILE_COVERS)[number]["id"];
export function profileCover(value: unknown): ProfileCover {
  return PROFILE_COVERS.find((cover) => cover.id === value)?.id ?? "helena";
}
