import { expect, it } from "vitest";
import alphabet from "../../public/paper-monochrome-alphabet.svg?raw";
import { PAPER_LETTER_PATHS } from "./paper-letter-paths";

it("keeps all 26 inline glyphs identical to the approved paper alphabet", () => {
  const approved = Object.fromEntries(
    [...alphabet.matchAll(/<symbol id="letter-([^"]+)"[^>]*><path[^>]* d="([^"]+)"/g)].map(
      (match) => [match[1], match[2]],
    ),
  );
  expect(Object.keys(approved)).toHaveLength(26);
  expect(PAPER_LETTER_PATHS).toEqual(approved);
});
