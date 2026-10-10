// A Vercel define `x-vercel-forwarded-for` e sobrescreve qualquer valor enviado pelo cliente,
// então é o único cabeçalho de IP em que os limites de uso podem confiar. `x-forwarded-for`
// pode ser montado por quem chama e não serve como fronteira contra abuso.
export function clientAddress(request: Request): string | undefined {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || undefined;
}
