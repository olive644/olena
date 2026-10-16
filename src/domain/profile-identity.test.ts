import { expect, it } from "vitest";
import { recognizeSocialLink, validateProfileDraft, type ProfileDraft } from "./profile-identity";
const draft: ProfileDraft = {
  name: "Oli",
  username: "oli",
  bio: "",
  pronouns: "",
  socialLinks: [],
};

it.each(["instagram", "facebook", "linkedin", "github", "tiktok"])(
  "reconhece %s sem acessar serviço externo",
  (network) => {
    expect(recognizeSocialLink(`www.${network}.com/estudante`)).toEqual({
      network,
      url: `https://${network}.com/estudante`,
    });
  },
);
it.each([
  "javascript:alert(1)",
  "https://github.com.evil.test/a",
  "https://github.com@evil.test/a",
  "https://user:secret@github.com/a",
  "https://github.com:8443/a",
  "https://github.com/",
  "data:text/html,test",
  "https://tiktok.com.evil/a",
  "",
])("recusa link inseguro ou não reconhecido: %s", (link) => {
  expect(recognizeSocialLink(link)).toBeNull();
});
it("aceita endereços regionais seguros e normaliza HTTPS", () => {
  expect(recognizeSocialLink("http://m.facebook.com/oli")?.url).toBe("https://facebook.com/oli");
  expect(recognizeSocialLink("https://br.linkedin.com/in/oli")?.network).toBe("linkedin");
});
it("valida limites, minúsculas e duplicação antes de gravar qualquer campo", () => {
  expect(validateProfileDraft(draft)).toBeNull();
  expect(validateProfileDraft({ ...draft, username: "Oli" })).toMatch(/minúsculas/);
  expect(validateProfileDraft({ ...draft, bio: "a".repeat(241) })).toMatch(/bio/);
  expect(validateProfileDraft({ ...draft, socialLinks: ["github.com/a", "github.com/b"] })).toMatch(
    /um link/,
  );
  expect(validateProfileDraft({ ...draft, socialLinks: ["javascript:alert(1)"] })).toMatch(
    /Use links/,
  );
});
