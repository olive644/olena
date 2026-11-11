// Endereços de onde o servidor aceita pedidos da conta (perfil, amigos, onboarding, Olena). Sem a
// variável HELENA_ALLOWED_ORIGINS, vale esta lista, que inclui o domínio próprio. Com a variável,
// ela substitui a lista inteira.
export const DEFAULT_ALLOWED_ORIGINS = [
  "https://olenastudy.vercel.app",
  "https://olenastudy.com.br",
  "https://www.olenastudy.com.br",
] as const;

export function allowedOriginsFrom(configured: string | undefined): string[] {
  return (configured ?? DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
