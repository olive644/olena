import { useLayoutEffect } from "react";
import { renderHook, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useStoredProfile } from "./use-stored-profile";

afterEach(() => {
  cleanup();
  localStorage.clear();
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
