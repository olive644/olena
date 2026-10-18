import { uiText, useLanguage } from "../i18n/runtime";
import { useEffect, useState } from "react";
import { HelenaLoading } from "../components/helena-loading";
import { roomAppCheckToken } from "../data/room-app-check";

export default function NotebookReader({ token }: { token: string }) {
  useLanguage();

  const [pages, setPages] = useState<{ title: string; image: string }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const appCheck = await roomAppCheckToken();
        const response = await fetch("/api/notebook-collab?action=view-read", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(appCheck ? { "X-Firebase-AppCheck": appCheck } : {}),
          },
          body: JSON.stringify({ token }),
        });
        const result = (await response.json()) as {
          pages?: { title: string; image: string }[];
          error?: string;
        };
        if (!response.ok || !result.pages) throw new Error(result.error || uiText(2279));
        setPages(result.pages);
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(caught instanceof Error ? caught.message : uiText(1336));
      }
    })();
    return () => controller.abort();
  }, [token]);
  return (
    <main className="notebook-reader">
      <header>
        <span>{uiText(1337)}</span>
        <h1>{uiText(1338)}</h1>
        <p>{uiText(1339)}</p>
      </header>
      {error ? (
        <p role="alert">{uiText(error)}</p>
      ) : !pages.length ? (
        <HelenaLoading label={uiText(1340)} />
      ) : (
        pages.map((page, i) => (
          <figure key={i}>
            <figcaption>
              {i + 1}. {page.title}
            </figcaption>
            <img src={page.image} alt={page.title} />
          </figure>
        ))
      )}
    </main>
  );
}
