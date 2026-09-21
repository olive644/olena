import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./app";

function navigate(label: string) {
  const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
  fireEvent.click(within(navigation).getByRole("button", { name: label }));
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("helena.onboarding.v1", JSON.stringify({ completed: true }));
  });

  it("abre o onboarding na primeira visita", async () => {
    localStorage.removeItem("helena.onboarding.v1");
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Em que fase dos estudos você está?" }),
    ).toBeTruthy();
  });

  it("apresenta a marca textual sem avisos ou mascote decorativa no cabeçalho", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Espaço do aluno" })).toBeTruthy();
    expect(screen.queryByText(/dados salvos neste dispositivo/i)).toBeNull();
    const sidebar = screen.getByRole("complementary");
    fireEvent.click(within(sidebar).getByRole("button", { name: "Expandir menu lateral" }));
    expect(within(sidebar).getByLabelText("OliStudy")).toBeTruthy();
    expect(screen.queryByAltText(/rosto da helena/i)).toBeNull();
    expect(screen.queryByAltText("Helena, a mascote do HelenaStudy")).toBeNull();
    expect(screen.queryByText(/by oli/i)).toBeNull();
  });

  it("mostra uma rota de estudo recomendada e abre o próximo módulo", async () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Dê um ponto de partida ao seu estudo" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Abrir Biblioteca" }));
    expect(await screen.findByRole("heading", { name: "Novo material" })).toBeTruthy();
  });

  it("expande a navegação lateral para revelar categorias e nomes", () => {
    render(<App />);
    const sidebar = screen.getByRole("complementary");
    const toggle = within(sidebar).getByRole("button", { name: "Expandir menu lateral" });

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(within(sidebar).getByRole("button", { name: "Recolher menu lateral" })).toBeTruthy();
    expect(sidebar.classList.contains("sidebar--expanded")).toBe(true);
    expect(within(sidebar).getByLabelText("OliStudy")).toBeTruthy();
    expect(within(sidebar).getByText("Área do aluno")).toBeTruthy();
    expect(within(sidebar).getByText("Meus materiais")).toBeTruthy();
    expect(within(sidebar).getByText("Área do professor")).toBeTruthy();
  });

  it("mostra o perfil Google no canto superior quando estiver disponível", () => {
    localStorage.setItem(
      "helena.profile.v1",
      JSON.stringify({ name: "Ana", photoUrl: "https://example.com/ana.png" }),
    );
    render(<App />);

    const profile = screen.getByLabelText("Perfil de Ana");
    expect(profile.querySelector("img")?.getAttribute("src")).toBe("https://example.com/ana.png");
  });

  it("permite escolher um avatar oficial para o perfil", () => {
    render(<App />);
    fireEvent.click(screen.getAllByLabelText("Escolher perfil")[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Helena" }));

    expect(screen.getByLabelText("Perfil de Helena")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("helena.profile.v1") ?? "{}")).toEqual({
      name: "Helena",
      photoUrl: "/profile-avatars/helena.webp",
    });
  });

  it("mantém as metas em Agenda e deixa Foco dedicado ao timer", async () => {
    render(<App />);

    navigate("Praticar");
    expect(screen.queryByRole("heading", { name: /metas de estudo/i })).toBeNull();

    navigate("Agenda");
    expect(
      await screen.findByRole("heading", { name: "Nova meta de foco" }, { timeout: 3_000 }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Metas de foco" })).toBeTruthy();
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
    expect(within(mobileNavigation).getAllByRole("button")).toHaveLength(5);
    fireEvent.click(within(mobileNavigation).getByRole("button", { name: "Perfil" }));
    expect(await screen.findByRole("heading", { name: "Em produção" })).toBeTruthy();
    expect(screen.getByText("Mais informações em breve.")).toBeTruthy();
    expect(
      within(mobileNavigation)
        .getByRole("button", { name: "Perfil" })
        .querySelector('img[src="/navigation-icons/paper/profile-active.svg"]'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mais" }));

    const moreMenu = screen.getByRole("dialog", { name: "Mais ferramentas" });
    expect(within(moreMenu).queryByLabelText("Trocar foto de perfil")).toBeNull();
    fireEvent.click(within(moreMenu).getByRole("button", { name: "Hábitos" }));
    expect(
      screen.getByRole("heading", { name: /consistência antes de intensidade/i }),
    ).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Mais ferramentas" })).toBeNull();
  });

  it("usa a iconografia própria da Helena em todas as abas", () => {
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    const icons = [
      ["Espaço do aluno", "today"],
      ["Agenda", "planner"],
      ["Foco", "focus"],
      ["Praticar", "learn"],
      ["Biblioteca", "library"],
      ["Hábitos", "habits"],
      ["Cadernos", "notes"],
      ["Planos de aula", "lesson"],
      ["Banco de atividades", "activity-bank"],
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

  it("usa a iconografia própria da Helena no seletor de tema", () => {
    render(<App />);
    const lightThemeButton = screen.getByLabelText(/Aparência: tema claro/i);
    const lightArtwork = lightThemeButton.querySelector('[data-icon="theme-dark"]');
    expect(lightArtwork?.classList.contains("navigation-icon--brand")).toBe(true);
    expect(lightArtwork?.querySelectorAll(".navigation-icon__variant")).toHaveLength(1);
    expect(
      lightArtwork?.querySelector('img[src="/navigation-icons/paper/claro/theme-dark.svg"]'),
    ).toBeTruthy();
    expect(
      lightThemeButton.querySelector('img[src="/navigation-icons/paper/claro/theme-light.svg"]'),
    ).toBeTruthy();

    fireEvent.click(lightThemeButton);
    fireEvent.click(screen.getByRole("button", { name: "Escuro" }));
    const darkThemeButton = screen.getByLabelText(/Aparência: tema escuro/i);
    expect(document.documentElement.dataset["theme"]).toBe("dark");
    const darkArtwork = darkThemeButton.querySelector('[data-icon="theme-light"]');
    expect(darkArtwork?.classList.contains("navigation-icon--brand")).toBe(true);
    expect(darkArtwork?.querySelectorAll(".navigation-icon__variant")).toHaveLength(1);
    expect(
      darkArtwork?.querySelector('img[src="/navigation-icons/paper/claro/theme-light.svg"]'),
    ).toBeTruthy();
  });

  it("cria uma tarefa, mostra no Espaço do aluno e permite concluí-la", async () => {
    render(<App />);
    navigate("Agenda");
    await screen.findByLabelText(/o que precisa ser feito/i);
    expect(document.querySelector('.subject-list [data-paper-icon="flag-us"]')).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /adicionar matéria/i })
        .querySelector('[data-paper-icon="plus"]'),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/o que precisa ser feito/i), {
      target: { value: "Revisar phrasal verbs" },
    });
    fireEvent.click(screen.getByRole("button", { name: /adicionar tarefa/i }));

    navigate("Espaço do aluno");
    expect(screen.getByText("Revisar phrasal verbs")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /concluir revisar phrasal verbs/i }));
    expect(screen.queryByText("Revisar phrasal verbs")).toBeNull();
  });

  it("cria hábito e anotação usando o mesmo espaço local", async () => {
    render(<App />);
    navigate("Hábitos");
    fireEvent.change(screen.getByLabelText(/nome do hábito/i), {
      target: { value: "Ler em inglês" },
    });
    fireEvent.click(screen.getByRole("button", { name: /adicionar hábito/i }));
    const habitButton = screen.getByRole("button", { name: /ler em inglês/i });
    fireEvent.click(habitButton);
    expect(habitButton.getAttribute("aria-pressed")).toBe("true");

    navigate("Cadernos");
    fireEvent.click(await screen.findByRole("button", { name: "Crie" }));
    fireEvent.click(screen.getByRole("button", { name: /Anotações/ }));
    fireEvent.click(screen.getByRole("button", { name: "Criar pasta" }));
    fireEvent.click(screen.getByRole("button", { name: "Nova nota" }));
    fireEvent.change(screen.getByLabelText(/título da folha/i), {
      target: { value: "Vocabulário" },
    });
    fireEvent.change(screen.getByLabelText(/conteúdo da folha/i), {
      target: { value: "Improve: melhorar" },
    });
    expect(screen.getByDisplayValue("Improve: melhorar")).toBeTruthy();
  });

  it("oferece digitalização e escrita à mão dentro de uma anotação", async () => {
    render(<App />);
    navigate("Cadernos");
    fireEvent.click(await screen.findByRole("button", { name: "Crie" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar caderno" }));
    fireEvent.click(screen.getByRole("button", { name: "Nova folha" }));

    expect(await screen.findByRole("button", { name: "Digitalizar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escrever à mão" })).toBeTruthy();
  });

  it("abre as configurações pelo Perfil da navegação desktop", async () => {
    render(<App />);
    navigate("Perfil");
    expect(await screen.findByRole("heading", { name: "Preferências de estudo" })).toBeTruthy();
    const profile = within(
      screen.getByRole("navigation", { name: "Navegação principal" }),
    ).getByRole("button", { name: "Perfil" });
    expect(profile.getAttribute("aria-current")).toBe("page");
    expect(
      profile.querySelector('img[src="/navigation-icons/paper/profile-active.svg"]'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mais" }));
    expect(
      within(screen.getByRole("dialog", { name: "Mais ferramentas" })).queryByRole("button", {
        name: "Perfil",
      }),
    ).toBeNull();
  });

  it("mostra a rosa que cresce com o temporizador de foco", async () => {
    render(<App />);

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Navegação móvel" })).getByRole("button", {
        name: "Perfil",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: /personalizar métodos de estudos/i }),
    ).toBeTruthy();
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

  it("cria e completa uma linha no bingo de estudos", async () => {
    localStorage.setItem("helena.soloProgress", "4");
    render(<App />);
    navigate("Praticar");

    fireEvent.click(await screen.findByRole("button", { name: /entrar no mundo/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Nível 4: Bingo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Criar bingo" }));

    const board = screen.getByRole("group", { name: "Cartela de bingo" });
    const cells = within(board).getAllByRole("button");
    expect(cells).toHaveLength(9);
    cells.slice(0, 3).forEach((cell) => fireEvent.click(cell));
    expect(screen.getByRole("status").textContent).toMatch(/bingo/i);
  });

  it("abre o quiz de escuta com vocabulário inicial", async () => {
    render(<App />);
    navigate("Praticar");
    fireEvent.click(await screen.findByRole("button", { name: /entrar no mundo/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Nível 1: Escuta/ }));

    expect(screen.getByRole("heading", { name: /ouça e descubra a palavra/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /iniciar escuta/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /ouvir novamente/i })).toBeTruthy();
  });

  it("permite inspecionar mundos bloqueados e inicia o caminho no nível 1", async () => {
    render(<App />);
    navigate("Praticar");

    expect(
      (await screen.findByRole("img", { name: /Mundo 1: Bosque das palavras/ })).getAttribute(
        "src",
      ),
    ).toBe("/solo-world-1.webp");

    fireEvent.click(await screen.findByRole("button", { name: "Próximo mundo" }));
    expect(screen.getByRole("heading", { name: "Cidade das ideias" })).toBeTruthy();
    expect(screen.getByText("Mundo bloqueado")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mundo anterior" }));
    fireEvent.click(screen.getByRole("button", { name: /entrar no mundo/i }));

    expect(document.querySelector(".solo-level-scenery img")?.getAttribute("src")).toBe(
      "/solo-interior-1.webp",
    );

    expect(
      (screen.getByRole("button", { name: /Nível 1: Escuta/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: /Nível 2: Flashcards/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /Nível 3: Quiz/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /Nível 4: Bingo/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("mantém dados após remontar o aplicativo", () => {
    const firstRender = render(<App />);
    navigate("Agenda");
    fireEvent.change(screen.getByLabelText(/o que precisa ser feito/i), {
      target: { value: "Preparar apresentação" },
    });
    fireEvent.click(screen.getByRole("button", { name: /adicionar tarefa/i }));
    firstRender.unmount();

    render(<App />);
    expect(screen.getByText("Preparar apresentação")).toBeTruthy();
  });

  it("preserva o criador de planos de aula", async () => {
    render(<App />);
    navigate("Planos de aula");
    fireEvent.change(await screen.findByLabelText(/tema da aula/i), {
      target: { value: "Simple Past" },
    });
    fireEvent.click(screen.getByRole("button", { name: /criar rascunho/i }));
    expect(screen.getByRole("heading", { name: "Simple Past" })).toBeTruthy();
    expect(screen.getByText("Warm-up")).toBeTruthy();
  });

  it("cria e revisa um flashcard local", async () => {
    localStorage.setItem("helena.soloProgress", "2");
    render(<App />);
    navigate("Biblioteca");
    const front = await screen.findByLabelText("Frente");
    fireEvent.change(front, { target: { value: "Improve" } });
    fireEvent.change(screen.getByLabelText("Verso"), { target: { value: "Melhorar" } });
    fireEvent.click(screen.getByRole("button", { name: /criar flashcard/i }));
    expect(screen.getByText("Improve")).toBeTruthy();

    navigate("Praticar");
    fireEvent.click(await screen.findByRole("button", { name: /entrar no mundo/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Nível 2: Flashcards/ }));
    expect(await screen.findByRole("heading", { name: "Improve" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /mostrar resposta/i }));
    expect(screen.getByRole("heading", { name: "Melhorar" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fácil" }));
    expect(screen.getByText(/revisão em dia/i)).toBeTruthy();
  });
});
