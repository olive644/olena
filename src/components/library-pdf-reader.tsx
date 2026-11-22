import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { uiText } from "../i18n/runtime";
import type { StudyMaterial } from "../domain/workspace";
import { libraryFile, pdfFingerprint } from "../data/library-files";
import { HelenaLoading } from "./helena-loading";
import type { EnemSection } from "../data/enem-sections";
import type { EnemLanguage } from "../data/enem-tri";
import { loadQuestionPageIndex, questionPageEvents } from "../data/enem-question-pages";
import { OCR_WORKER_OPTIONS } from "./handwriting-ocr";

const questionOcrText = new Map<string, string>();

function ContinuousPdfPage({ pdf, number }: { pdf: PDFDocumentProxy; number: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(number === 1);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!canvas.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: "900px" },
    );
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    const target = canvas.current;
    if (!target) return;
    let active = true;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    void (async () => {
      try {
        const page = await pdf.getPage(number);
        if (!active) return;
        const initial = page.getViewport({ scale: 1 });
        const displayWidth = target.getBoundingClientRect().width || 1000;
        const density = Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
        const viewport = page.getViewport({
          scale: Math.min(3000, displayWidth * density) / initial.width,
        });
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        task = page.render({ canvas: target, viewport });
        await task.promise;
        if (active) target.dataset["rendered"] = "true";
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
      task?.cancel();
      delete target.dataset["rendered"];
      target.width = 840;
      target.height = 1188;
    };
  }, [pdf, number, visible]);
  return (
    <figure className="enem-continuous-page" data-page={number}>
      <canvas ref={canvas} width={840} height={1188} aria-label={`${uiText("Página")} ${number}`} />
      {failed && <p role="alert">{uiText("Não foi possível renderizar esta página.")}</p>}
    </figure>
  );
}

export default function LibraryPdfReader({
  material,
  scope,
  onChange,
  onExcerpt,
  onReady,
  sourceUrl,
  continuous = false,
  startSection,
  coverOnly = false,
  startLanguage,
  questionOnly = false,
  questionKey,
  indexVariantId,
}: {
  sourceUrl?: string;
  questionOnly?: boolean;
  questionKey?: string;
  indexVariantId?: string;
  continuous?: boolean;
  startSection?: EnemSection;
  coverOnly?: boolean;
  startLanguage?: EnemLanguage;
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
  const continuousPages = useRef<HTMLDivElement>(null);
  const [locating, setLocating] = useState(false);
  const [questionPage, setQuestionPage] = useState<number>();
  useEffect(() => {
    if (!pdf || !continuous || !startSection || coverOnly) return;
    let active = true;
    let scanner: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | undefined;
    void (async () => {
      try {
        if (questionOnly && questionKey && indexVariantId && sourceUrl) {
          const index = await loadQuestionPageIndex(indexVariantId, sourceUrl).catch(() => null);
          const page = index?.pages[questionKey];
          if (page && page <= pdf.numPages) {
            if (active) setQuestionPage(page);
            return;
          }
        }
        const normalize = (text: string) =>
          text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();
        let language: EnemLanguage = "english";
        const seenForeign = new Set<number>();
        const foreignStart = (startSection.question ?? 1) < 91 ? 1 : 91;
        for (let number = 2; number <= pdf.numPages && active; number++) {
          const pdfPage = await pdf.getPage(number);
          let rawText = (await pdfPage.getTextContent()).items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          if (active && number === 2) setLocating(true);
          if (questionOnly && questionKey) {
            let events = questionPageEvents(rawText);
            if (!events.some((event) => event.question)) {
              const cacheKey = `${sourceUrl ?? material.id}:${number}`;
              const cached = questionOcrText.get(cacheKey);
              if (cached !== undefined) rawText = cached;
              else {
                const { createWorker } = await import("tesseract.js");
                scanner ??= await createWorker("por", 1, OCR_WORKER_OPTIONS);
                const target = document.createElement("canvas");
                const original = pdfPage.getViewport({ scale: 1 });
                const viewport = pdfPage.getViewport({ scale: 1800 / original.height });
                target.width = Math.ceil(viewport.width);
                target.height = Math.ceil(viewport.height);
                await pdfPage.render({ canvas: target, viewport }).promise;
                if (!active) return;
                rawText = (await scanner.recognize(target)).data.text;
                questionOcrText.set(cacheKey, rawText);
              }
              events = questionPageEvents(rawText);
            }
            for (const event of events) {
              if (event.language) {
                language = event.language;
                continue;
              }
              const n = event.question;
              if (!n) continue;
              let key = `q:${n}`;
              if (startSection.id === "languages" && n >= foreignStart && n < foreignStart + 5) {
                key = `${language}:${n}`;
                if (language === "english" && seenForeign.has(n)) key = `spanish:${n}`;
                seenForeign.add(n);
              }
              if (key === questionKey) {
                if (active) setQuestionPage(number);
                return;
              }
            }
            continue;
          }
          const text = normalize(rawText);
          if (
            startSection.id === "languages" &&
            startLanguage === "spanish" &&
            !text.includes("ESPANHOL")
          )
            continue;
          if (
            startSection.question
              ? questionPageEvents(rawText).some(
                  (event) => event.question === startSection.question,
                )
              : text.includes(normalize(startSection.heading ?? "PROPOSTA DE REDAÇÃO"))
          ) {
            if (active && questionOnly) setQuestionPage(number);
            if (active && !questionOnly)
              continuousPages.current
                ?.querySelector(`[data-page="${number}"]`)
                ?.scrollIntoView({ block: "start" });
            break;
          }
        }
        if (active && questionOnly)
          setError(uiText("Não foi possível localizar a página desta questão. Tente novamente."));
      } catch {
        if (active)
          setError(
            uiText(
              questionOnly
                ? "Não foi possível localizar a página desta questão. Tente novamente."
                : "Não foi possível localizar a área. A prova completa continua disponível para leitura.",
            ),
          );
      } finally {
        await scanner?.terminate();
        if (active) setLocating(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    pdf,
    continuous,
    startSection,
    coverOnly,
    startLanguage,
    questionOnly,
    questionKey,
    indexVariantId,
    sourceUrl,
    material.id,
  ]);
  const page = Math.min(pdf?.numPages ?? Infinity, material.page ?? 1);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let passwordRequired = false;
    let dispose: (() => void) | undefined;
    void (async () => {
      try {
        const file = sourceUrl ? undefined : await libraryFile(scope, material.id);
        if (!active) return;
        if (!file && !sourceUrl) {
          setMissing(true);
          return;
        }
        const [reader, worker] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        if (!active) return;
        setError("");
        setPdf(undefined);
        setMissing(false);
        reader.GlobalWorkerOptions.workerSrc = worker.default;
        let data: ArrayBuffer;
        if (sourceUrl) {
          // Carrega o arquivo completo: servidores externos podem falhar nas requisições Range do PDF.js.
          const load = async () => {
            const response = await fetch(sourceUrl, { signal: controller.signal });
            if (!response.ok) throw new Error(`PDF HTTP ${response.status}`);
            return response.arrayBuffer();
          };
          try {
            data = await load();
          } catch (failure) {
            if (controller.signal.aborted) throw failure;
            data = await load();
          }
        } else data = await file!.arrayBuffer();
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
      } catch (failure) {
        if (active && sourceUrl) console.warn("Official PDF loading failed", failure);
        if (active && !passwordRequired)
          setError(
            uiText(
              sourceUrl
                ? "Não foi possível carregar o PDF oficial. Tente novamente."
                : "Não foi possível abrir o PDF. Tente selecionar o arquivo novamente.",
            ),
          );
      }
    })();
    return () => {
      active = false;
      controller.abort();
      dispose?.();
    };
  }, [scope, material.id, revision, sourceUrl]);
  useEffect(() => {
    if (!pdf || continuous) return;
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
        // A navegação pode cancelar o render enquanto o texto ainda está carregando.
        void render.promise.catch(() => {});
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
  }, [pdf, page, onReady, continuous]);
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
      {!sourceUrl && (
        <p className="library-device-notice">
          {uiText(
            "O arquivo PDF fica neste dispositivo. Organização e anotações acompanham o workspace da conta.",
          )}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {sourceUrl && error && (
        <div className="library-tools">
          <button
            type="button"
            className="shelf-wood-button"
            onClick={() => setRevision((value) => value + 1)}
          >
            {uiText("Tentar novamente")}
          </button>
          <a
            className="shelf-wood-button"
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {uiText("Abrir PDF oficial")}
          </a>
        </div>
      )}
      {!sourceUrl && (missing || error) && (
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
      {locating && <p role="status">{uiText("Abrindo área selecionada…")}</p>}
      {pdf && continuous && (
        <div
          ref={continuousPages}
          className={`enem-continuous-pages${questionOnly ? " is-question-only" : ""}`}
          data-page-count={questionOnly ? (questionPage ? 1 : 0) : pdf.numPages}
        >
          {questionOnly
            ? questionPage && (
                <ContinuousPdfPage key={questionPage} pdf={pdf} number={questionPage} />
              )
            : Array.from({ length: coverOnly ? 1 : pdf.numPages }, (_, index) => (
                <ContinuousPdfPage key={index + 1} pdf={pdf} number={index + 1} />
              ))}
        </div>
      )}
      {pdf && !continuous && (
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
