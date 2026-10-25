import { act, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import LibraryPdfReader from "./library-pdf-reader";

const mocks = vi.hoisted(() => ({ file: vi.fn(), document: vi.fn() }));
vi.mock("../data/library-files", () => ({ libraryFile: mocks.file, pdfFingerprint: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ getDocument: mocks.document, GlobalWorkerOptions: {} }));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "worker.js" }));

it("keeps the password explanation when cancellation rejects the loading task", async () => {
  let rejectTask: (reason: Error) => void = () => {};
  const promise = new Promise<never>((_resolve, reject) => {
    rejectTask = reject;
  });
  const task = {
    promise,
    destroy: vi.fn(() => {
      rejectTask(new Error("aborted"));
    }),
    onPassword: undefined as (() => void) | undefined,
  };
  mocks.file.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(4) });
  mocks.document.mockReturnValue(task);
  render(
    <LibraryPdfReader
      material={{
        id: "pdf",
        title: "PDF",
        content: "hash",
        kind: "pdf",
        subjectId: "math",
        createdAt: "2026-10-24",
      }}
      scope="owner"
      onChange={vi.fn()}
      onExcerpt={vi.fn()}
    />,
  );
  await waitFor(() => expect(mocks.document).toHaveBeenCalledOnce());
  await act(async () => {
    task.onPassword?.();
  });
  expect(screen.getByRole("alert").textContent).toBe(
    "PDF protegido por senha. Use uma cópia desbloqueada.",
  );
  expect(task.destroy).toHaveBeenCalledOnce();
});
