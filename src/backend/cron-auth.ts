import { safeEqual } from "./secure-compare.js";

// A Vercel chama o cron com `Authorization: Bearer <CRON_SECRET>`. Sem segredo configurado,
// ninguém é autorizado, e a comparação não revela pelo tempo quantos caracteres batem.
export function isCronAuthorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  return safeEqual(request.headers.get("authorization") ?? undefined, `Bearer ${secret}`);
}
