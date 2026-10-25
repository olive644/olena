import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppView } from "./use-app-view";

afterEach(() => window.history.replaceState(null, "", "/"));

describe("aba ativa no endereço", () => {
  it("não transforma endereço inexistente em início e permite voltar ao Espaço", () => {
    window.history.replaceState(null, "", "/pagina-que-nao-existe");
    const { result } = renderHook(() => useAppView("today"));
    expect(result.current[0]).toBeNull();
    act(() => result.current[1]("today"));
    expect(window.location.pathname).toBe("/");
    expect(result.current[0]).toBe("today");
    act(() => {
      window.history.replaceState(null, "", "/outra-pagina-inexistente");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current[0]).toBeNull();
  });
  it("preserva o endereço do projetor quando o convite válido pediu Sala", () => {
    window.history.replaceState(null, "", "/sala/ABCDE/projetor");
    const { result } = renderHook(() => useAppView("room"));
    expect(result.current[0]).toBe("room");
  });
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
