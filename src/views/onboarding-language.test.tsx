import { act, render, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import OnboardingView from "./onboarding-view";
import english from "../../public/locales/en-US.json";
import { changeLanguage, installUiCatalog } from "../i18n/runtime";
import { prepareOnboarding, type OnboardingAnswers } from "../domain/onboarding-configuration";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { ACCOUNT_OWNER_KEY } from "../data/personal-data";
import { chooseOnboarding, secondaryOnboarding, welcomeOnboarding } from "../test/onboarding-steps";
vi.mock("../data/firebase-account", () => ({ getFirebaseAccountServices: vi.fn() }));
vi.mock("../data/reduced-motion", () => ({ reducedMotion: () => true }));
vi.mock("../data/onboarding-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../data/onboarding-client")>()),
  requestOnboardingConfiguration: vi.fn(async (answers: OnboardingAnswers) =>
    prepareOnboarding(answers, "onboarding-v1-0123456789abcdef01234567"),
  ),
}));
it.each([
  ["Japanese", "Japonês"],
  ["Chinese", "Chinês"],
])("English %s keeps canonical answers and preferences", async (_language, canonical) => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  const user = { uid: "english-onboarding-owner" };
  localStorage.setItem(ACCOUNT_OWNER_KEY, user.uid);
  vi.mocked(getFirebaseAccountServices).mockResolvedValue({
    auth: { currentUser: user },
    authApi: { updateProfile: vi.fn(async () => {}) },
    redirectResult: null,
  } as never);
  installUiCatalog("en-US", english);
  await changeLanguage("en-US");
  const finish = vi.fn();
  const view = render(<OnboardingView authenticated onFinish={finish} />);
  try {
    await welcomeOnboarding();
    secondaryOnboarding();
    for (const choice of [
      "Programação",
      canonical,
      "Criar uma rotina",
      "Ouvindo e conversando",
      "Visão geral primeiro",
      "Alternar estudo e pausas",
      "HTML e CSS",
      "15 minutos",
    ])
      chooseOnboarding(choice);
    await waitFor(() => expect(finish).toHaveBeenCalledOnce());
    expect(finish).toHaveBeenCalledWith(
      expect.objectContaining({
        preferences: {
          modalities: ["auditivo"],
          processing: "global",
          rhythm: "difuso",
          programming: "html-css",
        },
      }),
    );
    const stored = JSON.parse(localStorage.getItem("helena.onboarding.v1")!);
    expect(stored.answers[4]).toEqual(["Ouvindo e conversando"]);
    expect(stored.answers[2]).toBe(canonical);
    expect(stored.configurationOwner).toBe(user.uid);
  } finally {
    view.unmount();
    await act(async () => changeLanguage("pt-BR"));
  }
});
