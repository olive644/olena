import { expect, it } from "vitest";
import { profileCompletion } from "./profile-completion";
it("valida cada etapa e ignora @ local, URLs externas e capa inexistente", () => {
  expect(
    profileCompletion(
      { name: "Oli", username: "fake", photoUrl: "https://evil.example/avatar.png", cover: "fake" },
      "",
    ),
  ).toMatchObject({ completed: 0, complete: false, next: "identity" });
  expect(profileCompletion({ name: "Oli" }, "oli")).toMatchObject({ completed: 1, next: "avatar" });
  expect(
    profileCompletion({ name: "Oli", photoUrl: "/profile-avatars/helena.webp" }, "oli"),
  ).toMatchObject({ completed: 2, next: "cover" });
});
it("não exige campos opcionais e rejeita objetos malformados", () => {
  expect(
    profileCompletion(
      { name: "Oli", photoUrl: "/profile-avatars/helena.webp", cover: "ocean" },
      "oli",
    ),
  ).toMatchObject({ complete: true, next: null });
  for (const value of [null, [], { name: " " }, { name: "x".repeat(61) }])
    expect(profileCompletion(value, "oli").steps[0]?.done).toBe(false);
});
