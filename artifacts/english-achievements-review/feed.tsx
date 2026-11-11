import { createRoot } from "react-dom/client";
import { initializeLanguage } from "../../src/i18n/runtime";
import { SocialActivityCard } from "../../src/components/social-activity-card";
import type { SocialActivity } from "../../src/domain/profile-social";
import "../../src/styles.css";
import "../../src/paper-buttons.css";
import "../../src/paper-controls.css";
import "../../src/accessibility.css";
import "../../src/components/profile-social.css";
import "../../src/components/system-updates.css";

// Preview isolado com fixtures, sem autenticação ou publicação de atividades.
const theme = new URLSearchParams(location.search).get("theme") ?? "light";
document.documentElement.dataset["theme"] = theme;
localStorage.setItem("helenastudy.theme", theme);
await initializeLanguage();
const person = {
  username: "perfil-teste",
  name: "Perfil de teste",
  photoUrl: "/profile-avatars/helena.webp",
  followers: 0,
  following: 0,
  followed: false,
  followsYou: false,
  shared: true,
};
const base = { person, at: Date.parse("2026-11-06T12:00:00Z"), liked: false, likes: [], value: 1 };
const activities: SocialActivity[] = [
  { ...base, id: "a".repeat(32), kind: "practice", course: "english", value: 20 },
  { ...base, id: "b".repeat(32), kind: "module", course: "english", level: 7 },
  { ...base, id: "c".repeat(32), kind: "achievement", ref: "english-part-0" },
  { ...base, id: "d".repeat(32), kind: "practice", course: "foundations", value: 12 },
];
createRoot(document.getElementById("root")!).render(
  <main
    className="notification-center"
    style={{ width: "100%", margin: "0 auto", maxWidth: 1000, padding: 16 }}
  >
    <h1>Atividades</h1>
    <p>Preview com dados fictícios, sem conta conectada.</p>
    <section className="notification-center-body" aria-label="Feed de revisão">
      {activities.map((activity) => (
        <SocialActivityCard key={activity.id} activity={activity} own />
      ))}
    </section>
  </main>,
);
