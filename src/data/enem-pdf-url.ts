/** O navegador carrega o PDF oficial pela mesma origem do app. */
export function enemPdfUrl(officialUrl: string): string {
  const url = new URL(officialUrl);
  if (url.origin !== "https://download.inep.gov.br") throw new Error("Origem de PDF inválida");
  return `/enem-pdf${url.pathname}`;
}
