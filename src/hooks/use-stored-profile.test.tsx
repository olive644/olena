import { useLayoutEffect } from "react";
import { renderHook, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { readStoredProfile, useStoredProfile } from "./use-stored-profile";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("valida favoritos e histórico sem aceitar IDs desconhecidos ou uma quarta peça", () => {
  localStorage.setItem(
    "helena.profile.v1",
    JSON.stringify({
      achievementFavorites: ["correct-1", "correct-10", "correct-50", "correct-100"],
      achievementHistory: {
        "general-following-bronze": "",
        "general-pages-bronze": "2026-10-20T12:00:00Z",
        unknown: "2026-10-20T12:00:00Z",
        "general-timer-bronze": "inválida",
      },
    }),
  );
  expect(readStoredProfile().achievementFavorites).toBeUndefined();
  expect(readStoredProfile().achievementHistory).toEqual({
    "general-following-bronze": "",
    "general-pages-bronze": "2026-10-20T12:00:00Z",
  });
  localStorage.setItem("helena.profile.v1", JSON.stringify({ achievementFavorites: [] }));
  expect(readStoredProfile().achievementFavorites).toEqual([]);
});
it("recupera pronomes hidratados entre render e assinatura dos eventos", () => {
  const { result } = renderHook(() => {
    const profile = useStoredProfile();
    useLayoutEffect(() => {
      localStorage.setItem(
        "helena.profile.v1",
        JSON.stringify({ name: "Oli", pronouns: "Elu/delu" }),
      );
    }, []);
    return profile;
  });
  expect(result.current[0].pronouns).toBe("Elu/delu");
});
