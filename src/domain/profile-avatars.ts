export const PROFILE_AVATARS = [
  ["Poliana", "poliana.webp"],
  ["Oliver", "oliver.webp"],
  ["Andreyna", "andreyna.webp"],
  ["Ninho", "jairo.webp"],
  ["Olena", "helena.webp"],
  ["Alice", "alice.svg"],
  ["Soso Estrelinha", "soso-estrelinha.svg"],
  ["Nicolas", "nicolas.svg"],
  ["Guilherme", "guilherme.svg"],
  ["Erick", "erick.svg"],
  ["Miau", "miau.svg"],
  ["Luizão", "luizao.svg"],
  ["Anonha", "anonha-panda.svg"],
  ["Moguel", "moguel-porquinho.svg"],
  ["Leo", "leo.svg"],
].map(([name, file]) => ({ name: name!, photoUrl: `/profile-avatars/${file}` }));
export function profileAvatarSource(value?: string): string {
  return (
    PROFILE_AVATARS.find((avatar) => avatar.photoUrl === value)?.photoUrl ??
    "/profile-avatars/helena.webp"
  );
}
