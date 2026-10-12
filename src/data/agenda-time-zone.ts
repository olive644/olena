export const AGENDA_ZONE_KEY = "helena.agendaTimeZone.v1";
const brazilianZones = new Set([
  "America/Sao_Paulo",
  "America/Bahia",
  "America/Fortaleza",
  "America/Recife",
  "America/Araguaina",
  "America/Maceio",
  "America/Belem",
  "America/Santarem",
  "America/Manaus",
  "America/Boa_Vista",
  "America/Porto_Velho",
  "America/Campo_Grande",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Eirunepe",
  "America/Noronha",
]);
export function resolveBrazilianZone(account: string | null, device: string): string {
  return account && brazilianZones.has(account)
    ? account
    : brazilianZones.has(device)
      ? device
      : "America/Sao_Paulo";
}
export function agendaTimeZone(): string {
  try {
    return resolveBrazilianZone(
      localStorage.getItem(AGENDA_ZONE_KEY),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  } catch {
    return "America/Sao_Paulo";
  }
}
