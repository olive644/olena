import { uiText, useLanguage, localizeLabels } from "../i18n/runtime";
import { useState } from "react";
import { HelenaChat } from "../components/helena-chat";
import { demonstrationReply } from "../data/helena-preview";
import { PaperCheckIcon } from "../components/paper-check-icon";
import "./helena-chat-preview-page.css";

const navigation = localizeLabels(() => [
  { title: uiText(115), icon: "today", path: "/" },
  { title: uiText(1550), icon: "planner", path: "/agenda" },
  { title: uiText(101), icon: "learn", path: "/aprender" },
  { title: uiText(99), icon: "focus", path: "/foco" },
  { title: uiText(120), icon: "profile", path: "/perfil" },
]);

export function HelenaChatPreviewPage() {
  useLanguage();

  const [day, setDay] = useState(3);
  const [completed, setCompleted] = useState(false);
  return (
    <div className="hc-preview-page">
      <nav className="hc-preview-nav" aria-label={uiText(1217)}>
        <a href="/" className="hc-preview-mark" aria-label={uiText(116)}>
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
          <span>{uiText(1218)}</span>
          <span className="hc-preview-label">{uiText(1219)}</span>
        </header>
        <div className="hc-preview-heading">
          <span>{uiText(1220)}</span>
          <h1>
            {uiText(1221)}
            <br />
            {uiText(1222)}
          </h1>
          <p>{uiText(1223)}</p>
        </div>
        <section className="hc-preview-week" aria-label={uiText(1224)}>
          {[
            uiText(1581),
            uiText(1582),
            uiText(1583),
            uiText(1584),
            uiText(1585),
            uiText(34),
            uiText(1580),
          ].map((title, index) => (
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
              <h2>{uiText(1225)}</h2>
              <span>{uiText(1226)}</span>
            </div>
            <article>
              <time>14:00</time>
              <div className="hc-preview-task-icon">
                <img src="/navigation-icons/paper/claro/learn.svg" alt="" />
              </div>
              <div>
                <span>{uiText(249)}</span>
                <h3>{uiText(1227)}</h3>
                <p>{uiText(1228)}</p>
              </div>
            </article>
            <article className={completed ? "is-complete" : ""}>
              <time>16:30</time>
              <div className="hc-preview-task-icon">
                <img src="/navigation-icons/paper/claro/library.svg" alt="" />
              </div>
              <div>
                <span>{uiText(1229)}</span>
                <h3>{uiText(1230)}</h3>
                <p>{uiText(1231)}</p>
              </div>
              <button
                type="button"
                className="hc-preview-check"
                aria-label={completed ? uiText(1232) : uiText(1233)}
                aria-pressed={completed}
                onClick={() => setCompleted(!completed)}
              >
                <PaperCheckIcon />
              </button>
            </article>
            <div className="hc-preview-day-note">{uiText(1234)}</div>
          </section>
          <section className="hc-preview-note">
            <img src="/navigation-icons/paper/claro/focus.svg" alt="" width="48" height="48" />
            <span>{uiText(1235)}</span>
            <h2>
              {uiText(1236)}
              <br />
              {uiText(1237)}
            </h2>
            <p>{uiText(1238)}</p>
            <a href="/foco">
              {uiText(1239)} <img src="/paper-arrow.svg" alt="" width="26" height="26" />
            </a>
          </section>
        </div>
      </main>
      <HelenaChat
        preview
        previewReply={demonstrationReply}
        initiallyOpen={new URLSearchParams(location.search).has("open")}
      />
    </div>
  );
}
