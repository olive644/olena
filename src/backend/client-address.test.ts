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
});
