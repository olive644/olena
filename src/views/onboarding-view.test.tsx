import { getFirebaseAccountServices } from "../data/firebase-account";
import { ACCOUNT_OWNER_KEY } from "../data/personal-data";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingView from "./onboarding-view";
import { prepareOnboarding, type OnboardingAnswers } from "../domain/onboarding-configuration";
import {
  advanceOnboarding,
  chooseOnboarding,
  welcomeOnboarding,
  secondaryOnboarding,
} from "../test/onboarding-steps";
vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));
vi.mock("../data/reduced-motion", () => ({ reducedMotion: () => true }));
vi.mock("../data/onboarding-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../data/onboarding-client")>()),
  requestOnboardingConfiguration: vi.fn(async (answers: OnboardingAnswers) =>
    prepareOnboarding(answers, "onboarding-v1-0123456789abcdef01234567"),
  ),
}));
const user = { uid: "onboarding-owner" };
const updateProfile = vi.fn(async () => {});
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  localStorage.setItem(ACCOUNT_OWNER_KEY, user.uid);
  updateProfile.mockClear();
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: { updateProfile },
    redirectResult: null,
  } as never);
});
function renderOnboarding(finish = vi.fn()) {
  return render(<OnboardingView authenticated onFinish={finish} />);
}
async function throughGoal() {
  renderOnboarding();
  await welcomeOnboarding();
  chooseOnboarding("Estudo por conta própria");
  chooseOnboarding("Matemática");
  chooseOnboarding("Inglês");
  chooseOnboarding("Criar uma rotina");
}
it("keeps original branding without footer, step counter or progress bar", () => {
  const { container } = renderOnboarding();
  expect(container.querySelector(".onboarding__brand")?.textContent).toBe("OlenaStudy");
  expect(container.querySelector(".onboarding__brand img")?.getAttribute("src")).toBe(
    "/olena-favicon-180.png",
  );
  expect(container.querySelector("footer.brand-footer")).toBeNull();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByText(/Passo \d de/)).toBeNull();
});
it("does not offer guest access or reset existing preferences on return", async () => {
  const saved = JSON.stringify({ completed: true, configurationOwner: user.uid });
  localStorage.setItem("helena.onboarding.v1", saved);
  const finish = vi.fn();
  render(<OnboardingView loginOnly onFinish={finish} />);
  expect(await screen.findByRole("button", { name: "Entrar com Google" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Entrar como convidado" })).toBeNull();
  expect(finish).not.toHaveBeenCalled();
  expect(localStorage.getItem("helena.onboarding.v1")).toBe(saved);
});
it("introduces Olena before name, then shows a separate selectable avatar stage", async () => {
  renderOnboarding();
  expect(screen.getByText("Olá! Eu sou a Olena.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Estudante do ensino secundário" })).toBeNull();
  await welcomeOnboarding();
  expect(updateProfile).toHaveBeenCalledWith(user, { displayName: "Ana Souza" });
  expect(screen.getByRole("heading", { name: "Em que fase dos estudos você está?" })).toBeTruthy();
});
it("requires confirmation through secondary type, year and optional institution", async () => {
  renderOnboarding();
  await welcomeOnboarding();
  fireEvent.click(screen.getByRole("button", { name: "Estudante do ensino secundário" }));
  expect(screen.queryByRole("heading", { name: "Qual modalidade você cursa?" })).toBeNull();
  advanceOnboarding();
  expect(screen.getByRole("heading", { name: "Qual modalidade você cursa?" })).toBeTruthy();
  chooseOnboarding("Ensino médio");
  for (const year of ["1º ano do médio", "2º ano do médio", "3º ano do médio"])
    expect(screen.getByRole("button", { name: year })).toBeTruthy();
  chooseOnboarding("2º ano do médio");
  expect(screen.getByRole("heading", { name: "Onde você estuda?" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ignorar" }));
  expect(
    screen.getByRole("heading", { name: "Qual disciplina você mais tem dificuldade?" }),
  ).toBeTruthy();
});
it("offers approved subjects and Asian languages with original journey icons", async () => {
  const { container } = renderOnboarding();
  await welcomeOnboarding();
  secondaryOnboarding();
  for (const subject of [
    "Idiomas",
    "Português",
    "Matemática",
    "Química",
    "Biologia",
    "Ciências",
    "História",
    "Programação",
    "Ainda estou descobrindo",
  ])
    expect(screen.getByRole("button", { name: subject })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Artes e tecnologia" })).toBeNull();
  for (const icon of container.querySelectorAll(".onboarding__choices use"))
    expect(icon.getAttribute("href")).toContain("/onboarding-journey.svg#");
  chooseOnboarding("Matemática");
  for (const name of ["Inglês", "Espanhol", "Japonês", "Chinês"])
    expect(screen.getByRole("button", { name })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Outro idioma" })).toBeNull();
});
it("keeps selection on the current question until advancing, without old reaction bubbles", async () => {
  renderOnboarding();
  await welcomeOnboarding();
  chooseOnboarding("Estudo por conta própria");
  const math = screen.getByRole("button", { name: "Matemática" });
  fireEvent.click(math);
  expect(math.getAttribute("aria-pressed")).toBe("true");
  expect(screen.queryByRole("button", { name: "Inglês" })).toBeNull();
  expect(screen.queryByText("Boa! Já dá para montar um começo sob medida.")).toBeNull();
  advanceOnboarding();
  expect(screen.getByRole("heading", { name: "Qual idioma você quer praticar?" })).toBeTruthy();
});
it("requires at least one modality and preserves explicit next navigation", async () => {
  await throughGoal();
  const next = screen.getByRole("button", { name: "Avançar" });
  expect(next.hasAttribute("disabled")).toBe(true);
  const visual = screen.getByRole("button", { name: "Visual" });
  fireEvent.click(visual);
  expect(visual.getAttribute("aria-pressed")).toBe("true");
  expect(screen.queryByRole("button", { name: "Passo a passo" })).toBeNull();
  expect(next.hasAttribute("disabled")).toBe(false);
  fireEvent.click(next);
  expect(
    screen.getByRole("heading", { name: "Como você gosta de organizar o estudo?" }),
  ).toBeTruthy();
});
it("back restores the preceding answer as selected", async () => {
  renderOnboarding();
  await welcomeOnboarding();
  chooseOnboarding("Estudo por conta própria");
  fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
  expect(screen.getByRole("heading", { name: "Em que fase dos estudos você está?" })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Estudo por conta própria" }).getAttribute("aria-pressed"),
  ).toBe("true");
});
it("prepares and saves all choices, then enters without final sign-up or guest buttons", async () => {
  const finish = vi.fn();
  renderOnboarding(finish);
  await welcomeOnboarding();
  secondaryOnboarding();
  for (const choice of [
    "Matemática",
    "Inglês",
    "Criar uma rotina",
    "Visual",
    "Passo a passo",
    "Foco contínuo",
    "HTML e CSS",
    "15 minutos",
  ])
    chooseOnboarding(choice);
  await waitFor(() => expect(finish).toHaveBeenCalledOnce());
  expect(screen.queryByRole("button", { name: "Registre-se" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Entrar como convidado" })).toBeNull();
  const stored = JSON.parse(localStorage.getItem("helena.onboarding.v1")!);
  expect(stored).toMatchObject({
    completed: true,
    configurationOwner: user.uid,
    details: {
      name: "Ana Souza",
      schoolLevel: "Ensino médio",
      schoolYear: "2º ano do médio",
      institution: "",
    },
  });
  expect(stored.answers).toEqual([
    "Ensino médio",
    "Matemática",
    "Inglês",
    "Criar uma rotina",
    ["Visual"],
    "Passo a passo",
    "Foco contínuo",
    "HTML e CSS",
    "15 minutos",
  ]);
  expect(finish).toHaveBeenCalledWith(
    expect.objectContaining({
      displayName: "Ana Souza",
      preferences: expect.objectContaining({ programming: "html-css", modalities: ["visual"] }),
    }),
  );
});
it("uses the approved cutout at the same size for the conversation", () => {
  const { container } = renderOnboarding();
  expect(container.querySelector(".onboarding__helena")?.getAttribute("src")).toMatch(
    /-cutout\.webp$/,
  );
});
