import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ArcanaCardPrototype } from "../src/components/arcana-card-prototype";
import catalog from "./arcana-catalog.json";
import available from "./arcana-ready.json";
import "./arcana.css";

const sections = [
  ["ready", "Estudos disponíveis"],
  ["all", "Baralho completo"],
  ["major", "Maiores"],
  ["wands", "Paus · Fogo"],
  ["cups", "Copas · Água"],
  ["swords", "Espadas · Ar"],
  ["pentacles", "Ouros · Terra"],
];
export function Preview() {
  const [dark, setDark] = useState(false);
  const [group, setGroup] = useState("ready");
  const [selected, setSelected] = useState("major-06");
  const [back, setBack] = useState(false);
  const cards = catalog.filter((card) =>
    group === "ready" ? available.includes(card.id) : group === "all" || card.group === group,
  );
  const card = catalog.find((card) => card.id === selected)!;
  const ready = available.includes(card.id);
  const position = catalog.findIndex((item) => item.id === selected);
  const choose = (id: string) => {
    setSelected(id);
    setBack(false);
  };
  return (
    <main className={dark ? "preview is-dark" : "preview"}>
      <header>
        <span>
          OLENASTUDY <small>ARCANOS · ESTUDO DO BARALHO</small>
        </span>
        <button onClick={() => setDark(!dark)} aria-pressed={dark}>
          Modo {dark ? "claro" : "escuro"}
        </button>
      </header>
      <section className="arcana-showcase" aria-label="Inspeção da carta">
        <div className="arcana-showcase__art">
          {ready || back ? (
            <ArcanaCardPrototype
              back={back}
              title={card.title}
              mark={card.mark}
              art={card.asset}
              indexColor="#facc15"
              description={`${card.title}, com ${card.characters.join(" e ")}.`}
            />
          ) : (
            <div className="arcana-pending">
              <ArcanaCardPrototype back />
              <span>Ilustração em criação</span>
            </div>
          )}
        </div>
        <div className="arcana-showcase__details">
          <p className="arcana-eyebrow">
            {card.group === "major"
              ? "Arcano maior"
              : `${"suit" in card ? card.suit : ""} · ${"element" in card ? card.element : ""}`}
          </p>
          <h1>{card.title}</h1>
          <p>{card.characters.join(" e ")}</p>
          <p>{card.meaning}</p>
          <div className="arcana-actions">
            <button
              aria-label="Carta anterior"
              onClick={() => choose(catalog[(position + 77) % 78]!.id)}
            >
              ←
            </button>
            <button onClick={() => setBack(!back)} aria-pressed={back}>
              {back ? "Ver frente" : "Ver verso"}
            </button>
            <button
              aria-label="Próxima carta"
              onClick={() => choose(catalog[(position + 1) % 78]!.id)}
            >
              →
            </button>
          </div>
          <p className="arcana-progress">
            {available.length} de 78 ilustrações disponíveis neste estudo.
          </p>
        </div>
      </section>
      <nav className="arcana-tabs" aria-label="Categorias do baralho">
        {sections.map(([id, label]) => (
          <button key={id} aria-pressed={group === id} onClick={() => setGroup(id!)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="arcana-gallery">
        {cards.map((item) => (
          <button
            className="arcana-tile"
            key={item.id}
            onClick={() => choose(item.id)}
            aria-pressed={selected === item.id}
          >
            {available.includes(item.id) ? (
              <img
                src={item.asset.replace(".webp", "-small.webp")}
                width="180"
                height="270"
                loading="lazy"
                alt=""
              />
            ) : (
              <span className="arcana-tile__pending" aria-hidden="true">
                ✦
              </span>
            )}
            <span>
              {item.mark} · {item.title}
            </span>
            <small>{item.characters.join(" e ")}</small>
          </button>
        ))}
      </div>
      <p className="arcana-preview-note">
        Estudo visual. A coleção, cartas obtidas e recompensas do aplicativo permanecem intactas.
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
