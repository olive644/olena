import type { SocialActivity, SocialActivitySummary, SocialNotice } from "./profile-social";
export function meaningfulActivity(item: SocialActivitySummary) {
  return (
    item.kind === "module" ||
    item.kind === "streak" ||
    (item.kind === "practice"
      ? Boolean(item.course) && item.value >= 10
      : item.value >= (item.kind === "quiz" ? 5 : 10))
  );
}
export function groupedActivities(items: SocialActivity[]) {
  const groups = new Map<string, SocialActivity>();
  for (const item of items.filter(meaningfulActivity)) {
    const key = `${item.person.username}:${item.kind}:${item.course ?? ""}:${item.kind === "module" ? item.level : new Date(item.at).toISOString().slice(0, 10)}`;
    const old = groups.get(key);
    if (!old) {
      groups.set(key, item);
      continue;
    }
    const latest = old.at > item.at ? old : item;
    groups.set(key, { ...latest, value: Math.max(old.value, item.value) });
  }
  return [...groups.values()].sort((a, b) => b.at - a.at);
}
export function groupedNotices(items: SocialNotice[]): SocialNotice[][] {
  const follows = items.filter((item) => !item.kind);
  const result = follows.length > 3 ? [follows] : follows.map((item) => [item]);
  const likes = new Map<string, SocialNotice[]>();
  for (const item of items.filter((item) => item.kind === "like")) {
    const key = item.activity?.id ?? item.person.username;
    likes.set(key, [...(likes.get(key) ?? []), item]);
  }
  return [...result, ...likes.values()].sort(
    (a, b) => Math.max(...b.map((n) => n.at)) - Math.max(...a.map((n) => n.at)),
  );
}
