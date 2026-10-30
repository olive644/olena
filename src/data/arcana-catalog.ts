import { useEffect, useState } from "react";
import { uiText, uiTextRevision, useLanguage } from "../i18n/runtime";
import { isArcanaId, type ArcanaId } from "./arcana-ids";
export { activeArcanaId, type ArcanaId } from "./arcana-ids";
export type ArcanaCard = {
  id: ArcanaId;
  group: string;
  title: string;
  meaning: string;
  mark: string;
  characters: string[];
  asset: string;
  apiId: string;
};
let stored: ArcanaCard[] = [];
const listeners = new Set<() => void>();
let pending: Promise<ArcanaCard[]> | undefined;
let localized: { source: ArcanaCard[]; revision: number; cards: ArcanaCard[] } | undefined;
function localizedCards(source: ArcanaCard[], revision: number) {
  if (localized?.source !== source || localized.revision !== revision)
    localized = {
      source,
      revision,
      cards: source.map((card) => ({
        ...card,
        title: uiText(card.title),
        meaning: uiText(card.meaning),
      })),
    };
  return localized.cards;
}
export function loadArcanaCatalog() {
  return (pending ??= fetch("/arcana/catalog.json")
    .then(async (response) => {
      if (!response.ok) throw Error("catalog");
      const rows: unknown = await response.json();
      if (
        !Array.isArray(rows) ||
        rows.length !== 78 ||
        !rows.every(
          (c) =>
            c &&
            isArcanaId(c.id) &&
            ["group", "title", "meaning", "mark", "asset", "apiId"].every(
              (k) => typeof c[k] === "string",
            ) &&
            /^\/arcana\/[a-z0-9/-]+\.webp$/.test(c.asset) &&
            Array.isArray(c.characters) &&
            c.characters.every((v: unknown) => typeof v === "string"),
        ) ||
        new Set(rows.map((c) => c.id)).size !== 78
      )
        throw Error("catalog");
      stored = rows as ArcanaCard[];
      for (const update of listeners) update();
      return stored;
    })
    .catch((e) => {
      pending = undefined;
      throw e;
    }));
}
export function useArcanaCatalog() {
  useLanguage();
  const [rows, setRows] = useState(stored);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const update = () => {
      setRows(stored);
      setError(false);
    };
    listeners.add(update);
    void loadArcanaCatalog()
      .then((value) => {
        if (active) setRows(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      listeners.delete(update);
    };
  }, [attempt]);
  return {
    cards: localizedCards(rows, uiTextRevision()),
    error,
    retry: () => {
      setError(false);
      setAttempt((value) => value + 1);
    },
  };
}
