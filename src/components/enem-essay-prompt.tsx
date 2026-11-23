import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFPageProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { OCR_WORKER_OPTIONS } from "./handwriting-ocr";
import { HelenaLoading } from "./helena-loading";
import { uiText } from "../i18n/runtime";

const promptPages = new Map<string, number>();
function isEnemEssayPrompt(text: string) {
  return /PROPOSTA\s+DE\s+REDACAO/.test(
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase(),
  );
}

export function EnemEssayPrompt({ year, paperUrl }: { year: number; paperUrl: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let documentTask: PDFDocumentLoadingTask | undefined;
    let renderTask: ReturnType<PDFPageProxy["render"]> | undefined;
    let scanner: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | undefined;
    const controller = new AbortController();
    void (async () => {
      try {
        const reader = await import("pdfjs-dist");
        const response = await fetch(paperUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("PDF unavailable");
        const data = await response.arrayBuffer();
        if (!active) return;
        reader.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        documentTask = reader.getDocument({ data });
        const pdf = await documentTask.promise;
        let number = promptPages.get(paperUrl);
        if (!number || number > pdf.numPages) {
          number = undefined;
          for (let pageNumber = 2; pageNumber <= pdf.numPages && active; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            if (
              isEnemEssayPrompt(
                content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
              )
            ) {
              number = pageNumber;
              break;
            }
          }
          if (!number && active) {
            const { createWorker } = await import("tesseract.js");
            scanner = await createWorker("por", 1, OCR_WORKER_OPTIONS);
            // A proposta costuma encerrar Linguagens, antes de Humanas nas provas recentes.
            const preferred = year >= 2017 ? Math.round(pdf.numPages * 0.65) : 2;
            const candidates = Array.from({ length: pdf.numPages - 1 }, (_, i) => i + 2).sort(
              (a, b) => Math.abs(a - preferred) - Math.abs(b - preferred),
            );
            for (const pageNumber of candidates) {
              if (!active) return;
              const page = await pdf.getPage(pageNumber);
              const original = page.getViewport({ scale: 1 });
              const viewport = page.getViewport({ scale: 1800 / original.height });
              const image = document.createElement("canvas");
              image.width = Math.ceil(viewport.width);
              image.height = Math.ceil(viewport.height);
              renderTask = page.render({ canvas: image, viewport });
              await renderTask.promise;
              if (!active) return;
              const result = await scanner.recognize(image);
              if (isEnemEssayPrompt(result.data.text)) {
                number = pageNumber;
                break;
              }
            }
          }
        }
        if (!active) return;
        if (!number || !canvas.current) throw new Error("Essay prompt not found");
        promptPages.set(paperUrl, number);
        const page = await pdf.getPage(number);
        const initial = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 1800 / initial.width });
        const target = canvas.current;
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvas: target, viewport });
        await renderTask.promise;
        if (active) setState("ready");
      } catch {
        if (active) setState("error");
      } finally {
        await scanner?.terminate();
        await documentTask?.destroy();
      }
    })();
    return () => {
      active = false;
      controller.abort();
      renderTask?.cancel();
      void scanner?.terminate();
      void documentTask?.destroy();
    };
  }, [paperUrl, year, revision]);
  return (
    <section
      className="enem-essay-prompt"
      aria-label={uiText("Proposta de redação do Enem {0}", [year])}
    >
      <h1>{uiText("Redação do Enem {0}", [year])}</h1>
      {state === "loading" && (
        <HelenaLoading label={uiText("Localizando a proposta de redação…")} />
      )}
      {state === "error" && (
        <div role="alert">
          <p>{uiText("Não foi possível abrir a proposta de redação.")}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setState("loading");
              setRevision((value) => value + 1);
            }}
          >
            {uiText("Tentar novamente")}
          </button>
        </div>
      )}
      <canvas
        ref={canvas}
        hidden={state !== "ready"}
        aria-label={uiText("Proposta e textos motivadores da redação do Enem {0}", [year])}
      />
    </section>
  );
}
