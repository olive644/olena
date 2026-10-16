export type StoredProfile = {
  name?: string;
  photoUrl?: string;
  username?: string;
  bio?: string;
  pronouns?: string;
  socialLinks?: string[];
};

export const SOCIAL_NETWORKS = ["instagram", "facebook", "linkedin", "github", "tiktok"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  github: "GitHub",
  tiktok: "TikTok",
};

export function recognizeSocialLink(input: string): { network: SocialNetwork; url: string } | null {
  try {
    if (input.length > 500) return null;
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:/i.test(input.trim()) ? input.trim() : `https://${input.trim()}`,
    );
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port)
      return null;
    const network = SOCIAL_NETWORKS.find(
      (name) =>
        host === `${name}.com` ||
        (name === "facebook" && host === "m.facebook.com") ||
        (name === "linkedin" && /^[a-z]{2}\.linkedin\.com$/.test(host)),
    );
    if (!network || !url.pathname.replaceAll("/", "").trim()) return null;
    url.protocol = "https:";
    url.hostname = `${network}.com`;
    return { network, url: url.href };
  } catch {
    return null;
  }
}

export type ProfileDraft = Required<
  Pick<StoredProfile, "name" | "username" | "bio" | "pronouns" | "socialLinks">
>;

export function validateProfileDraft(draft: ProfileDraft): string | null {
  if (!draft.name.trim() || draft.name.trim().length > 60)
    return "Use um apelido de até 60 caracteres.";
  if (draft.username && !/^[a-z0-9._]{1,30}$/.test(draft.username))
    return "Nome: use até 30 letras minúsculas, números, ponto ou _.";
  if (draft.bio.length > 240) return "A bio pode ter até 240 caracteres.";
  if (draft.pronouns.length > 40) return "Os pronomes podem ter até 40 caracteres.";
  const links = draft.socialLinks.filter((link) => link.trim());
  if (links.length > 5) return "Adicione no máximo cinco redes sociais.";
  const recognized = links.map(recognizeSocialLink);
  if (recognized.some((link) => !link))
    return "Use links de perfil do Instagram, Facebook, LinkedIn, GitHub ou TikTok.";
  if (new Set(recognized.map((link) => link?.network)).size !== links.length)
    return "Use apenas um link por rede social.";
  return null;
}
