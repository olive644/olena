import { fireEvent, screen, within } from "@testing-library/react";
import { uiText } from "../i18n/runtime";

export function advanceOnboarding() {
  fireEvent.click(screen.getByRole("button", { name: uiText("Avançar") }));
}

export function chooseOnboarding(value: string) {
  fireEvent.click(screen.getByRole("button", { name: uiText(value) }));
  advanceOnboarding();
}

export async function welcomeOnboarding() {
  fireEvent.click(
    await screen.findByRole("button", { name: uiText("Prosseguir") }, { timeout: 4500 }),
  );
  fireEvent.change(screen.getByRole("textbox", { name: uiText("Como devo te chamar?") }), {
    target: { value: "Ana Souza" },
  });
  const welcome = () => within(document.querySelector<HTMLElement>(".onboarding__welcome")!);
  fireEvent.click(welcome().getByRole("button", { name: uiText("Avançar") }));
  await screen.findByRole("heading", { name: uiText("Personalize seu visual!") });
  fireEvent.click(welcome().getByRole("button", { name: "Oliver" }));
  fireEvent.click(welcome().getByRole("button", { name: uiText("Avançar") }));
}

export function secondaryOnboarding() {
  chooseOnboarding("Estudante do ensino secundário");
  chooseOnboarding("Ensino médio");
  chooseOnboarding("2º ano do médio");
  fireEvent.click(screen.getByRole("button", { name: uiText("Ignorar") }));
}
