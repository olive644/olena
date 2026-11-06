import { ENGLISH_ISLAND_CATALOG } from "./english-island-catalog";
const titles = [
  { "pt-BR": "Cais das Boas-vindas", "en-US": "Welcome Dock" },
  { "pt-BR": "Praça dos Hábitos", "en-US": "Habit Square" },
  { "pt-BR": "Ponte das Memórias", "en-US": "Memory Bridge" },
  { "pt-BR": "Mirante dos Planos", "en-US": "Plans Lookout" },
  { "pt-BR": "Pátio das Ideias", "en-US": "Ideas Courtyard" },
  { "pt-BR": "Casa dos Sentidos", "en-US": "House of Meaning" },
  { "pt-BR": "Mercado dos Encontros", "en-US": "Encounters Market" },
  { "pt-BR": "Arquivo das Entrelinhas", "en-US": "Between-the-Lines Archive" },
] as const;
const art = [
  "welcome",
  "habits",
  "memories",
  "plans",
  "ideas",
  "meaning",
  "market",
  "archive",
] as const;
export const ENGLISH_PART_CATALOG = titles.map((title, index) => ({
  id: art[index]!,
  art: art[index]!,
  title,
  subject: ENGLISH_ISLAND_CATALOG[0].parts[index]!,
}));
