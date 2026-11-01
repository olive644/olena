import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { initializeLanguage } from "../../src/i18n/runtime";
import { ProfileCards } from "../../src/components/profile-cards";
import { PublicProfileCards } from "../../src/components/public-profile-cards";
import { AchievementCollection } from "../../src/components/math-achievements";
import { ALL_ACHIEVEMENTS } from "../../src/domain/math-achievements";
import { SocialActivityCard } from "../../src/components/social-activity-card";
import { ProfileShareCard } from "../../src/components/profile-share-card";
import { OliverCardInspection } from "../../src/components/oliver-card-inspection";
import { OliverCardBooster } from "../../src/components/oliver-card-booster";
import type { ArcanaId } from "../../src/data/arcana-ids";
import type { SocialProfile } from "../../src/domain/profile-social";
import "../../src/styles.css";
import "../../src/paper-buttons.css";
import "../../src/paper-controls.css";
import "../../src/accessibility.css";
import "../../src/components/profile-social.css";
import "../../src/components/system-updates.css";
import "../../src/components/cosmic-dust.css";
import "./review.css";

// Fixture explícita, local e isolada da origem de produção. Nenhuma conta é autenticada.
const catalog = await (await fetch("/arcana/catalog.json")).json();
const selected = ["major-17", "swords-13", "wands-06"];
const badges = ALL_ACHIEVEMENTS.slice(0, 3).map((item) => item.id);
const at = Date.parse("2026-10-29T15:30:00Z");
localStorage.setItem("helena.guest.v1", "1");
localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
localStorage.setItem("helena.privacyNotice.v1", "2026-10-29");
localStorage.setItem(
  "helena.profile.v1",
  JSON.stringify({ name: "Perfil de teste", cardFavorites: selected }),
);
localStorage.setItem(
  "helena.mathPlaceRewards.v1",
  JSON.stringify({
    foundations: {
      points: 1000,
      receipts: [],
      chests: catalog.map((card: { id: string }, index: number) => ({
        id: `review-${index}`,
        opened: true,
        unlockAt: 0,
        ...(card.id === "major-17" ? { kind: "arcane", arcana: card.id } : { cards: [card.id] }),
        revealed: 1,
        revealedAt: [at],
      })),
    },
  }),
);
const person: SocialProfile = {
  username: "perfil-teste",
  name: "Perfil de teste",
  photoUrl: "/profile-avatars/helena.webp",
  followers: 0,
  following: 0,
  followsYou: false,
  followed: false,
  shared: true,
  cards: selected,
  cardFavorites: selected,
  cardDates: Object.fromEntries(selected.map((id) => [id, new Date(at).toISOString()])),
};
await initializeLanguage();
const manifest: {
  sha: string;
  evidence: { name: string; theme: string; viewport: { width: number; height: number } }[];
} = await (await fetch("./manifest.json")).json();
const cardShare: { sha: string; sourceSha256: string; capturedAt: string } = await (
  await fetch("./card-share-check.json")
).json();
function Review() {
  const [tab, setTab] = useState("card-share");
  const [sample, setSample] = useState<ArcanaId>("major-17");
  const [reward, setReward] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("helenastudy.theme") ?? "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <main className="review-shell">
      <header className="review-heading">
        <h1>Perfil e Arcano</h1>
        <strong>Direção visual aprovada, integração e validação em andamento</strong>
        <p>
          Componentes reais do app com dados simulados. Sem autenticação, publicação ou validação de
          sincronização. Nenhuma arte ou personagem foi redesenhado.
        </p>
        <p>
          Capturas: <code>{manifest.sha.slice(0, 7)}</code>, versão e hash da fonte no manifesto.{" "}
          <a href="./manifest.json" target="_blank">
            Versão e evidências
          </a>
        </p>
        <button
          className="secondary-button"
          onClick={() => {
            const next = theme === "dark" ? "light" : "dark";
            setTheme(next);
            localStorage.setItem("helenastudy.theme", next);
          }}
        >
          Tema: {theme === "dark" ? "escuro" : "claro"}
        </button>{" "}
        <a href="/perfil" target="_blank">
          Abrir app funcionando (com fixture local)
        </a>
      </header>
      <nav className="review-tabs">
        {[
          ["gallery", "Galeria"],
          ["card-share", "Compartilhar carta"],
          ["inspection", "Interpretação e brilho"],
          ["profile", "Outro perfil"],
          ["activity", "Atividades"],
          ["share", "Compartilhar"],
          ["proof", "Capturas reais"],
        ].map(([id, label]) => (
          <button
            className="secondary-button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            key={id}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "card-share" && (
        <>
          <h2>Compartilhamento individual do Arcano</h2>
          <p>
            PNG real de 1080×1350, arte completa, alfabeto original OLENASTUDY e favicon oficial.
            Perfil e obtenção são fixtures locais. O ícone de compartilhar fica ao lado da estrela
            ao inspecionar uma carta obtida na galeria.
          </p>
          <p>
            Versão {cardShare.sha.slice(0, 7)} + alterações locais, hash da fonte{" "}
            <code>{cardShare.sourceSha256.slice(0, 16)}</code>.{" "}
            <a href="./card-share-check.json" target="_blank">
              Relatório verificável
            </a>
          </p>
          {["desktop-light", "desktop-dark", "mobile-light", "mobile-dark"].map((name) => (
            <figure key={name}>
              <figcaption>
                {name}, {name.startsWith("mobile") ? "390×844" : "1440×1000"}, captura da prévia e
                PNG exportado. Clique para ampliar.
              </figcaption>
              <a href={`./card-share-${name}.png`} target="_blank">
                <img
                  className="review-proof"
                  src={`./card-share-${name}.png`}
                  alt={`Card individual Arcano, ${name}`}
                />
              </a>
              <p>
                <a href={`./card-share-${name}-preview.png`} target="_blank">
                  Ver a prévia no app
                </a>
              </p>
            </figure>
          ))}
        </>
      )}
      {tab === "inspection" && (
        <>
          <div className="review-tabs">
            {(
              [
                ["wands-06", "Comum: Seis de Paus"],
                ["major-01", "Épica: O Mago"],
                ["major-17", "Lendária: A Estrela"],
              ] as const
            ).map(([id, label]) => (
              <button
                className="secondary-button"
                key={id}
                aria-pressed={sample === id}
                onClick={() => setSample(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <OliverCardInspection key={sample} id={sample} />
          <p>
            Brilhos ao redor da moldura, sem redesenhar a arte. Efeitos automáticos desativados com
            movimento reduzido.
          </p>
          <button className="secondary-button" onClick={() => setReward(true)}>
            Testar revelação desta carta
          </button>
          <p>Revelação simulada, sem sorteio, áudio ou salvamento de prêmio.</p>
          {reward && (
            <OliverCardBooster
              chest={{
                id: "review-reward",
                unlockAt: 0,
                opened: true,
                ...(sample === "major-17"
                  ? { kind: "arcane" as const, arcana: sample }
                  : { cards: [sample] }),
              }}
              onReveal={() => true}
              onClose={() => setReward(false)}
              sound={() => {}}
              onStore={() => setReward(false)}
            />
          )}
        </>
      )}
      {tab === "gallery" && (
        <>
          <p>
            Abra a coleção. Arraste uma carta para um dos três destaques, entre posições ou para a
            área de remoção. Os botões de estrela e X continuam disponíveis para teclado.
          </p>
          <ProfileCards />
        </>
      )}
      {tab === "profile" && (
        <>
          <h2>Perfil de teste</h2>
          <p>Somente os destaques públicos. Inspeção disponível ao tocar nas peças.</p>
          <AchievementCollection
            compact
            ids={badges}
            favorites={badges}
            dates={Object.fromEntries(badges.map((id) => [id, new Date(at).toISOString()]))}
            ownerName="Perfil de teste"
          />
          <PublicProfileCards person={person} />
        </>
      )}
      {tab === "activity" && (
        <>
          <h2>Atividades de teste</h2>
          {[
            { kind: "card" as const, ref: "major-17" },
            { kind: "card" as const, ref: "wands-06" },
            { kind: "achievement" as const, ref: badges[0] },
          ].map((item, index) => (
            <SocialActivityCard
              key={index}
              own
              activity={{
                id: `fixture-${index}`,
                kind: item.kind,
                ref: item.ref!,
                value: 1,
                at: at - index * 60000,
                person,
                likes: [],
                liked: false,
              }}
            />
          ))}
        </>
      )}
      {tab === "share" && (
        <>
          <p>Miniaturas compactas e exportação PNG local com artes completas. Dados de teste.</p>
          <ProfileShareCard person={person} featured={badges} />
          <p>PNG gerado pelo app, com perfil de teste. Clique para ampliar.</p>
          <a href="./share-desktop-light.png" target="_blank">
            <img
              className="review-proof"
              src="./share-desktop-light.png"
              alt="PNG local do perfil de teste com três conquistas e três cartas"
            />
          </a>
        </>
      )}
      {tab === "proof" && (
        <>
          <p>
            Capturas do app em execução com fixture local. Clique para ampliar. Não são mockups; os
            dados são simulados.
          </p>
          {manifest.evidence.map(({ name, theme, viewport }) => (
            <figure key={name}>
              <figcaption>
                {name}, {viewport.width}×{viewport.height}, tema {theme}, SHA{" "}
                {manifest.sha.slice(0, 7)} + hash da fonte no manifesto
              </figcaption>
              <a href={`./${name}.png`} target="_blank">
                <img
                  className="review-proof"
                  src={`./${name}.png`}
                  alt={`Galeria no app: ${name}`}
                  loading="lazy"
                />
              </a>
            </figure>
          ))}
        </>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Review />);
