import { expect, it, vi } from "vitest";
import { clearPersonalData } from "./personal-data";

it("wipes device PDFs with personal account data, but not a session-storage cleanup", () => {
  const deleteDatabase = vi.fn();
  vi.stubGlobal("indexedDB", { deleteDatabase });
  clearPersonalData(sessionStorage);
  expect(deleteDatabase).not.toHaveBeenCalled();
  clearPersonalData(localStorage);
  expect(deleteDatabase).toHaveBeenCalledExactlyOnceWith("olena-library-files");
  deleteDatabase.mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(() => clearPersonalData(localStorage)).not.toThrow();
});
