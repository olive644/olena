type PictureInPictureWindow = Window & {
  documentPictureInPicture?: {
    requestWindow(options: { width: number; height: number }): Promise<Window>;
  };
};

export function supportsPomodoroPictureInPicture() {
  return (
    typeof (window as PictureInPictureWindow).documentPictureInPicture?.requestWindow === "function"
  );
}

// A miniatura é uma projeção React do contador original, nunca uma segunda sessão.
export async function openPomodoroWindow(): Promise<Window> {
  const api = (window as PictureInPictureWindow).documentPictureInPicture;
  const floating = api
    ? await api.requestWindow({ width: 320, height: 340 })
    : window.open("", "_blank", "popup=yes,width=320,height=340");
  if (!floating) throw new Error("popup-blocked");
  const doc = floating.document;
  doc.title = "OlenaStudy · Pomodoro";
  const viewport = doc.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  doc.head.append(viewport);
  const base = doc.createElement("base");
  base.href = document.baseURI;
  doc.head.append(base);
  for (const sheet of document.querySelectorAll('link[rel="stylesheet"], style')) {
    doc.head.append(sheet.cloneNode(true));
  }
  doc.body.className = "pomodoro-mini-page";
  const syncAppearance = () => {
    for (const attribute of [
      "data-theme",
      "data-reduce-motion",
      "data-highlight-selections",
      "lang",
      "dir",
    ]) {
      const value = document.documentElement.getAttribute(attribute);
      if (value === null) doc.documentElement.removeAttribute(attribute);
      else doc.documentElement.setAttribute(attribute, value);
    }
  };
  syncAppearance();
  const appearance = new MutationObserver(syncAppearance);
  appearance.observe(document.documentElement, { attributes: true });
  floating.addEventListener("pagehide", () => appearance.disconnect(), { once: true });
  return floating;
}
