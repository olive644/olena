import { createRoot } from "react-dom/client";
import { AchievementArt } from "../../src/components/math-achievements";
import { MATH_ACHIEVEMENTS } from "../../src/domain/math-achievements";
import { ENGLISH_ACHIEVEMENTS } from "../../src/domain/english-achievement-catalog";
import { initializeLanguage } from "../../src/i18n/runtime";
import "../../src/styles.css";
import "../../src/paper-controls.css";
import "./review.css";

const theme = new URLSearchParams(location.search).get("theme") ?? "light";
document.documentElement.dataset["theme"] = theme;
localStorage.setItem("helenastudy.theme", theme);
await initializeLanguage();
const math = MATH_ACHIEVEMENTS.find((item) => item.id === "rounds-1")!;
const english = ENGLISH_ACHIEVEMENTS.find((item) => item.id === "english-rounds-1")!;
const cleanupIds = new Set([
  "english-correct-50",
  "english-correct-100",
  "english-correct-250",
  "english-part-4-correct-20",
  "english-part-4-correct-100",
  "english-part-4-variety-25",
  "english-part-4-variety-50",
  "english-part-4",
]);
const cleanup = ENGLISH_ACHIEVEMENTS.filter((item) => cleanupIds.has(item.id));
const poses = ENGLISH_ACHIEVEMENTS.filter(
  (item) => item.part !== undefined && item.metric === "parts",
);
createRoot(document.getElementById("root")!).render(
  <main>
    <h1>Conquistas: nitidez e poses</h1>
    <p>
      Preview local com os componentes reais. As duas artes completas têm 512 por 512 px, sem
      ampliar fontes pequenas.
    </p>
    <section className="quality-comparison" aria-label="Comparação na mesma escala">
      <figure>
        <AchievementArt item={math} />
        <figcaption>Matemática, referência</figcaption>
      </figure>
      <figure>
        <AchievementArt item={english} />
        <figcaption>Inglês, arte refeita</figcaption>
      </figure>
    </section>
    <h2>Artes sem os três raios</h2>
    <section className="quality-poses quality-cleanup" aria-label="Artes corrigidas">
      {cleanup.map((item) => (
        <figure key={item.id}>
          <AchievementArt item={item} />
          <figcaption>{item.name}</figcaption>
        </figure>
      ))}
    </section>
    <h2>Oito cenas da Olena</h2>
    <section className="quality-poses" aria-label="Poses da Olena">
      {poses.map((item) => (
        <figure key={item.id}>
          <AchievementArt item={item} />
          <figcaption>{item.name}</figcaption>
        </figure>
      ))}
    </section>
  </main>,
);
