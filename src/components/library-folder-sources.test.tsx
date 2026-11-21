import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { LibraryFolderSources } from "./library-folder-sources";
import type { StudyMaterial } from "../domain/workspace";
afterEach(cleanup);
const source = (
  id: string,
  kind: StudyMaterial["kind"],
  extra: Partial<StudyMaterial> = {},
): StudyMaterial => ({
  id,
  kind,
  title: id,
  content: "x",
  subjectId: "s",
  collectionId: "folder",
  createdAt: "2026-11-17",
  ...extra,
});
it("renders only distinct real source types and leaves empty folders empty", () => {
  const { container, rerender } = render(
    <LibraryFolderSources collectionId="folder" materials={[]} />,
  );
  expect(container.innerHTML).toBe("");
  rerender(
    <LibraryFolderSources
      collectionId="folder"
      materials={[
        source("a", "pdf"),
        source("b", "pdf"),
        source("c", "link"),
        source("d", "pdf", { tags: ["source-goodnotes"] }),
        source("e", "text"),
        source("f", "image"),
        source("generated", "text", { tags: ["folder-summary"] }),
        source("quiz", "text", { tags: ["folder-quiz"] }),
        source("exam", "text", { tags: ["folder-exam"] }),
        source("archived", "link", { archived: true }),
        source("elsewhere", "pdf", { collectionId: "elsewhere" }),
      ]}
    />,
  );
  expect(
    [...container.querySelectorAll("[data-source-kind]")].map((e) =>
      e.getAttribute("data-source-kind"),
    ),
  ).toEqual(["pdf", "video", "goodnotes", "document", "image"]);
});
it("does not create fake documents from generated materials", () => {
  const { container } = render(
    <LibraryFolderSources
      collectionId="folder"
      materials={[
        source("summary", "text", { tags: ["folder-summary"] }),
        source("old", "pdf", { archived: true }),
        source("other", "text", { collectionId: "other" }),
      ]}
    />,
  );
  expect(container.innerHTML).toBe("");
});
