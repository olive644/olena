import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import OnboardingView from "./onboarding-view";
import english from "../../public/locales/en-US.json";
import { changeLanguage, installUiCatalog } from "../i18n/runtime";

it("English labels keep canonical onboarding answers and preferences", async () => {
  installUiCatalog("en-US", english);
  await changeLanguage("en-US");
  const finish = vi.fn();
  const view = render(<OnboardingView onFinish={finish} />);
  try {
    const choices = [
      "High school",
      "Programming",
      "English",
      "Build a routine",
      "Listening and talking",
      "Big picture first",
      "Alternate study and breaks",
      "Python and JavaScript",
      "15 minutes",
    ];
    for (const choice of choices) {
      fireEvent.click(
        screen.getByRole(choice === "Listening and talking" ? "checkbox" : "radio", {
          name: choice,
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue as guest" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue as guest" }));
    expect(finish).toHaveBeenCalledWith({
      preferences: {
        modalities: ["auditivo"],
        processing: "global",
        rhythm: "difuso",
        programming: "python-javascript",
      },
    });
    expect(JSON.parse(localStorage.getItem("helena.onboarding.v1") ?? "{}").answers[4]).toEqual([
      "Ouvindo e conversando",
    ]);
  } finally {
    view.unmount();
    await act(async () => changeLanguage("pt-BR"));
  }
});
