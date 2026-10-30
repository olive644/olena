import { expect, it } from "vitest";
import { groupedActivities, groupedNotices } from "./activity-feed";
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
it("oculta posts banais legados e mantém um resumo por modalidade, pessoa e dia", () => {
  const base = {
    id: "a",
    person,
    kind: "practice" as const,
    value: 1,
    at: Date.now(),
    liked: false,
    likes: [],
  };
  expect(groupedActivities([base, { ...base, id: "b" }])).toEqual([]);
  const result = groupedActivities([
    { ...base, course: "foundations", value: 10 },
    { ...base, id: "b", course: "foundations", value: 20 },
  ]);
  expect(result).toHaveLength(1);
  expect(result[0]?.value).toBe(20);
});
it("mais de três seguidores viram um grupo expansível, sem misturar curtidas", () => {
  const notices = Array.from({ length: 4 }, (_, i) => ({
    person: { ...person, username: `alice${i}` },
    read: false,
    at: Date.now(),
  }));
  expect(groupedNotices(notices.slice(0, 3))).toHaveLength(3);
  expect(groupedNotices(notices)).toHaveLength(1);
  expect(groupedNotices(notices)[0]).toHaveLength(4);
});
it("mantém cada prêmio diferente no mesmo dia, sem filtrar o valor unitário", () => {
  const base = { person, kind: "card" as const, value: 1, at: Date.now(), liked: false, likes: [] };
  const rows = [
    { ...base, id: "card-a", ref: "major-17" },
    { ...base, id: "card-b", ref: "wands-06" },
    { ...base, id: "badge-a", kind: "achievement" as const, ref: "rounds-1" },
  ];
  expect(groupedActivities([...rows, rows[0]!])).toHaveLength(3);
});
