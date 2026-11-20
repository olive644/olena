import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EssayVisualSupport } from "./essay-visual-support";
import { ESSAY_PROPOSALS } from "../data/essay-catalog";
import { ESSAY_VISUALS } from "../data/essay-visuals";
import briefs from "../../scripts/data/essay-infographic-briefs.json";
afterEach(cleanup);
it("covers all proposals with distinct sourced infographics and matching supporting texts", () => {
  expect(Object.keys(ESSAY_VISUALS).sort()).toEqual(ESSAY_PROPOSALS.map((p) => p.id).sort());
  expect(briefs).toHaveLength(60);
  const hashes = new Set<string>();
  const contexts = new Set<string>();
  for (const proposal of ESSAY_PROPOSALS) {
    const visual = ESSAY_VISUALS[proposal.id];
    const brief = briefs.find((b) => b.id === proposal.id)!;
    const svg = readFileSync(resolve(process.cwd(), "public", visual.src.slice(1)), "utf8");
    hashes.add(createHash("sha256").update(svg).digest("hex"));
    contexts.add(visual.context);
    expect(visual.src).toMatch(/^\/essay-proposals\/essay-\d{2}\.svg$/);
    expect(visual.sourceUrl).toBe(brief.sourceUrl);
    expect(visual.sourceUrl).toMatch(/^https:\/\//);
    expect(visual.context).toBe(brief.context);
    expect(visual.authorText).toBe(brief.authorText);
    expect(visual.discussion).toBe(brief.discussion);
    for (const text of [visual.context, visual.authorText, visual.discussion]) {
      expect(text.split("\n\n")).toHaveLength(2);
    }
    expect(visual.period).toBe(brief.period);
    expect(visual.verifiedOn).toBe("2026-11-20");
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelector("script, image, foreignObject")).toBeNull();
    const text = doc.documentElement.textContent!;
    expect(text).toContain(brief.sourceLabel);
    expect(text).toContain(brief.note);
    expect(text).toContain(brief.period);
    for (const item of brief.items) {
      expect(text).toContain(item.label);
      if ("value" in item) {
        expect(Number.isFinite(item.value)).toBe(true);
        expect(item.value).toBeGreaterThanOrEqual(0);
        if (brief.unit === "%") expect(item.value).toBeLessThanOrEqual(100);
      }
    }
    if (brief.kind === "diagram" || brief.kind === "flow")
      expect(brief.items.every((item) => !("value" in item))).toBe(true);
  }
  expect(hashes.size).toBe(60);
  expect(contexts.size).toBe(60);
});
it.each(["essay-10", "essay-25", "essay-42", "essay-55"])(
  "keeps exhaustive percentages at 100 for %s",
  (id) => {
    const brief = briefs.find((b) => b.id === id)!;
    expect(
      brief.items.reduce((sum, item) => sum + ("value" in item ? item.value : 0), 0),
    ).toBeCloseTo(100, 5);
  },
);
it.each(ESSAY_PROPOSALS.map((p) => p.id))(
  "renders source, reading prompt and full-size access for %s",
  async (id) => {
    const visual = ESSAY_VISUALS[id];
    render(<EssayVisualSupport proposalId={id} />);
    expect(screen.getByRole("img").getAttribute("src")).toBe(visual.src);
    expect(screen.getByRole("img").getAttribute("alt")).toBe(visual.alt);
    expect(screen.getByText(visual.caption)).toBeTruthy();
    expect(screen.getByRole("link", { name: visual.sourceLabel }).getAttribute("href")).toBe(
      visual.sourceUrl,
    );
    const expand = screen.getByRole("button", { name: "Ver imagem em tela cheia" });
    expand.focus();
    fireEvent.click(expand);
    const dialog = screen.getByRole("dialog", { name: visual.title });
    expect(dialog.querySelector(".essay-visual-modal__image")?.getAttribute("src")).toBe(
      visual.src,
    );
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    fireEvent.animationEnd(dialog.querySelector(".essay-visual-modal__content")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(expand));
    fireEvent.click(expand);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    fireEvent.animationEnd(
      screen.getByRole("dialog").querySelector(".essay-visual-modal__content")!,
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
);
it("retains the reference on image failure and resets for a different proposal", () => {
  const { rerender } = render(<EssayVisualSupport proposalId="essay-01" />);
  fireEvent.error(screen.getByRole("img"));
  expect(screen.queryByRole("img")).toBeNull();
  expect(screen.getByRole("status").textContent).toContain("Imagem indisponível");
  expect(screen.getByRole("link", { name: ESSAY_VISUALS["essay-01"].sourceLabel })).toBeTruthy();
  rerender(<EssayVisualSupport proposalId="essay-02" />);
  expect(screen.getByRole("img").getAttribute("src")).toBe(ESSAY_VISUALS["essay-02"].src);
});
