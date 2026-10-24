import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import originals from "../test/fixtures/achievement-svg-original.json";

describe("cacheable paper artwork", () => {
  for (const original of originals) {
    it(`preserves every shape of ${original.path}`, () => {
      const parser = new DOMParser();
      const before = parser.parseFromString(original.markup, "image/svg+xml");
      const after = parser.parseFromString(readFileSync(original.path, "utf8"), "image/svg+xml");
      const shapes = (document: Document) =>
        [...document.querySelectorAll("path,rect,circle,ellipse,polygon,line")].map((shape) => ({
          tag: shape.tagName,
          attributes: [...shape.attributes].map(({ name, value }) => [name, value]).sort(),
        }));
      expect(after.querySelector("svg")?.getAttribute("viewBox")).toBe(
        before.querySelector("svg")?.getAttribute("viewBox"),
      );
      expect(shapes(after)).toEqual(shapes(before));
      expect(readFileSync(original.file, "utf8")).toContain(
        `/${original.path.replace("public/", "")}#`,
      );
    });
  }
});
