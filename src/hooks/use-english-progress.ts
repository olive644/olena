import { useEffect, useMemo, useState } from "react";
import {
  ENGLISH_PROGRESS_KEY,
  ledgerFromAreas,
  mergeEnglishLedgers,
  parseEnglishLedger,
  serializeEnglishLedger,
} from "../domain/english-progress-ledger";
import { englishProgress } from "../domain/language-progress";
import type { EnglishArea } from "../domain/english-areas";
import type { PracticeActivity } from "../domain/workspace";
import {
  SYNCED_STORAGE_APPLIED_EVENT,
  SYNCED_STORAGE_EVENT,
  writeSyncedStorage,
} from "../data/synced-storage";

function readLedger() {
  try {
    return parseEnglishLedger(window.localStorage.getItem(ENGLISH_PROGRESS_KEY));
  } catch {
    return parseEnglishLedger(null);
  }
}

/**
 * Progresso de Inglês que sobrevive à lista de atividades: parte do livro guardado na conta e,
 * quando as atividades mostram mais avanço, grava o livro maior (que só cresce) para sincronizar.
 */
export function useEnglishProgress(
  activities: readonly PracticeActivity[] | undefined,
  area: EnglishArea = "english",
) {
  const [ledger, setLedger] = useState(readLedger);
  useEffect(() => {
    const reload = () =>
      setLedger((current) => {
        const next = readLedger();
        return serializeEnglishLedger(next) === serializeEnglishLedger(current) ? current : next;
      });
    // A gravação feita por este hook também chega por aqui, o que atualiza o estado sem
    // chamar setState dentro do efeito.
    for (const type of [SYNCED_STORAGE_APPLIED_EVENT, SYNCED_STORAGE_EVENT, "storage"])
      window.addEventListener(type, reload);
    return () => {
      for (const type of [SYNCED_STORAGE_APPLIED_EVENT, SYNCED_STORAGE_EVENT, "storage"])
        window.removeEventListener(type, reload);
    };
  }, []);
  const progress = useMemo(
    () => englishProgress(activities, area, ledger),
    [activities, area, ledger],
  );
  useEffect(() => {
    const next = mergeEnglishLedgers(ledger, ledgerFromAreas(progress.areas));
    const serialized = serializeEnglishLedger(next);
    if (serialized === serializeEnglishLedger(ledger)) return;
    try {
      writeSyncedStorage(ENGLISH_PROGRESS_KEY, serialized);
    } catch {
      // Armazenamento cheio: o progresso continua calculado a partir das atividades.
    }
  }, [ledger, progress]);
  return progress;
}
