import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron-auth";

const request = (authorization?: string) =>
  new Request("https://helena.example/api/room-cleanup", {
    headers: authorization === undefined ? {} : { authorization },
  });

describe("autorização do cron", () => {
  it("aceita só o segredo exato", () => {
    expect(isCronAuthorized(request("Bearer segredo"), "segredo")).toBe(true);
    expect(isCronAuthorized(request("Bearer segredo2"), "segredo")).toBe(false);
    expect(isCronAuthorized(request("Bearer segred"), "segredo")).toBe(false);
    expect(isCronAuthorized(request("segredo"), "segredo")).toBe(false);
  });

  it("recusa quando falta o cabeçalho", () => {
    expect(isCronAuthorized(request(), "segredo")).toBe(false);
  });

  it("recusa tudo quando o segredo não está configurado", () => {
    expect(isCronAuthorized(request("Bearer "), "")).toBe(false);
    expect(isCronAuthorized(request("Bearer undefined"), undefined)).toBe(false);
    expect(isCronAuthorized(request(), undefined)).toBe(false);
  });
});
