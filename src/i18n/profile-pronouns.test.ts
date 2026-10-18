import { expect, it } from "vitest";
import english from "../../public/locales/en-US.json";
import { changeLanguage, installUiCatalog } from "./runtime";
import { profilePronounsLabel } from "./profile-pronouns";

it("localizes existing preset values without changing stored or custom text", async () => {
  installUiCatalog("en-US", english);
  const stored = { name: "Drey", pronouns: "Ela/dela" };
  localStorage.setItem("helena.profile.v1", JSON.stringify(stored));
  try {
    await changeLanguage("en-US");
    expect(profilePronounsLabel(stored.pronouns)).toBe("She/her");
    expect(profilePronounsLabel("Ele/dele")).toBe("He/him");
    expect(profilePronounsLabel("Elu/delu")).toBe("They/them");
    expect(profilePronounsLabel("ele/dela, outros")).toBe("ele/dela, outros");
    expect(profilePronounsLabel(undefined)).toBe("");
    expect(JSON.parse(localStorage.getItem("helena.profile.v1")!)).toEqual(stored);
    await changeLanguage("pt-BR");
    expect(profilePronounsLabel(stored.pronouns)).toBe("Ela/dela");
  } finally {
    await changeLanguage("pt-BR");
  }
});
