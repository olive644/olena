import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppView } from "./use-app-view";

afterEach(() => window.history.replaceState(null, "", "/"));

describe("aba ativa no endereço", () => {
  it("abre na aba do endereço, então recarregar não volta ao início", () => {
    window.history.replaceState(null, "", "/cadernos");
    const { result } = renderHook(() => useAppView("today"));
    expect(result.current[0]).toBe("notes");
  });

  it("usa o padrão quando o endereço não é de uma aba", () => {
    window.history.replaceState(null, "", "/?sala=ABCDE");
    const { result } = renderHook(() => useAppView("learn"));
    expect(result.current[0]).toBe("learn");
  });

  it("trocar de aba muda o endereço e o botão voltar retorna à anterior", () => {
    const { result } = renderHook(() => useAppView("today"));
    act(() => result.current[1]("notes"));
    expect(window.location.pathname).toBe("/cadernos");
    expect(result.current[0]).toBe("notes");
    act(() => {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current[0]).toBe("today");
  });
});
