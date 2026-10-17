import { describe, expect, it } from "vitest";
import { clientAddress } from "./client-address";

const request = (headers: Record<string, string>) =>
  new Request("https://helena.example/api/speech", { headers });

describe("endereço do cliente", () => {
  it("usa o primeiro endereço do cabeçalho da Vercel", () => {
    expect(clientAddress(request({ "x-vercel-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
  });

  it("ignora x-forwarded-for, que pode ser forjado por quem chama", () => {
    expect(clientAddress(request({ "x-forwarded-for": "198.51.100.9" }))).toBeUndefined();
  });

  it("devolve nada quando o cabeçalho falta ou vem vazio", () => {
    expect(clientAddress(request({}))).toBeUndefined();
    expect(clientAddress(request({ "x-vercel-forwarded-for": " " }))).toBeUndefined();
  });

  it("agrupa IPv6 pelo prefixo /64, para trocar de endereço não escapar do limite", () => {
    const of = (value: string) => clientAddress(request({ "x-vercel-forwarded-for": value }));
    const base = of("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
    expect(base).toBe("v6:2001:0db8:0001:0002");
    expect(of("2001:DB8:1:2::1")).toBe(base);
    expect(of("2001:db8:1:2:ffff:ffff:ffff:ffff")).toBe(base);
    expect(of("2001:db8:1:3::1")).not.toBe(base);
    expect(of("2001:db8::1")).toBe("v6:2001:0db8:0000:0000");
    expect(of("::1")).toBe("v6:0000:0000:0000:0000");
  });

  it("trata IPv4 mapeado como IPv4, preserva IPv4 e não quebra com texto estranho", () => {
    const of = (value: string) => clientAddress(request({ "x-vercel-forwarded-for": value }));
    expect(of("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(of("203.0.113.7")).toBe("203.0.113.7");
    expect(of("not:an:address")).toBe("not:an:address");
    expect(of("1:2:3:4:5:6:7:8:9")).toBe("1:2:3:4:5:6:7:8:9");
  });
});
