import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import baseline from "../test/fixtures/paper-svg-budget-baseline.json";
import { AgendaDetailIcon } from "./agenda-detail-icon";
import { AgendaToolbarIcon } from "./agenda-toolbar-icon";
import { PaperMoonMark } from "./paper-moon-mark";
import { BingoPlanet } from "./bingo-planet";
import { NotebookToolIcon } from "./notebook-tool-icon";
import { OliverAttributeIcon } from "./oliver-card-icons";

const files: Record<string, string> = {
  AgendaDetailIcon: "agenda-detail",
  AgendaToolbarIcon: "agenda-toolbar",
  PaperMoonMark: "paper-bookmark",
  BingoPlanet: "bingo-planets",
  NotebookToolIcon: "notebook-tools",
  OliverAttributeIcon: "oliver-attributes",
  MathChestPart: "math-chests",
};
it.each(baseline)("preserva paths, cores, traços e transforms: $component $props", (entry) => {
  const key =
    entry.props.name ??
    entry.props.kind ??
    (entry.component === "BingoPlanet"
      ? `planet-${entry.props.index}`
      : `${entry.props.motif}-${entry.props.compact ? "compact" : "ribbon"}-${entry.props.stitched ? "stitched" : "plain"}`);
  const sprite = new DOMParser().parseFromString(
    readFileSync(`public/navigation-icons/paper/${files[entry.component]}.svg`, "utf8"),
    "image/svg+xml",
  );
  const symbol = sprite.getElementById(key);
  expect(symbol?.getAttribute("viewBox")).toBe(entry.viewBox);
  const paths = [...symbol!.querySelectorAll("path")].map((node) => {
    const transforms: string[] = [];
    let parent = node.parentElement;
    while (parent && parent !== symbol) {
      const transform = parent.getAttribute("transform");
      if (transform) transforms.unshift(transform);
      parent = parent.parentElement;
    }
    return {
      attrs: Object.fromEntries(
        [...node.attributes]
          .map((attr) => [attr.name, attr.value])
          .sort(([a], [b]) => a!.localeCompare(b!)),
      ),
      transforms,
    };
  });
  expect(paths).toEqual(entry.paths);
  const image =
    entry.component === "AgendaDetailIcon" ? (
      <AgendaDetailIcon name={entry.props.name as Parameters<typeof AgendaDetailIcon>[0]["name"]} />
    ) : entry.component === "AgendaToolbarIcon" ? (
      <AgendaToolbarIcon
        name={entry.props.name as Parameters<typeof AgendaToolbarIcon>[0]["name"]}
      />
    ) : entry.component === "PaperMoonMark" ? (
      <PaperMoonMark
        motif={entry.props.motif as "sun" | "moon"}
        compact={entry.props.compact ?? false}
        stitched={entry.props.stitched ?? false}
      />
    ) : entry.component === "NotebookToolIcon" ? (
      <NotebookToolIcon name={entry.props.name as "cover" | "index"} />
    ) : entry.component === "OliverAttributeIcon" ? (
      <OliverAttributeIcon kind={entry.props.kind as "power" | "life" | "stamina"} />
    ) : entry.component === "BingoPlanet" ? (
      <BingoPlanet index={entry.props.index!} />
    ) : null;
  if (image) {
    const { container } = render(image);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(entry.viewBox);
    expect(container.querySelector("use")?.getAttribute("href")).toBe(
      `/navigation-icons/paper/${files[entry.component]}.svg#${key}`,
    );
    cleanup();
  }
});

it("mantém os dígitos do planeta separados da arte", () => {
  const { container } = render(<BingoPlanet index={3} number="23" />);
  expect(
    [...container.querySelectorAll(".bingo-planet-digits use")].map((node) =>
      node.getAttribute("href"),
    ),
  ).toEqual(["/paper-digits.svg#digit-2", "/paper-digits.svg#digit-3"]);
  cleanup();
});
