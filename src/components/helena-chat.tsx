import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { PaperCloseIcon } from "./paper-close-icon";
import { PaperArrow } from "./paper-arrow";
import { HelenaLoading } from "./helena-loading";
import { HelenaMascot } from "./helena-mascot";
import { streamHelena, HelenaClientError } from "../data/helena-client";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { HELENA_PLAN_DRAFT_EVENT } from "../domain/agenda";
import "./helena-chat.css";

type Message = { id: number; role: "user" | "helena"; text: string; interrupted?: boolean };
type Position = { x: number; y: number };
type Motion = "idle" | "opening" | "closing" | "dragging" | "docking";
function reducedMotion() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset["reduceMotion"] === "true"
  );
}
function constrain(position: Position) {
  const mobile = window.innerWidth < 900;
  const size = mobile ? 56 : 64;
  return {
    x: Math.max(16, Math.min(window.innerWidth - size - 16, position.x)),
    y: Math.max(16, Math.min(window.innerHeight - size - (mobile ? 100 : 24), position.y)),
  };
}
const suggestions = ["Organizar meus estudos", "Me ajudar com uma dúvida", "Revisar uma matéria"];

/** Preview local; no aplicativo, envio externo somente ao enviar uma mensagem. */
export function HelenaChat({
  initiallyOpen = false,
  preview = false,
  previewReply,
  currentView = "today",
}: {
  initiallyOpen?: boolean;
  preview?: boolean;
  previewReply?: (text: string) => string;
  currentView?: string;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [hasPartialResponse, setHasPartialResponse] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const [motion, setMotion] = useState<Motion>("idle");
  const [position, setPosition] = useState<Position | null>(null);
  const [hover, setHover] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const motionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ id: number; start: Position; origin: Position; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const headerMascot = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const sending = useRef(false);
  const responseId = useRef<number | null>(null);
  const followResponse = useRef(true);
  useEffect(() => {
    const prepare = (event: Event) => {
      if (
        !(event instanceof CustomEvent) ||
        typeof event.detail !== "string" ||
        event.detail.length > 2000 ||
        sending.current
      )
        return;
      setDraft(event.detail);
      setOpen(true);
      setError("");
      setMotion("opening");
      if (motionTimer.current) clearTimeout(motionTimer.current);
      motionTimer.current = setTimeout(
        () => {
          setMotion("idle");
          composer.current?.focus();
        },
        reducedMotion() ? 0 : 350,
      );
    };
    window.addEventListener(HELENA_PLAN_DRAFT_EVENT, prepare);
    return () => window.removeEventListener(HELENA_PLAN_DRAFT_EVENT, prepare);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      controller.current?.abort();
      if (motionTimer.current) clearTimeout(motionTimer.current);
    },
    [],
  );
  useEffect(() => {
    const resize = () => setPosition((value) => (value ? constrain(value) : null));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (open && window.matchMedia("(min-width: 900px)").matches) composer.current?.focus();
  }, [open]);
  useEffect(() => {
    if (followResponse.current)
      conversation.current?.scrollTo?.({
        top: conversation.current.scrollHeight,
        behavior: "instant",
      });
  }, [messages, pending, open]);

  // A mesma instância gráfica acompanha o botão até o cabeçalho, sem recarregar o modelo.
  useLayoutEffect(() => {
    if (!open) return;
    const button = launcher.current;
    const anchor = headerMascot.current;
    const container = button?.parentElement;
    if (!button || !anchor || !container) return;
    const align = () => {
      const target = anchor.getBoundingClientRect();
      const origin = container.getBoundingClientRect();
      button.style.setProperty("--hc-header-x", `${target.left - origin.left}px`);
      button.style.setProperty("--hc-header-y", `${target.top - origin.top}px`);
      button.style.setProperty("--hc-header-scale", `${target.width / button.offsetWidth}`);
    };
    align();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(align);
    observer?.observe(anchor);
    if (anchor.parentElement) observer?.observe(anchor.parentElement);
    const panel = anchor.closest(".helena-chat-panel");
    const entered = (event: Event) => {
      if (event.target === panel && (event as AnimationEvent).animationName === "hc-unfold")
        align();
    };
    panel?.addEventListener("animationend", entered);
    window.addEventListener("resize", align);
    // O recorte do painel muda de posição apenas durante sua entrada.
    let frame = 0;
    const until = performance.now() + 260;
    const follow = () => {
      align();
      if (performance.now() < until) frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      panel?.removeEventListener("animationend", entered);
      window.removeEventListener("resize", align);
    };
  }, [open, position]);

  function animate(next: Motion, duration: number, complete?: () => void) {
    if (motionTimer.current) clearTimeout(motionTimer.current);
    setMotion(next);
    motionTimer.current = setTimeout(
      () => {
        setMotion("idle");
        motionTimer.current = null;
        complete?.();
      },
      reducedMotion() ? 0 : duration,
    );
  }
  function close() {
    if (motion === "closing") return;
    stop();
    const finish = () => {
      setOpen(false);
      launcher.current?.focus();
    };
    if (reducedMotion()) finish();
    else animate("closing", 220, finish);
  }
  function toggle(event: MouseEvent<HTMLButtonElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      if (event.detail > 0) return;
    }
    if (motion === "closing") return;
    if (open) close();
    else {
      setTilt({ x: 0, y: 0 });
      setOpen(true);
      animate("opening", 560);
    }
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || open) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    suppressClick.current = false;
    drag.current = {
      id: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { x: bounds.x, y: bounds.y },
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (current && current.id === event.pointerId) {
      const dx = event.clientX - current.start.x;
      const dy = event.clientY - current.start.y;
      if (!current.moved && Math.hypot(dx, dy) < 6) return;
      current.moved = true;
      if (motionTimer.current) clearTimeout(motionTimer.current);
      setMotion("dragging");
      setPosition(constrain({ x: current.origin.x + dx, y: current.origin.y + dy }));
      setTilt({ x: Math.max(-20, Math.min(20, -dy / 5)), y: Math.max(-25, Math.min(25, dx / 5)) });
    } else if (event.pointerType === "mouse" && !open) {
      const bounds = event.currentTarget.getBoundingClientRect();
      setTilt({
        x: -((event.clientY - bounds.y) / bounds.height - 0.5) * 30,
        y: ((event.clientX - bounds.x) / bounds.width - 0.5) * 36,
      });
    }
  }
  function pointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setTilt({ x: 0, y: 0 });
    if (!current.moved) return;
    suppressClick.current = true;
    const value = constrain({
      x: current.origin.x + event.clientX - current.start.x,
      y: current.origin.y + event.clientY - current.start.y,
    });
    const size = window.innerWidth < 900 ? 56 : 64;
    setPosition({
      x: value.x + size / 2 < window.innerWidth / 2 ? 16 : window.innerWidth - size - 16,
      y: value.y,
    });
    animate("docking", 560);
  }
  function send(text: string) {
    const value = text.trim();
    if (!value || sending.current) return;
    setError("");
    followResponse.current = true;
    sending.current = true;
    setMessages((items) => [...items, { id: ++nextId.current, role: "user", text: value }]);
    setDraft("");
    setPending(true);
    setHasPartialResponse(false);
    if (!preview) {
      const abort = new AbortController();
      controller.current = abort;
      const replyId = ++nextId.current;
      responseId.current = replyId;
      const previous = messages
        .slice(-6)
        .map((item) => `${item.role === "user" ? "Aluno" : "Helena"}: ${item.text}`)
        .join("\n")
        .slice(-6000);
      void (async () => {
        try {
          const { auth } = await getFirebaseAccountServices();
          const token = await auth.currentUser?.getIdToken();
          if (!token) throw new Error();
          if (abort.signal.aborted) return;
          await streamHelena(
            {
              version: 1,
              capability: "tutor",
              prompt: value,
              sources: [
                {
                  id: "current-screen",
                  kind: "note",
                  title: "Tela e conversa atual",
                  content: `Módulo aberto: ${currentView}. Histórico desta sessão:\n${previous || "Sem histórico."}`,
                },
              ],
              privacy: { consent: true, retention: "none" },
            },
            {
              token,
              signal: abort.signal,
              onText(answer) {
                if (abort.signal.aborted) return;
                setHasPartialResponse(true);
                setMessages((items) =>
                  items.some((item) => item.id === replyId)
                    ? items.map((item) => (item.id === replyId ? { ...item, text: answer } : item))
                    : [...items, { id: replyId, role: "helena", text: answer }],
                );
              },
            },
          );
        } catch (failure) {
          if (!abort.signal.aborted) {
            setError(
              failure instanceof HelenaClientError
                ? failure.message
                : "Entre na conta ou tente mais tarde.",
            );
            setDraft(value);
            setMessages((items) =>
              items.map((item) => (item.id === replyId ? { ...item, interrupted: true } : item)),
            );
          }
        } finally {
          if (controller.current === abort) {
            controller.current = null;
            responseId.current = null;
            setPending(false);
            sending.current = false;
          }
        }
      })();
      return;
    }
    timer.current = setTimeout(() => {
      setMessages((items) => [
        ...items,
        { id: ++nextId.current, role: "helena", text: previewReply?.(value) ?? "Preview local." },
      ]);
      setPending(false);
      sending.current = false;
      timer.current = null;
    }, 800);
  }
  function stop() {
    const id = responseId.current;
    controller.current?.abort();
    controller.current = null;
    responseId.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (id !== null)
      setMessages((items) =>
        items.map((item) => (item.id === id ? { ...item, interrupted: true } : item)),
      );
    setPending(false);
    sending.current = false;
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }

  return (
    <aside
      className={`helena-chat${preview ? "" : " helena-chat--application"}`}
      aria-label="Assistente Helena"
      data-motion={motion}
      data-edge={position && position.x < window.innerWidth / 2 ? "left" : "right"}
      style={
        position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined
      }
    >
      {open && (
        <section
          className={`helena-chat-panel${motion === "closing" ? " is-closing" : ""}`}
          style={
            position && window.innerWidth >= 900
              ? {
                  position: "fixed",
                  right: "auto",
                  bottom: "auto",
                  left: Math.max(
                    12,
                    Math.min(
                      window.innerWidth - 404,
                      position.x < window.innerWidth / 2 ? position.x : position.x + 64 - 392,
                    ),
                  ),
                  top: Math.max(
                    12,
                    Math.min(
                      window.innerHeight - Math.min(560, window.innerHeight - 140) - 18,
                      position.y - Math.min(560, window.innerHeight - 140) - 20,
                    ),
                  ),
                }
              : undefined
          }
          role="dialog"
          aria-modal="false"
          aria-labelledby="helena-chat-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header className="helena-chat-header">
            <div className="helena-chat-header-mascot" ref={headerMascot} aria-hidden="true" />
            <div>
              <h2 id="helena-chat-title">Helena</h2>
              <p>Sua companhia nos estudos</p>
            </div>
            <button
              className="helena-chat-tool"
              type="button"
              onClick={close}
              aria-label="Recolher conversa"
            >
              <PaperCloseIcon />
            </button>
          </header>
          {preview && <span className="helena-chat-preview-tag">Preview</span>}
          <div
            className="helena-chat-conversation"
            ref={conversation}
            onScroll={(event) => {
              const element = event.currentTarget;
              followResponse.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 60;
            }}
          >
            {messages.length === 0 ? (
              <div className="helena-chat-welcome">
                <h3>Oi! Vamos pensar juntos?</h3>
                <div className="helena-chat-suggestions">
                  {suggestions.map((text, index) => (
                    <button
                      key={text}
                      type="button"
                      className="secondary-button"
                      onClick={() => send(text)}
                    >
                      <img
                        className="helena-chat-suggestion-icon--light"
                        src={`/navigation-icons/paper/claro/${["planner", "notes", "library"][index]}.svg`}
                        alt=""
                        width="28"
                        height="28"
                      />
                      <img
                        className="helena-chat-suggestion-icon--dark"
                        src={`/navigation-icons/paper/escuro/${["planner", "notes", "library"][index]}.svg`}
                        alt=""
                        width="28"
                        height="28"
                      />
                      <span>{text}</span>
                      <PaperArrow />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="helena-chat-messages"
                role="log"
                aria-label="Mensagens"
                aria-live={pending ? "off" : "polite"}
                aria-relevant="additions text"
              >
                {messages.map((message) => (
                  <div key={message.id} className={`helena-chat-message is-${message.role}`}>
                    <span className="helena-chat-message-author">
                      {message.role === "user" ? "Você" : "Helena"}
                    </span>
                    <p>{message.text}</p>
                    {message.interrupted && (
                      <span className="helena-chat-interrupted">Resposta interrompida</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {pending && !hasPartialResponse && (
              <div className="helena-chat-thinking">
                <HelenaLoading label="Helena está respondendo" compact />
              </div>
            )}
          </div>
          <footer className="helena-chat-footer">
            {error && <p role="alert">{error}</p>}
            <form onSubmit={submit} className="helena-chat-composer">
              <textarea
                ref={composer}
                id="helena-chat-input"
                aria-label="Escreva para a Helena"
                value={draft}
                maxLength={2000}
                rows={2}
                placeholder="Escreva para a Helena…"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    send(draft);
                  }
                }}
              />
              {pending ? (
                <button
                  type="button"
                  className="helena-chat-send secondary-button"
                  aria-label="Interromper resposta"
                  onClick={stop}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="helena-chat-stop-icon">
                    <path fill="#51465D" d="M5 7h14v14H5z" />
                    <path fill="#FFF9EF" d="M4 4h14v14H4z" />
                    <path fill="#D8CDB9" d="M4 4h5l-5 5zM18 18h-5l5-5z" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  className="helena-chat-send primary-button"
                  aria-label="Enviar mensagem"
                  disabled={!draft.trim()}
                >
                  <PaperArrow />
                </button>
              )}
            </form>
            <p>
              {preview
                ? "Conversa demonstrativa. Nada é enviado ou salvo."
                : "Respostas de IA enviam sua mensagem e o contexto ao Cloudflare. Sem uso no treino da Olena. IA pode errar."}
            </p>
          </footer>
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        className={`helena-chat-launcher${open ? " is-open" : ""}`}
        aria-label={open ? "Recolher conversa com Helena" : "Conversar com Helena"}
        aria-expanded={open}
        onClick={toggle}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onLostPointerCapture={(event) => {
          if (drag.current) pointerEnd(event);
        }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => {
          setHover(false);
          if (!drag.current) setTilt({ x: 0, y: 0 });
        }}
        onBlur={() => {
          setHover(false);
          setTilt({ x: 0, y: 0 });
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        <span className="helena-chat-launcher-art">
          <HelenaMascot
            open={open && motion !== "closing"}
            motion={motion}
            tilt={tilt}
            hover={hover}
          />
        </span>
      </button>
    </aside>
  );
}
