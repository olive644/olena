import { useCallback, useEffect, useRef, useState } from "react";

type MascotProps = {
  open: boolean;
  motion: string;
  tilt: { x: number; y: number };
  hover: boolean;
};

/** O botão pai mantém foco, clique e arraste. O frame só desenha o modelo. */
export function HelenaMascot(props: MascotProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const state = useRef(props);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  const send = useCallback(() => {
    const value = state.current;
    frame.current?.contentWindow?.postMessage(
      {
        type: "helena-state",
        open: value.open,
        motion: value.motion,
        x: value.tilt.y / 18,
        y: value.tilt.x / 15,
        hover: value.hover,
        reduced:
          (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true) ||
          document.documentElement.dataset["reduceMotion"] === "true",
        visible:
          !document.hidden &&
          !(value.open && window.innerWidth < 900) &&
          !document.querySelector('dialog[open], [aria-modal="true"]'),
      },
      window.location.origin,
    );
  }, []);
  useEffect(() => {
    state.current = props;
    send();
  }, [props, send]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let activation: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      const quiet =
        (media?.matches ?? true) || document.documentElement.dataset["reduceMotion"] === "true";
      setReduced(quiet);
      if (activation) clearTimeout(activation);
      if (quiet) {
        setActive(false);
        setReady(false);
      } else if (!document.hidden) {
        activation = setTimeout(() => setActive(true), 350);
      }
      send();
    };
    const message = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow)
        return;
      const data = event.data;
      if (typeof data !== "object" || data === null || !("type" in data) || !("ready" in data))
        return;
      if (data.type === "helena-ready" && typeof data.ready === "boolean") {
        setReady(data.ready);
        send();
      }
    };
    const preferences = new MutationObserver(refresh);
    preferences.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-reduce-motion"],
    });
    const dialogs = new MutationObserver(send);
    dialogs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "aria-modal"],
    });
    media?.addEventListener?.("change", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("resize", send);
    window.addEventListener("message", message);
    refresh();
    return () => {
      if (activation) clearTimeout(activation);
      preferences.disconnect();
      dialogs.disconnect();
      media?.removeEventListener?.("change", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("resize", send);
      window.removeEventListener("message", message);
    };
  }, [send]);

  return (
    <span
      className="helena-virtual-mascot"
      data-ready={ready}
      data-reduced={reduced}
      aria-hidden="true"
    >
      <img
        src={`/helena-assistant/${props.open ? "helena" : "star"}.png`}
        width="64"
        height="64"
        alt=""
        draggable="false"
      />
      {active && (
        <iframe
          ref={frame}
          src="/helena-assistant/index.html?v=1"
          title="Animação decorativa da Helena"
          tabIndex={-1}
          aria-hidden="true"
          onLoad={send}
        />
      )}
    </span>
  );
}
