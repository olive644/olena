import { expect, it } from "vitest";
import { brazilianHoliday, easterDate } from "./brazilian-holidays";

it("marks the national calendar, moving Easter dates without treating optional days as holidays", () => {
  expect(easterDate(2026)).toBe("2026-04-05");
  expect(easterDate(2027)).toBe("2027-03-28");
  expect(brazilianHoliday("2026-04-03")).toBe("Paixão de Cristo");
  expect(brazilianHoliday("2027-03-26")).toBe("Paixão de Cristo");
  expect(brazilianHoliday("2026-10-12")).toBe("Nossa Senhora Aparecida");
  expect(brazilianHoliday("2026-11-20")).toContain("Consciência Negra");
  expect(brazilianHoliday("2026-02-17")).toBeUndefined();
  expect(brazilianHoliday("2026-06-04")).toBeUndefined();
});
