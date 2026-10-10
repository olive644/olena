import { useState } from "react";
import { HelenaChatPreview } from "../components/helena-chat-preview";
import { PaperCheckIcon } from "../components/paper-check-icon";
import "./helena-chat-preview-page.css";

const navigation = [
  { title: "Espaço", icon: "today", path: "/" },
  { title: "Agenda", icon: "planner", path: "/agenda" },
  { title: "Praticar", icon: "learn", path: "/aprender" },
  { title: "Foco", icon: "focus", path: "/foco" },
  { title: "Perfil", icon: "profile", path: "/perfil" },
];

export function HelenaChatPreviewPage() {
  const [day, setDay] = useState(3);
  const [completed, setCompleted] = useState(false);
  return (
    <div className="hc-preview-page">
      <nav className="hc-preview-nav" aria-label="Navegação do aplicativo">
        <a href="/" className="hc-preview-mark" aria-label="OlenaStudy">
          <img src="/olena-icon-outlined.svg" alt="" width="38" height="38" />
        </a>
        {navigation.map((item) => (
          <a
            href={item.path}
            key={item.title}
            className={item.title === "Agenda" ? "is-active" : ""}
            aria-current={item.title === "Agenda" ? "page" : undefined}
          >
            <img
              src={
                item.icon === "profile"
                  ? "/navigation-icons/paper/profile.svg"
                  : `/navigation-icons/paper/${item.title === "Agenda" ? "roxo" : "claro"}/${item.icon}.svg`
              }
              alt=""
              width="32"
              height="32"
            />
            <span>{item.title}</span>
          </a>
        ))}
      </nav>
      <main className="hc-preview-main">
        <header className="hc-preview-top">
          <span>Seu espaço de estudos</span>
          <span className="hc-preview-label">Preview da Helena</span>
        </header>
        <div className="hc-preview-heading">
          <span>AGENDA</span>
          <h1>
            Um bom dia começa
            <br />
            com um pequeno passo.
          </h1>
          <p>Abra a Helena no canto para experimentar a conversa.</p>
        </div>
        <section className="hc-preview-week" aria-label="Semana demonstrativa">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((title, index) => (
            <button
              key={title}
              type="button"
              onClick={() => setDay(index)}
              aria-pressed={day === index}
              className={day === index ? "is-selected" : ""}
            >
              <span>{title}</span>
              <strong>{12 + index}</strong>
              <i aria-hidden="true" />
            </button>
          ))}
        </section>
        <div className="hc-preview-cards">
          <section className="hc-preview-day">
            <div className="hc-preview-section-title">
              <h2>Seu plano do dia</h2>
              <span>Exemplo</span>
            </div>
            <article>
              <time>14:00</time>
              <div className="hc-preview-task-icon">
                <img src="/navigation-icons/paper/claro/learn.svg" alt="" />
              </div>
              <div>
                <span>MATEMÁTICA</span>
                <h3>Praticar as primeiras contas</h3>
                <p>15 minutos para ganhar confiança.</p>
              </div>
            </article>
            <article className={completed ? "is-complete" : ""}>
              <time>16:30</time>
              <div className="hc-preview-task-icon">
                <img src="/navigation-icons/paper/claro/library.svg" alt="" />
              </div>
              <div>
                <span>REVISÃO</span>
                <h3>Relembrar o que aprendi</h3>
                <p>Separe suas dúvidas para a próxima sessão.</p>
              </div>
              <button
                type="button"
                className="hc-preview-check"
                aria-label={completed ? "Reabrir revisão" : "Concluir revisão"}
                aria-pressed={completed}
                onClick={() => setCompleted(!completed)}
              >
                <PaperCheckIcon />
              </button>
            </article>
            <div className="hc-preview-day-note">Um plano leve também é um plano.</div>
          </section>
          <section className="hc-preview-note">
            <img src="/navigation-icons/paper/claro/focus.svg" alt="" width="48" height="48" />
            <span>NO SEU RITMO</span>
            <h2>
              Reserve um tempo
              <br />
              para você.
            </h2>
            <p>Uma coisa por vez. Pequenas sessões deixam espaço para aprender e respirar.</p>
            <a href="/foco">
              Abrir Foco <img src="/paper-arrow.svg" alt="" width="26" height="26" />
            </a>
          </section>
        </div>
      </main>
      <HelenaChatPreview initiallyOpen={new URLSearchParams(location.search).has("open")} />
    </div>
  );
}
