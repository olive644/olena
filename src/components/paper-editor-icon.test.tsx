import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { PaperEditorIcon } from "./paper-editor-icon";
import { readFileSync } from "node:fs";

it("ajustes compartilha engrenagem facetada com oito dentes e núcleo amarelo", () => {
  const { container } = render(<PaperEditorIcon name="settings" />);
  const icon = container.querySelector('svg[data-paper-editor-icon="settings"]');
  expect(icon?.getAttribute("viewBox")).toBe("0 0 48 48");
  expect(icon?.querySelector("use")?.getAttribute("href")).toBe(
    "/navigation-icons/paper/paper-editor-icon.svg#settings",
  );
  const art = new DOMParser()
    .parseFromString(
      readFileSync("public/navigation-icons/paper/paper-editor-icon.svg", "utf8"),
      "image/svg+xml",
    )
    .getElementById("settings");
  expect(art?.querySelectorAll("g")).toHaveLength(8);
  expect(art?.querySelector('path[fill="#FACC15"]')).not.toBeNull();
  expect(icon?.getAttribute("aria-hidden")).toBe("true");
});
