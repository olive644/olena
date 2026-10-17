import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./app";

function navigate(label: string) {
  const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
  fireEvent.click(within(navigation).getByRole("button", { name: label }));
}

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    localStorage.clear();
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });

  it("abre o onboarding na primeira visita", async () => {
    localStorage.removeItem("helena.onboarding.v1");
    render(<App />);
    expect(
      await screen.findByRole(
        "heading",
        { name: "Em que fase dos estudos você está?" },
        { timeout: 5000 },
      ),
    ).toBeTruthy();
  });

  it("apresenta a marca textual sem avisos ou mascote decorativa no cabeçalho", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Espaço do aluno" })).toBeTruthy();
    expect(screen.queryByText(/dados salvos neste dispositivo/i)).toBeNull();
    const sidebar = screen.getByRole("complementary", { name: "" });
    fireEvent.click(within(sidebar).getByRole("button", { name: "Expandir menu lateral" }));
    expect(within(sidebar).getByLabelText("OlenaStudy")).toBeTruthy();
    expect(screen.queryByAltText(/rosto da helena/i)).toBeNull();
    expect(screen.queryByAltText("Helena, a mascote do OlenaStudy")).toBeNull();
    expect(screen.queryByText(/by oli/i)).toBeNull();
  });

  it("mostra uma rota de estudo recomendada e abre o próximo módulo", async () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Dê um ponto de partida ao seu estudo" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Abrir Biblioteca" }));
    expect(
      await screen.findByRole("heading", { name: "Novo material" }, { timeout: 5000 }),
    ).toBeTruthy();
  });

  it("expande a navegação lateral para revelar categorias e nomes", () => {
    render(<App />);
    const sidebar = screen.getByRole("complementary", { name: "" });
    const toggle = within(sidebar).getByRole("button", { name: "Expandir menu lateral" });

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(within(sidebar).getByRole("button", { name: "Recolher menu lateral" })).toBeTruthy();
    expect(sidebar.classList.contains("sidebar--expanded")).toBe(true);
    expect(within(sidebar).getByLabelText("OlenaStudy")).toBeTruthy();
    expect(within(sidebar).getByText("Área do aluno")).toBeTruthy();
    expect(within(sidebar).getByText("Meus materiais")).toBeTruthy();
    expect(within(sidebar).queryByText("Área do professor")).toBeNull();
    expect(within(sidebar).getByRole("button", { name: "Perfil" })).toBeTruthy();
  });

  it("não mostra a foto Google no cabeçalho mesmo quando estiver disponível", () => {
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ name: "Ana", photoUrl: "https://example.com/ana.png" }),
    );
    render(<App />);

    expect(document.querySelector(".page-header .profile-menu")).toBeNull();
    expect(screen.queryByLabelText("Perfil de Ana")).toBeNull();
  });

  it("mantém a estrela da Helena montada ao trocar de aba", async () => {
    render(<App />);
    const star = await screen.findByRole("button", { name: "Conversar com Helena" });
    expect(screen.getByRole("complementary", { name: "Assistente Helena" })).toBeTruthy();
    navigate("Agenda");
    expect(screen.getByRole("button", { name: "Conversar com Helena" })).toBe(star);
    navigate("Foco");
    expect(screen.getByRole("button", { name: "Conversar com Helena" })).toBe(star);
  });

  // Inclui importação fria da rota e seleção no diálogo, como os fluxos de caderno.
  it("permite escolher um avatar oficial nas configurações do perfil", async () => {
    render(<App />);
    navigate("Perfil");
    fireEvent.click(
      await screen.findByRole("button", { name: "Configurações" }, { timeout: 5000 }),
    );
    fireEvent.click(screen.getByText("Escolher avatar", { selector: "summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Helena" }));
    expect(JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}")).toEqual({
      name: "Helena",
      photoUrl: "/profile-avatars/helena.webp",
    });
  }, 15000);

  it("evita o widget duplicado de matérias e metas na Agenda", async () => {
    render(<App />);

    navigate("Praticar");
    expect(screen.queryByRole("heading", { name: /metas de estudo/i })).toBeNull();

    navigate("Agenda");
    await screen.findByRole("heading", { name: "Minha agenda" }, { timeout: 5000 });
    expect(screen.queryByText("Matérias e metas")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Retomar com calma" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Planejamento da semana selecionada" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Uma semana possível" })).toBeNull();
  });

  it("mantém as ferramentas na navegação sem duplicá-las no painel principal", () => {
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    const main = screen.getByRole("main");

    expect(within(navigation).getByRole("button", { name: "Cadernos" })).toBeTruthy();
    expect(within(main).queryByRole("button", { name: "Cadernos" })).toBeNull();
  });

  it("organiza as ferramentas secundárias no menu móvel", async () => {
    render(<App />);
    const mobileNavigation = screen.getByRole("navigation", { name: "Navegação móvel" });
    expect(
      mobileNavigation.querySelectorAll(
        ":scope > .mobile-nav__item, :scope > .appearance-picker > .mobile-nav__item",
      ),
    ).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Mais ferramentas" }));

    const moreMenu = screen.getByRole("dialog", { name: "Mais ferramentas" });
    expect(within(moreMenu).queryByLabelText("Trocar foto de perfil")).toBeNull();
    expect(within(moreMenu).queryByRole("button", { name: "Hábitos" })).toBeNull();
    fireEvent.click(within(moreMenu).getByRole("button", { name: "Biblioteca" }));
    expect(await screen.findByRole("main")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Mais ferramentas" })).toBeNull();
  });

  it("mantém Praticar no mesmo padrão dos outros itens móveis", () => {
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Navegação móvel" });
    const practice = within(navigation).getByRole("button", { name: "Praticar" });
    const agenda = within(navigation).getByRole("button", { name: "Agenda" });
    expect(practice.className).toBe(agenda.className);
    expect(practice.querySelectorAll(".navigation-icon__variant")).toHaveLength(3);
    fireEvent.click(practice);
    expect(practice.getAttribute("aria-current")).toBe("page");
    expect(practice.className).toBe("mobile-nav__item mobile-nav__item--active");
  });

  it("usa a iconografia própria da Helena em todas as abas", () => {
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    const icons = [
      ["Espaço do aluno", "today"],
      ["Agenda", "planner"],
      ["Foco", "focus"],
      ["Praticar", "gamepad"],
      ["Biblioteca", "library"],
      ["Cadernos", "notes"],
    ] as const;

    icons.forEach(([label, icon]) => {
      const button = within(navigation).getByRole("button", { name: label });
      const artwork = button.querySelector(`[data-icon="${icon}"]`);
      expect(artwork).toBeTruthy();
      expect(artwork?.classList.contains("navigation-icon--brand")).toBe(true);
      expect(artwork?.querySelectorAll(".navigation-icon__variant")).toHaveLength(3);
      for (const variant of ["claro", "roxo", "escuro"]) {
        expect(
          artwork?.querySelector(`img[src="/navigation-icons/paper/${variant}/${icon}.svg"]`),
        ).toBeTruthy();
      }
    });
  });

  it("troca aparência somente pelas configurações com iconografia própria", async () => {
    render(<App />);
    expect(document.querySelector(".page-header__theme")).toBeNull();
    navigate("Perfil");
    fireEvent.click(
      await screen.findByRole("button", { name: "Configurações" }, { timeout: 5000 }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Aparência e acessibilidade" }));
    const appearance = screen.getByRole("region", { name: "Seu papel, sua luz" });
    const darkButton = within(appearance).getByRole("button", { name: "Escuro" });
    const lightArtwork = darkButton.querySelector('[data-icon="theme-dark"]');
    expect(lightArtwork?.classList.contains("navigation-icon--brand")).toBe(true);
    expect(lightArtwork?.querySelectorAll(".navigation-icon__variant")).toHaveLength(3);
    expect(
      lightArtwork?.querySelector('img[src="/navigation-icons/paper/claro/theme-dark.svg"]'),
    ).toBeTruthy();

    fireEvent.click(darkButton);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(darkButton.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".page-header__theme")).toBeNull();
  });

  it("cria uma tarefa, mostra no Espaço do aluno e permite concluí-la", async () => {
    render(<App />);
    navigate("Agenda");
    const add = await screen.findByRole("button", { name: "Criar tarefa" });
    expect(add.querySelector('[data-paper-icon="plus"]')).toBeTruthy();
    fireEvent.click(add);
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Revisar phrasal verbs" },
    });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Adicionar" }));

    navigate("Espaço do aluno");
    expect(screen.getByText("Revisar phrasal verbs")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /concluir revisar phrasal verbs/i }));
    expect(screen.queryByText("Revisar phrasal verbs")).toBeNull();
  });

  it("cria caderno sem exibir o módulo de hábitos removido", async () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: "Hábitos" })).toBeNull();
    navigate("Cadernos");
    fireEvent.click(await screen.findByRole("button", { name: "Crie" }, { timeout: 5000 }));
    expect(screen.queryByRole("button", { name: /Anotações/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Criar caderno" }));
    expect(screen.getByRole("button", { name: "Criar primeira folha" })).toBeTruthy();
  }, 15000);

  it("cria a primeira folha diretamente na prévia do caderno", async () => {
    render(<App />);
    navigate("Cadernos");
    fireEvent.click(await screen.findByRole("button", { name: "Crie" }, { timeout: 5000 }));
    fireEvent.click(screen.getByRole("button", { name: "Criar caderno" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar primeira folha" }));

    // O estúdio é um chunk lazy separado do caderno, inclusive em execução fria.
    expect(
      await screen.findByRole("dialog", { name: "Escrever à mão" }, { timeout: 5000 }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload" })).toBeTruthy();
  }, 15000);

  it("abre as configurações pelo Perfil da navegação desktop", async () => {
    render(<App />);
    navigate("Perfil");
    expect(
      await screen.findByRole("region", { name: "Seu perfil" }, { timeout: 5000 }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
    expect(
      screen.getByRole("heading", { name: "Seus estudos em todos os dispositivos" }),
    ).toBeTruthy();
    expect(screen.getByText("Somente neste dispositivo")).toBeTruthy();
    const profile = within(
      screen.getByRole("navigation", { name: "Navegação principal" }),
    ).getByRole("button", { name: "Perfil" });
    expect(profile.getAttribute("aria-current")).toBe("page");
    expect(
      profile.querySelector('img[src="/navigation-icons/paper/profile-active.svg"]'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mais ferramentas" }));
    expect(
      within(screen.getByRole("dialog", { name: "Mais ferramentas" })).queryByRole("button", {
        name: "Perfil",
      }),
    ).toBeNull();
  });

  it("mostra a rosa que cresce com o temporizador de foco", async () => {
    render(<App />);

    navigate("Perfil");
    expect(await screen.findByRole("region", { name: "Seu perfil" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Configurações" }));
    fireEvent.click(screen.getByRole("button", { name: "Estudo e foco" }));
    fireEvent.click(screen.getByRole("button", { name: /50 minutos/i }));
    const profileLongBreak = screen.getByRole("button", {
      name: /pausa longa após 4 rodadas/i,
    });
    expect(profileLongBreak.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(profileLongBreak);
    expect(profileLongBreak.getAttribute("aria-pressed")).toBe("false");

    navigate("Foco");

    expect(await screen.findByRole("img", { name: /rosa de foco crescendo/i })).toBeTruthy();
    expect(screen.getByText(/comece uma sessão hoje para manter a rosa viva/i)).toBeTruthy();
    expect(screen.getByText(/0\/60 min até florescer por completo/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "00:00:00" })).toBeTruthy();
    expect(screen.getByText("Cronômetro")).toBeTruthy();
    expect(screen.queryByText("Modo sem distrações")).toBeNull();
    expect(screen.queryByText("de foco registrados neste dispositivo")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Próximo modo" }));
    expect(screen.getByText("Pomodoro")).toBeTruthy();
    expect(screen.queryByText("Tempo de foco", { exact: true })).toBeNull();
    expect(screen.queryByText("Modo sem distrações")).toBeNull();
    expect(screen.queryByText(/uma maçã/i)).toBeNull();
    expect(screen.getByRole("img", { name: /tomate pomodoro em papel recortado/i })).toBeTruthy();
    expect(document.querySelectorAll(".streak-tomato")).toHaveLength(7);
    expect(screen.getByText(/50 min de foco · 5 min de pausa · sem pausa longa/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "50:00" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /25 minutos/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /pausa longa após 4 rodadas/i })).toBeNull();
    expect(screen.getByLabelText(/escolha o prazo/i)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /um período de cada vez/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /começar/i }));
    expect(screen.getByRole("button", { name: /pausar/i })).toBeTruthy();
  });

  it("abre as ilhas de Matemática, sem trilha, e retorna aos mundos", async () => {
    render(<App />);
    navigate("Praticar");
    expect(await screen.findByRole("heading", { name: "Picos dos Padrões" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Explorar Matemática" }));
    expect(screen.getByRole("region", { name: "Ilhas de Matemática" })).toBeTruthy();
    expect(document.querySelector(".practice-trail-map")).toBeNull();
    expect(screen.getByRole("heading", { name: "Pátio das Primeiras Contas" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar às ilhas" }));
    expect(await screen.findByRole("heading", { name: "Picos dos Padrões" })).toBeTruthy();
  });

  it("bloqueia as cinco outras ilhas mesmo com progresso legado salvo", async () => {
    localStorage.setItem("helena.soloProgress", "4");
    render(<App />);
    navigate("Praticar");
    await screen.findByRole("region", { name: "Ilhas de estudo" });
    for (let index = 0; index < 4; index++)
      fireEvent.click(screen.getByRole("button", { name: "Mundo anterior" }));
    for (let index = 0; index < 6; index++) {
      const button = screen.getByRole("button", {
        name: index === 4 ? "Explorar Matemática" : "Ilha bloqueada",
      }) as HTMLButtonElement;
      expect(button.disabled).toBe(index !== 4);
      if (index !== 4) fireEvent.click(button);
      expect(document.querySelector(".practice-trail-map")).toBeNull();
      if (index < 5) fireEvent.click(screen.getByRole("button", { name: "Próximo mundo" }));
    }
    expect(localStorage.getItem("helena.soloProgress")).toBe("4");
  });

  it("mantém os cenários navegáveis e o avatar sem os controles antigos", async () => {
    render(<App />);
    navigate("Praticar");
    await screen.findByRole("region", { name: "Ilhas de estudo" });
    expect(screen.queryByText("Ilhas do conhecimento")).toBeNull();
    expect(screen.queryByText("Pratique para lembrar.")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    for (let index = 0; index < 4; index++)
      fireEvent.click(screen.getByRole("button", { name: "Mundo anterior" }));
    expect(screen.getByRole("heading", { name: "Porto das Vozes" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Mundo 1: Idiomas/ }).getAttribute("src")).toBe(
      "/practice-islands/languages.webp",
    );
    fireEvent.keyDown(screen.getByRole("region", { name: "Ilhas de estudo" }), {
      key: "ArrowLeft",
    });
    expect(screen.getByRole("heading", { name: "Porto das Vozes" })).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Mundo anterior" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("mantém dados após remontar o aplicativo", async () => {
    const firstRender = render(<App />);
    navigate("Agenda");
    fireEvent.click(await screen.findByRole("button", { name: "Criar tarefa" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Preparar apresentação" },
    });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Adicionar" }));
    firstRender.unmount();

    render(<App />);
    expect(screen.getByRole("button", { name: "Editar Preparar apresentação" })).toBeTruthy();
  });

  it("oculta as ferramentas do professor da navegação por enquanto", () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: "Planos de aula" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Banco de atividades" })).toBeNull();
  });

  it("preserva flashcards locais ao abrir o protótipo de Matemática", async () => {
    localStorage.setItem("helena.soloProgress", "2");
    render(<App />);
    navigate("Biblioteca");
    const front = await screen.findByLabelText("Frente");
    fireEvent.change(front, { target: { value: "Improve" } });
    fireEvent.change(screen.getByLabelText("Verso"), { target: { value: "Melhorar" } });
    fireEvent.click(screen.getByRole("button", { name: /criar flashcard/i }));
    expect(screen.getByText("Improve")).toBeTruthy();

    navigate("Praticar");
    fireEvent.click(await screen.findByRole("button", { name: "Explorar Matemática" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar às ilhas" }));
    navigate("Biblioteca");
    expect(await screen.findByText("Improve")).toBeTruthy();
  });
});
