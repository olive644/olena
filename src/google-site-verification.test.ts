import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Google site ownership verification", () => {
  it("serves the public verification token in the initial HTML head", () => {
    const html = readFileSync("index.html", "utf8");
    const page = new DOMParser().parseFromString(html, "text/html");
    const tags = page.head.querySelectorAll('meta[name="google-site-verification"]');
    expect(tags).toHaveLength(1);
    expect(tags[0]?.getAttribute("content")).toBe("LHveDr9iBooWCVv3tQ7dVahCQT8LQTDQ118ZLFsbmZ0");
    expect(page.body.querySelector('meta[name="google-site-verification"]')).toBeNull();
  });
});
