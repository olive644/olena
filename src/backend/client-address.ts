// A Vercel define `x-vercel-forwarded-for` e sobrescreve qualquer valor enviado pelo cliente,
// então é o único cabeçalho de IP em que os limites de uso podem confiar. `x-forwarded-for`
// pode ser montado por quem chama e não serve como fronteira contra abuso.
//
// Uma casa ou operadora recebe um bloco IPv6 /64 inteiro, então limitar pelo endereço completo
// deixaria um atacante trocar de endereço a cada pedido. Endereços IPv6 viram o prefixo /64.
function ipv6Prefix(address: string): string | undefined {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  if (mapped) return mapped[1];
  const [head = "", tail, extra] = address.split("::");
  if (extra !== undefined) return undefined;
  const front = head ? head.split(":") : [];
  const back = tail ? tail.split(":") : [];
  const missing = 8 - front.length - back.length;
  if (tail === undefined ? front.length !== 8 : missing < 1) return undefined;
  const groups =
    tail === undefined ? front : [...front, ...Array<string>(missing).fill("0"), ...back];
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/i.test(group))) return undefined;
  return `v6:${groups
    .slice(0, 4)
    .map((group) => group.toLowerCase().padStart(4, "0"))
    .join(":")}`;
}

export function clientAddress(request: Request): string | undefined {
  const raw = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (!raw) return undefined;
  if (!raw.includes(":")) return raw;
  return ipv6Prefix(raw.split("%")[0]!) ?? raw;
}
