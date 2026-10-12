import { expect, it } from "vitest";
import { resolveBrazilianZone } from "./agenda-time-zone";
it("uses the account Brazilian zone on every device and falls back to Brasília", () => {
  expect(resolveBrazilianZone("America/Manaus", "Europe/Lisbon")).toBe("America/Manaus");
  expect(resolveBrazilianZone(null, "America/Rio_Branco")).toBe("America/Rio_Branco");
  expect(resolveBrazilianZone("UTC", "Europe/Lisbon")).toBe("America/Sao_Paulo");
});
