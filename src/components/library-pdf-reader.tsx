import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { uiText } from "../i18n/runtime";
import type { StudyMaterial } from "../domain/workspace";
import { libraryFile, pdfFingerprint } from "../data/library-files";
import { HelenaLoading } from "./helena-loading";

export default function LibraryPdfReader({
  material,
  scope,
  onChange,
  onExcerpt,
  onReady,
}: {
  material: StudyMaterial;
  scope: string;
  onChange: (changes: Partial<StudyMaterial>) => void;
  onExcerpt: (text: string, page: number) => void;
  onReady?: () => void;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [revision, setRevision] = useState(0);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<number[]>([]);
  const [searching, setSearching] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const page = Math.min(pdf?.numPages ?? Infinity, material.page ?? 1);
  useEffect(() => {
    let active = true;
    let passwordRequired = false;
    let dispose: (() => void) | undefined;
    void (async () => {
      try {
        const file = await libraryFile(scope, material.id);
        if (!active) return;
        if (!file) {
          setMissing(true);
          return;
        }
        const [reader, worker] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        if (!active) return;
        reader.GlobalWorkerOptions.workerSrc = worker.default;
        const data = await file.arrayBuffer();
        if (!active) return;
        const task = reader.getDocument({ data });
        dispose = () => {
          void task.destroy();
        };
        task.onPassword = () => {
          passwordRequired = true;
          if (active) setError(uiText("PDF protegido por senha. Use uma cópia desbloqueada."));
          void task.destroy();
        };
        const document = await task.promise;
        if (active) {
          setPdf(document);
          setMissing(false);
        }
      } catch {
        if (active && !passwordRequired)
          setError(uiText("Não foi possível abrir o PDF. Tente selecionar o arquivo novamente."));
      }
    })();
    return () => {
      active = false;
      dispose?.();
    };
  }, [scope, material.id, revision]);
  useEffect(() => {
    if (!pdf) return;
    let active = true;
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    void (async () => {
      try {
        const source = await pdf.getPage(page);
        if (!active || !canvas.current) return;
        const initial = source.getViewport({ scale: 1 });
        const viewport = source.getViewport({
          scale: Math.min(1.5, 1400 / initial.width, 2000 / initial.height),
        });
        const target = canvas.current;
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        render = source.render({ canvas: target, viewport });
        const content = await source.getTextContent();
        if (active) setText(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
        await render.promise;
        if (active) onReady?.();
      } catch {
        if (active) setError(uiText("Não foi possível renderizar esta página."));
      }
    })();
    return () => {
      active = false;
      render?.cancel();
    };
  }, [pdf, page, onReady]);
  useEffect(() => {
    if (!pdf || !query.trim()) return;
    let active = true;
    const timer = setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const found: number[] = [];
          for (let index = 1; index <= pdf.numPages && active; index++) {
            const content = await (await pdf.getPage(index)).getTextContent();
            if (
              content.items
                .map((item) => ("str" in item ? item.str : ""))
                .join(" ")
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase())
            )
              found.push(index);
          }
          if (active) setMatches(found);
        } catch {
          if (active) setError(uiText("Não foi possível pesquisar o PDF."));
        } finally {
          if (active) setSearching(false);
        }
      })();
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pdf, query]);
  return (
    <section className="library-pdf" aria-label={uiText("Leitor de PDF")}>
      <p className="library-device-notice">
        {uiText(
          "O arquivo PDF fica neste dispositivo. Organização e anotações acompanham o workspace da conta.",
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      {(missing || error) && (
        <label className="field">
          <span>{uiText("Selecionar o PDF original")}</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                if ((await pdfFingerprint(file)) !== material.content) throw new Error();
                await libraryFile(scope, material.id, file);
                setError("");
                setMissing(false);
                setRevision((value) => value + 1);
              } catch {
                setError(uiText("Selecione o mesmo PDF original, com até 20 MB."));
              }
            }}
          />
        </label>
      )}
      {!pdf && !missing && !error && <HelenaLoading compact label={uiText("Abrindo PDF")} />}
      {pdf && (
        <>
          <div className="library-tools">
            <button
              className="secondary-button"
              disabled={page <= 1}
              onClick={() => onChange({ page: page - 1 })}
            >
              {uiText("Anterior")}
            </button>
            <label>
              {uiText("Página")}{" "}
              <input
                type="number"
                min={1}
                max={pdf.numPages}
                value={page}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value > 0 && value <= pdf.numPages)
                    onChange({ page: value });
                }}
              />
            </label>
            <span>/ {pdf.numPages}</span>
            <button
              className="secondary-button"
              disabled={page >= pdf.numPages}
              onClick={() => onChange({ page: page + 1 })}
            >
              {uiText("Próxima")}
            </button>
            <button
              className="secondary-button"
              aria-pressed={material.bookmarks?.includes(page) ?? false}
              onClick={() =>
                onChange({
                  bookmarks: material.bookmarks?.includes(page)
                    ? material.bookmarks.filter((item) => item !== page)
                    : [...(material.bookmarks ?? []), page],
                })
              }
            >
              {uiText("Marcar página")}
            </button>
          </div>
          <label className="field">
            <span>{uiText("Pesquisar no PDF")}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setMatches([]);
                setSearching(Boolean(event.target.value.trim()));
              }}
            />
          </label>
          {query && (
            <div role="status">
              {searching
                ? uiText("Pesquisando")
                : matches.length
                  ? matches.map((match) => (
                      <button
                        className="secondary-button"
                        key={match}
                        onClick={() => onChange({ page: match })}
                      >
                        {match}
                      </button>
                    ))
                  : uiText("Nenhum resultado")}
            </div>
          )}
          <div className="library-tools">
            {material.bookmarks?.map((bookmark) => (
              <button
                className="secondary-button"
                key={bookmark}
                onClick={() => onChange({ page: bookmark })}
              >
                {uiText("Página")} {bookmark}
              </button>
            ))}
          </div>
          <canvas ref={canvas} aria-label={uiText("Página do PDF")} />
          <details open>
            <summary>{uiText("Texto selecionável da página")}</summary>
            <p
              className="library-readable"
              onMouseUp={() => {
                const selection = window.getSelection();
                if (
                  selection?.toString().trim() &&
                  selection.anchorNode &&
                  selection.focusNode &&
                  selection.anchorNode.parentElement?.closest(".library-readable") &&
                  selection.focusNode.parentElement?.closest(".library-readable")
                )
                  onExcerpt(selection.toString().slice(0, 10000), page);
              }}
            >
              {text || uiText("Esta página não contém texto selecionável.")}
            </p>
          </details>
        </>
      )}
    </section>
  );
}
