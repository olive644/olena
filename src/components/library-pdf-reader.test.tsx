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

it("retries a remote failure and passes the complete PDF bytes to PDF.js", async () => {
  const bytes = new ArrayBuffer(8);
  const fetchPdf = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("Network error"))
    .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => bytes });
  vi.stubGlobal("fetch", fetchPdf);
  mocks.document.mockClear();
  mocks.document.mockReturnValue({ promise: new Promise(() => {}), destroy: vi.fn() });
  try {
    const { unmount } = render(
      <LibraryPdfReader
        sourceUrl="https://download.inep.gov.br/prova.pdf"
        material={{
          id: "remote",
          title: "Enem",
          content: "",
          kind: "pdf",
          subjectId: "enem",
          createdAt: "2026-11-21",
        }}
        scope="owner"
        onChange={vi.fn()}
        onExcerpt={vi.fn()}
      />,
    );
    await waitFor(() => expect(mocks.document).toHaveBeenCalledWith({ data: bytes }));
    expect(fetchPdf).toHaveBeenCalledTimes(2);
    unmount();
  } finally {
    vi.unstubAllGlobals();
  }
});

it("abre somente a página indexada da questão 9, mesmo quando o PDF não tem texto pesquisável", async () => {
  const page = {
    getViewport: () => ({ width: 600, height: 840 }),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
    getTextContent: vi.fn(async () => ({ items: [] })),
  };
  const pdf = {
    numPages: 32,
    getPage: vi.fn<(number: number) => Promise<typeof page>>().mockResolvedValue(page),
  };
  mocks.document.mockClear();
  mocks.document.mockReturnValue({ promise: Promise.resolve(pdf), destroy: vi.fn() });
  const url = "https://download.inep.gov.br/prova.pdf";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) =>
      input.endsWith(".json")
        ? {
            ok: true,
            json: async () => ({
              version: 1,
              variantId: "abcdef01234567",
              paperUrl: url,
              pageCount: 32,
              pages: { "q:9": 7 },
            }),
          }
        : { ok: true, arrayBuffer: async () => new ArrayBuffer(4) },
    ),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe() {
        this.callback([{ isIntersecting: true }]);
      }
      disconnect() {}
    },
  );
  const view = render(
    <LibraryPdfReader
      sourceUrl={url}
      continuous
      questionOnly
      questionKey="q:9"
      indexVariantId="abcdef01234567"
      startSection={{ id: "languages", label: "Linguagens", question: 9, color: "green" }}
      material={{
        id: "pdf",
        title: "Enem",
        content: url,
        kind: "pdf",
        subjectId: "enem",
        createdAt: "2026-11-22",
      }}
      scope="test"
      onChange={vi.fn()}
      onExcerpt={vi.fn()}
    />,
  );
  try {
    await waitFor(() =>
      expect(view.container.querySelector("canvas")?.getAttribute("data-rendered")).toBe("true"),
    );
    expect(view.container.querySelectorAll("canvas")).toHaveLength(1);
    expect(view.container.querySelector("figure")?.getAttribute("data-page")).toBe("7");
    expect(pdf.getPage.mock.calls.map((call) => call[0])).toEqual([7]);
    expect(page.getTextContent).not.toHaveBeenCalled();
  } finally {
    view.unmount();
    vi.unstubAllGlobals();
  }
});
