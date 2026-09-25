import { useCallback, useEffect, useRef, useState } from "react";
import {
  readListeningOnlineChoice,
  writeListeningOnlineChoice,
  type ListeningOnlineChoice,
} from "../data/listening-consent";

// Escolha da pessoa sobre a voz natural e a consulta de vocabulário online. Sem escolha
// (ou com recusa) nada sai do aparelho. `isAllowed` é estável e sempre lê o valor atual, então o
// jogador de voz não precisa ser recriado a cada mudança.
export function useListeningOnline() {
  const [choice, setChoice] = useState<ListeningOnlineChoice | null>(() => {
    try {
      return readListeningOnlineChoice(window.localStorage);
    } catch {
      return null;
    }
  });
  const allowedRef = useRef(choice === "accepted");
  useEffect(() => {
    allowedRef.current = choice === "accepted";
  }, [choice]);
  const isAllowed = useCallback(() => allowedRef.current, []);

  const choose = useCallback((next: ListeningOnlineChoice) => {
    try {
      writeListeningOnlineChoice(window.localStorage, next);
    } catch {
      /* Sem armazenamento, a escolha vale só nesta tela. */
    }
    allowedRef.current = next === "accepted";
    setChoice(next);
  }, []);

  return { choice, allowed: choice === "accepted", isAllowed, choose };
}
