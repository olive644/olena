import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { PaperEditorIcon } from "./paper-editor-icon";

it("ajustes compartilha engrenagem facetada com oito dentes e núcleo amarelo", () => {
  const { container } = render(<PaperEditorIcon name="settings" />);
  const icon = container.querySelector('svg[data-paper-editor-icon="settings"]');
  expect(icon?.getAttribute("viewBox")).toBe("0 0 48 48");
  expect(icon?.querySelectorAll("g")).toHaveLength(8);
  expect(icon?.querySelector('path[fill="#FACC15"]')).not.toBeNull();
  expect(icon?.getAttribute("aria-hidden")).toBe("true");
});
