import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { PaperCloseIcon } from "./paper-close-icon";
import { PaperArrow } from "./paper-arrow";
import { HelenaLoading } from "./helena-loading";
import { RoomPointsIcon } from "./room-paper-icons";
import "./helena-chat.css";

type Message = { id: number; role: "user" | "helena"; text: string };
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

function demonstrationReply(text: string) {
  if (/organizar|agenda|rotina|estudos/i.test(text))
    return "Vamos por partes. Qual matéria você quer estudar e quanto tempo tem hoje? Podemos começar com um bloco curto e deixar uma pausa entre as atividades.";
  if (/revisar|revisão|materia|matéria/i.test(text))
    return "Uma revisão curta pode ajudar bastante. Me diga a matéria e o assunto. A ideia é relembrar o essencial e depois praticar com uma pergunta por vez.";
  if (/matem|conta|equação/i.test(text))
    return "Pode me mostrar a conta ou dizer onde você travou. Vamos separar o problema em passos pequenos, para você entender o caminho, não só o resultado.";
  return "Pode me contar um pouco mais? Diga o assunto e o que está difícil. Vamos começar pelo primeiro passo, no seu ritmo.";
}

/** Interface compartilhada. Respostas demonstrativas, sem API ou persistência. */
export function HelenaChat({
  initiallyOpen = false,
  preview = false,
}: {
  initiallyOpen?: boolean;
  preview?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [motion, setMotion] = useState<Motion>("idle");
  const [position, setPosition] = useState<Position | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const motionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ id: number; start: Position; origin: Position; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const sending = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
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
    conversation.current?.scrollTo?.({
      top: conversation.current.scrollHeight,
      behavior: "instant",
    });
  }, [messages, pending, open]);

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
    sending.current = true;
    setMessages((items) => [...items, { id: ++nextId.current, role: "user", text: value }]);
    setDraft("");
    setPending(true);
    timer.current = setTimeout(() => {
      setMessages((items) => [
        ...items,
        { id: ++nextId.current, role: "helena", text: demonstrationReply(value) },
      ]);
      setPending(false);
      sending.current = false;
      timer.current = null;
    }, 800);
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
                      window.innerHeight - Math.min(610, window.innerHeight - 140) - 18,
                      position.y - Math.min(610, window.innerHeight - 140) - 20,
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
            <div className="helena-chat-header-mascot">
              <RoomPointsIcon />
            </div>
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
          <div className="helena-chat-context">
            <span className="helena-chat-star" aria-hidden="true">
              <RoomPointsIcon />
            </span>{" "}
            Um passo de cada vez.
            {preview && <span className="helena-chat-preview-tag">Preview</span>}
          </div>
          <div className="helena-chat-conversation" ref={conversation}>
            {messages.length === 0 ? (
              <div className="helena-chat-welcome">
                <div className="helena-chat-welcome-art">
                  <RoomPointsIcon />
                </div>
                <h3>Oi! Vamos pensar juntos?</h3>
                <p>Uma dúvida, uma revisão ou um plano para hoje. Por onde começamos?</p>
                <div className="helena-chat-suggestions">
                  {suggestions.map((text, index) => (
                    <button key={text} type="button" onClick={() => send(text)}>
                      <img
                        src={`/navigation-icons/paper/claro/${["planner", "notes", "library"][index]}.svg`}
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
                aria-live="polite"
                aria-relevant="additions text"
              >
                <div className="helena-chat-message is-helena">
                  <span className="helena-chat-message-author">Helena</span>
                  <p>Estou aqui. Vamos resolver uma coisa de cada vez?</p>
                </div>
                {messages.map((message) => (
                  <div key={message.id} className={`helena-chat-message is-${message.role}`}>
                    <span className="helena-chat-message-author">
                      {message.role === "user" ? "Você" : "Helena"}
                    </span>
                    <p>{message.text}</p>
                  </div>
                ))}
              </div>
            )}
            {pending && (
              <div className="helena-chat-thinking">
                <HelenaLoading label="Helena está respondendo" compact />
              </div>
            )}
          </div>
          <footer className="helena-chat-footer">
            <form onSubmit={submit} className="helena-chat-composer">
              <label className="sr-only" htmlFor="helena-chat-input">
                Mensagem para Helena
              </label>
              <textarea
                ref={composer}
                id="helena-chat-input"
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
              <button
                type="submit"
                className="helena-chat-send"
                aria-label="Enviar mensagem"
                disabled={!draft.trim() || pending}
              >
                <PaperArrow />
              </button>
            </form>
            <p>Conversa demonstrativa. Nada é enviado ou salvo.</p>
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
        onPointerLeave={() => {
          if (!drag.current) setTilt({ x: 0, y: 0 });
        }}
        onBlur={() => setTilt({ x: 0, y: 0 })}
        onDragStart={(event) => event.preventDefault()}
      >
        <span
          className="helena-chat-launcher-art"
          style={
            {
              "--hc-tilt-x": `${tilt.x}deg`,
              "--hc-tilt-y": `${tilt.y}deg`,
              "--hc-drag-lean": `${tilt.y * 0.65}deg`,
            } as CSSProperties
          }
        >
          <span className="helena-chat-star-fold">
            <RoomPointsIcon />
          </span>
          <span className="helena-chat-orbit is-one" aria-hidden="true">
            <RoomPointsIcon />
          </span>
          <span className="helena-chat-orbit is-two" aria-hidden="true">
            <RoomPointsIcon />
          </span>
        </span>
        {!open && (
          <span className="helena-chat-hint" aria-hidden="true">
            <strong>Helena</strong>
            <span>
              Clique para conversar.
              <br />
              Arraste para mover.
            </span>
          </span>
        )}
      </button>
    </aside>
  );
}
