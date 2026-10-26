import { afterEach, expect, it, vi } from "vitest";
import { ONBOARDING_OPTIONS, prepareOnboarding } from "../domain/onboarding-configuration";
import {
  requestOnboardingConfiguration,
  readStoredOnboardingConfiguration,
  readPendingOnboardingConfiguration,
} from "./onboarding-client";
import { readPendingGoogleAnswers } from "../views/google-login";
const answers = ONBOARDING_OPTIONS.map((options, index) =>
  index === 4 ? [options[0]!] : options[0]!,
);
const configuration = prepareOnboarding(answers, "onboarding-v1-0123456789abcdef01234567");
afterEach(() => vi.unstubAllGlobals());
it("aplica configuração pendente somente ao dono e nunca repete uma configuração concluída", () => {
  const record = {
    answers,
    configuration,
    completed: true,
    configurationPending: true,
    configurationOwner: "user-1",
  };
  expect(readPendingOnboardingConfiguration(JSON.stringify(record), "user-1")).toEqual(
    configuration,
  );
  expect(readPendingOnboardingConfiguration(JSON.stringify(record), "user-2")).toBeNull();
  expect(readPendingOnboardingConfiguration(JSON.stringify(record), "guest")).toBeNull();
  expect(
    readPendingOnboardingConfiguration(
      JSON.stringify({ ...record, configurationPending: false }),
      "user-1",
    ),
  ).toBeNull();
});
it("envia somente as respostas à API da mesma origem e conserva cancelamento", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json(configuration));
  vi.stubGlobal("fetch", fetcher);
  const controller = new AbortController();
  expect(await requestOnboardingConfiguration(answers, controller.signal)).toEqual(configuration);
  const [url, options] = fetcher.mock.calls[0]!;
  expect(url).toBe("/api/olena?action=onboarding&version=1");
  expect(options.signal).toBe(controller.signal);
  expect(JSON.parse(options.body)).toEqual({ answers });
});
it("não substitui indisponibilidade da API por configuração apresentada como resposta real", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
  await expect(
    requestOnboardingConfiguration(answers, new AbortController().signal),
  ).rejects.toThrow("unavailable");
});
it("rejeita resposta inconsistente com o onboarding", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        ...configuration,
        preferences: { ...configuration.preferences, dailyGoalMinutes: 999 },
      }),
    ),
  );
  await expect(
    requestOnboardingConfiguration(answers, new AbortController().signal),
  ).rejects.toThrow("invalid");
});
it("recupera configuração e respostas do redirecionamento sem aceitar registro incompleto", () => {
  const serialized = JSON.stringify({ answers, configuration, completed: true });
  sessionStorage.setItem("helena.pending-google-answers", serialized);
  expect(readPendingGoogleAnswers()).toEqual(answers);
  expect(readStoredOnboardingConfiguration(serialized)).toEqual(configuration);
  expect(
    readStoredOnboardingConfiguration(JSON.stringify({ answers: [], configuration })),
  ).toBeNull();
  expect(
    readStoredOnboardingConfiguration(JSON.stringify({ answers, completed: true })),
  ).toBeNull();
  sessionStorage.removeItem("helena.pending-google-answers");
});
