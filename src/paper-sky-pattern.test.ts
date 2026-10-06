import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("paper sky themes", () => {
  it("provides a light pattern separately from the dark override", () => {
    const css = readFileSync("src/paper-controls.css", "utf8");
    expect(css).toMatch(/:root :is\([^}]+paper-sky-pattern-light\.svg/s);
    expect(css).toMatch(/:root\[data-theme="dark"\] :is\([^}]+paper-sky-pattern\.svg/s);
    expect(readFileSync("public/paper-sky-pattern-light.svg", "utf8")).toContain("#c6b4da");
  });
});
