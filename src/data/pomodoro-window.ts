type PictureInPictureWindow = Window & {
  documentPictureInPicture?: {
    requestWindow(options: { width: number; height: number }): Promise<Window>;
  };
};

// A miniatura é uma projeção React do contador original, nunca uma segunda sessão.
export async function openPomodoroWindow(): Promise<Window> {
  const api = (window as PictureInPictureWindow).documentPictureInPicture;
  const floating = api
    ? await api.requestWindow({ width: 320, height: 340 })
    : window.open("", "_blank", "popup=yes,width=320,height=340");
  if (!floating) throw new Error("popup-blocked");
  const doc = floating.document;
  doc.title = document.title;
  const viewport = doc.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  doc.head.append(viewport);
  for (const sheet of document.querySelectorAll('link[rel="stylesheet"], style')) {
    doc.head.append(sheet.cloneNode(true));
  }
  doc.body.className = "pomodoro-mini-page";
  const syncAppearance = () => {
    const source = document.documentElement;
    const root = doc.documentElement;
    Object.assign(root.dataset, source.dataset);
    root.lang = source.lang;
    root.dir = source.dir;
  };
  syncAppearance();
  const appearance = new MutationObserver(syncAppearance);
  appearance.observe(document.documentElement, { attributes: true });
  floating.addEventListener("pagehide", () => appearance.disconnect(), { once: true });
  return floating;
}
