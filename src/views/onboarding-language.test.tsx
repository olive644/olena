import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import OnboardingView from "./onboarding-view";
import english from "../../public/locales/en-US.json";
import { changeLanguage, installUiCatalog } from "../i18n/runtime";
import { prepareOnboarding, type OnboardingAnswers } from "../domain/onboarding-configuration";
vi.mock("../data/onboarding-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../data/onboarding-client")>()),
  requestOnboardingConfiguration: vi.fn(async (answers: OnboardingAnswers) =>
    prepareOnboarding(answers, "onboarding-v1-0123456789abcdef01234567"),
  ),
}));

it.each([
  ["Japanese", "Japonês"],
  ["Chinese", "Chinês"],
])("English %s keeps canonical onboarding answers and preferences", async (language, canonical) => {
  installUiCatalog("en-US", english);
  await changeLanguage("en-US");
  const finish = vi.fn();
  const view = render(<OnboardingView onFinish={finish} />);
  try {
    const choices = [
      "High school",
      "Programming",
      language,
      "Build a routine",
      "Listening and talking",
      "Big picture first",
      "Alternate study and breaks",
      "Python and JavaScript",
      "15 minutes",
    ];
    for (const choice of choices) {
      fireEvent.click(screen.getByRole("button", { name: choice }));
      if (choice === "Listening and talking")
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    }
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Sign up" }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue as guest" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue as guest" }));
    expect(finish).toHaveBeenCalledWith(
      expect.objectContaining({
        preferences: {
          modalities: ["auditivo"],
          processing: "global",
          rhythm: "difuso",
          programming: "python-javascript",
        },
      }),
    );
    expect(JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "{}").answers[4]).toEqual([
      "Ouvindo e conversando",
    ]);
    expect(JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "{}").answers[2]).toBe(
      canonical,
    );
  } finally {
    view.unmount();
    await act(async () => changeLanguage("pt-BR"));
  }
});
