import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { HelenaLoading } from "./helena-loading";

function prepareImportedPage(
  source: CanvasImageSource,
  width: number,
  height: number,
  sizePercent: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível abrir a página.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1200, 1600);
  const scale = Math.min(1200 / width, 1600 / height) * (sizePercent / 100);
  context.drawImage(
    source,
    (1200 - width * scale) / 2,
    (1600 - height * scale) / 2,
    width * scale,
    height * scale,
  );
  for (const quality of [0.85, 0.65, 0.45]) {
    const result = canvas.toDataURL("image/jpeg", quality);
    if (result.length <= 500_000) return result;
  }
  throw new Error("Esta imagem é muito detalhada. Importe uma versão menor.");
}

export function PageImport({
  onImport,
  onClose,
}: {
  onImport: (image: string) => void;
  onClose: () => void;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const taskRef = useRef<{ destroy: () => Promise<void> } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    fileRef.current?.focus();
  }, []);
  useEffect(
    () => () => {
      generation.current++;
      void taskRef.current?.destroy();
    },
    [],
  );

  function keepSource(image: CanvasImageSource, width: number, height: number) {
    const scale = Math.min(1, 1200 / width, 1600 / height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    setSource(canvas);
  }

  const prepared = useMemo(() => {
    if (!source) return { preview: "", error: "" };
    try {
      return {
        preview: prepareImportedPage(source, source.width, source.height, size),
        error: "",
      };
    } catch (caught) {
      return {
        preview: "",
        error:
          caught instanceof Error ? caught.message : "Não foi possível redimensionar a imagem.",
      };
    }
  }, [source, size]);
  const preview = prepared.preview;

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let render: { cancel: () => void } | undefined;
    void (async () => {
      try {
        const source = await pdf.getPage(page);
        if (cancelled) return;
        const size = source.getViewport({ scale: 1 });
        const viewport = source.getViewport({
          scale: Math.min(1200 / size.width, 1600 / size.height),
        });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const job = source.render({ canvas, viewport });
        render = job;
        await job.promise;
        if (!cancelled) keepSource(canvas, canvas.width, canvas.height);
      } catch {
        if (!cancelled) setError("Não foi possível ler esta página do PDF.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [pdf, page]);

  async function open(file: File) {
    const id = ++generation.current;
    setPdf(null);
    setSource(null);
    setSize(100);
    setError("");
    setBusy(true);
    try {
      await taskRef.current?.destroy();
      taskRef.current = null;
      if (id !== generation.current) return;
      if (file.size > 20 * 1024 * 1024) throw new Error("Escolha um arquivo de até 20 MB.");
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const [reader, worker] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        if (id !== generation.current) return;
        reader.GlobalWorkerOptions.workerSrc = worker.default;
        const data = await file.arrayBuffer();
        if (id !== generation.current) return;
        const task = reader.getDocument({ data });
        taskRef.current = task;
        task.onPassword = () => {
          setError("Este PDF tem senha. Importe uma cópia desbloqueada.");
          setBusy(false);
          void task.destroy();
        };
        const loaded = await task.promise;
        if (id !== generation.current) {
          await task.destroy();
          return;
        }
        setPage(1);
        setPdf(loaded);
      } else {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
          throw new Error("Escolha PDF, PNG, JPEG ou WebP.");
        const bitmap = await createImageBitmap(file);
        try {
          if (id === generation.current) keepSource(bitmap, bitmap.width, bitmap.height);
        } finally {
          bitmap.close();
        }
      }
    } catch (caught) {
      if (id === generation.current)
        setError(caught instanceof Error ? caught.message : "Não foi possível importar o arquivo.");
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }

  return (
    <section
      className="editor-file-panel"
      aria-label="Importar página"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <h3>Importar página</h3>
      <p>
        Escolha uma imagem ou uma página de PDF para anotar por cima. Suas anotações atuais serão
        mantidas.
      </p>
      <input
        ref={fileRef}
        type="file"
        aria-label="Arquivo para importar"
        accept=".pdf,image/png,image/jpeg,image/webp"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void open(file);
          event.target.value = "";
        }}
      />
      {pdf && (
        <label>
          Página do PDF{" "}
          <input
            type="number"
            min={1}
            max={pdf.numPages}
            value={page}
            disabled={busy}
            onChange={(event) => {
              const next = Math.max(1, Math.min(pdf.numPages, Number(event.target.value) || 1));
              if (next === page) return;
              setBusy(true);
              setSource(null);
              setError("");
              setPage(next);
            }}
          />{" "}
          de {pdf.numPages}
        </label>
      )}
      {busy && <HelenaLoading label="Preparando página" compact />}
      {(error || prepared.error) && <p role="alert">{error || prepared.error}</p>}
      {source && (
        <label className="editor-import-size">
          <span>Tamanho da imagem</span>
          <input
            type="range"
            min={25}
            max={150}
            step={5}
            value={size}
            aria-label="Tamanho da imagem"
            onChange={(event) => setSize(Number(event.target.value))}
          />
          <output>{size}%</output>
        </label>
      )}
      {preview && <img src={preview} alt="Prévia da página importada" />}
      <div>
        <button type="button" disabled={!preview || busy} onClick={() => onImport(preview)}>
          Usar esta página
        </button>
        <button type="button" onClick={onClose}>
          Cancelar importação
        </button>
      </div>
    </section>
  );
}
