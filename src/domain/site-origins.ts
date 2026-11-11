/** Endereço oficial do OlenaStudy. O domínio sem www redireciona para ele na Vercel. */
export const CANONICAL_SITE_ORIGIN = "https://www.olenastudy.com.br";

/**
 * Origens de produção que a API aceita quando HELENA_ALLOWED_ORIGINS não está definida. O
 * endereço da Vercel continua aceito para os links e instalações que já existem.
 */
export const DEFAULT_SITE_ORIGINS: readonly string[] = [
  CANONICAL_SITE_ORIGIN,
  "https://olenastudy.com.br",
  "https://olenastudy.vercel.app",
];

/** Lê uma lista de origens separadas por vírgula, ou usa as de produção quando ela falta. */
export function parseAllowedOrigins(value: string | undefined): string[] {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : [...DEFAULT_SITE_ORIGINS];
}

export function isOlenaSiteOrigin(origin: string): boolean {
  return DEFAULT_SITE_ORIGINS.includes(origin);
}
