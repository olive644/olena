import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRoomEstimatedDuration } from "../domain/local-room";
import { LocalRoom } from "./local-room";

describe("resumo da duração da sala", () => {
  it("inclui o feedback de três segundos por pergunta", () => {
    expect(formatRoomEstimatedDuration(3, 30)).toBe("1min39s");
  });
});

describe("chegada por link de convite", () => {
  it("recolhe modalidades e anima remoção individual e limpeza", async () => {
    render(<LocalRoom accountName="Ana" />);
    fireEvent.click(screen.getByRole("radio", { name: /Escuta coletiva/ }));
    const modalities = screen.getByRole("button", { name: /Modalidades coletivas/ });
    expect(modalities.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("room-modalities")?.hasAttribute("inert")).toBe(true);
    fireEvent.click(modalities);
    expect(modalities.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Inglês" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "school" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /school/ }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "book" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /book/ }));
    fireEvent.click(screen.getByRole("button", { name: "Remover school" }));
    expect(document.querySelector(".local-room-ready-words__selected .is-removing")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remover school" })).toBeNull();
    await waitFor(() =>
      expect(document.querySelector(".local-room-ready-words__selected .is-removing")).toBeNull(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(document.querySelector(".local-room-ready-words__selected .is-removing")).toBeTruthy();
    await waitFor(() =>
      expect(document.querySelector(".local-room-ready-words__selected")).toBeNull(),
    );
  }, 15000);
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pula a tela inicial e já mostra o formulário de entrar com o código preenchido", () => {
    render(<LocalRoom initialJoinCode="ABCDE" />);
    expect(screen.getByText(/entrar em uma sala/i)).toBeTruthy();
    expect((screen.getByLabelText(/código/i) as HTMLInputElement).value).toBe("ABCDE");
  });

  it("sem código de convite, mostra a tela inicial normal", () => {
    render(<LocalRoom accountName="Ana" />);
    expect(screen.queryByRole("heading", { name: /^modo sala$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
    expect(document.body.classList.contains("local-room-active")).toBe(false);
    expect(document.querySelectorAll(".local-room-ready-words__results button")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /criar sala/i })).toBeNull();
    expect(
      screen.getAllByRole("radio").every((radio) => radio.getAttribute("aria-checked") === "false"),
    ).toBe(true);
    expect(screen.getByRole("radiogroup", { name: "Atividades da sala" })).toBeTruthy();
    expect(screen.queryByLabelText("Código da sala")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Participantes" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: /entrar com código/i })).toBeNull();
  });

  it("prepara o minigame e as palavras sem criar nem alterar uma sala remota", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<LocalRoom accountName="Ana" />);
    fireEvent.click(screen.getByRole("radio", { name: /Escuta coletiva/ }));
    const create = screen.getByRole("button", { name: /^Criar sala$/ });
    expect(create.hasAttribute("disabled")).toBe(true);
    const english = screen.getByRole("button", { name: "Inglês" });
    expect(english.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("searchbox")).toBeNull();
    fireEvent.click(english);
    expect(english.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelectorAll(".local-room-ready-words__results button")).toHaveLength(100);
    expect(screen.queryByRole("button", { name: "Selecionar exibidas" })).toBeNull();
    expect(screen.queryByText("0 palavras na rodada")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Respostas" })).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Responder individualmente" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Responder em equipes" }));
    expect(
      screen.getByRole("button", { name: "Responder em equipes" }).getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("checkbox", { name: /school/ }));
    expect(screen.queryByRole("button", { name: "Aplicar seleção" })).toBeNull();
    await waitFor(() => expect(create.hasAttribute("disabled")).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(create.hasAttribute("disabled")).toBe(false);
    fireEvent.click(english);
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(english.textContent).toContain("1 selecionadas");
  });

  it("preenche a barra somente até o passo do tempo selecionado", () => {
    render(<LocalRoom accountName="Ana" />);
    fireEvent.click(screen.getByRole("radio", { name: /Escuta coletiva/ }));
    const slider = screen.getByRole("slider", { name: "Tempo por pergunta" });
    fireEvent.change(slider, { target: { value: "1" } });
    expect(slider.getAttribute("aria-valuetext")).toBe("10s");
    expect((slider as HTMLElement).style.getPropertyValue("--room-slider-progress")).toBe(
      "33.33333333333333%",
    );
    fireEvent.pointerUp(slider);
  });

  it("não adiciona falas vazias e remove configurações redundantes de áudio", async () => {
    render(<LocalRoom accountName="Ana" />);
    fireEvent.click(screen.getByRole("radio", { name: /Escuta coletiva/ }));
    expect(screen.queryByText("Prepare a escuta")).toBeNull();
    expect(screen.queryByText("Configurações de áudio")).toBeNull();
    expect(screen.queryByText("Importar lista")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Enviar arquivos$/ }));
    const add = screen.getByRole("button", { name: "Adicionar fala" });
    expect(add.hasAttribute("disabled")).toBe(true);
    fireEvent.click(add);
    expect(screen.queryByLabelText("Palavra em inglês da fala 2")).toBeNull();
    fireEvent.change(screen.getByLabelText("Palavra em inglês da fala 1"), {
      target: { value: "book" },
    });
    fireEvent.change(screen.getByLabelText("Tradução da fala 1"), { target: { value: "livro" } });
    expect(add.hasAttribute("disabled")).toBe(true);
  });

  it("normaliza o código colado e só libera a entrada com os dois campos válidos", () => {
    render(<LocalRoom accountName="Ana" initialJoinCode="ABCDE" />);

    const submit = screen.getByRole("button", { name: /^entrar$/i });
    fireEvent.paste(screen.getByLabelText(/código/i), {
      clipboardData: { getData: () => "ab-c de" },
    });
    expect(screen.queryByLabelText(/nome de exibição/i)).toBeNull();
    expect(screen.getByText("Ana")).toBeTruthy();

    expect((screen.getByLabelText(/código/i) as HTMLInputElement).value).toBe("ABCDE");
    expect(submit.hasAttribute("disabled")).toBe(false);
  });

  it("não usa apelido local quando a conta é obrigatória", () => {
    localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Apelido local" }));
    const { rerender } = render(<LocalRoom initialJoinCode="ABCDE" requireAccount />);
    expect(screen.getByRole("button", { name: /^Entrar$/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Apelido local")).toBeNull();
    rerender(<LocalRoom initialJoinCode="ABCDE" requireAccount accountName="Nome da conta" />);
    expect(screen.getByText("Nome da conta")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Entrar$/ }).hasAttribute("disabled")).toBe(false);
    localStorage.removeItem("helena.profile.v1");
  });
});
