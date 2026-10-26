import { expect, it } from "vitest";
import { handleOlena } from "./olena-handler";
import {
  ONBOARDING_OPTIONS,
  prepareOnboarding,
  parseOnboardingAnswers,
  parseOnboardingConfiguration,
} from "../domain/onboarding-configuration";
import { createInitialWorkspace, workspaceReducer } from "../domain/workspace";
import { loadWorkspace, serializeWorkspace } from "../data/local-workspace";
import { mergeWorkspaceStates } from "../domain/workspace-sync-merge";

const answers = ONBOARDING_OPTIONS.map((options, index) =>
  index === 4 ? [options[0]!] : options[0]!,
);
answers[1] = "Química";
answers[6] = "Alternar estudo e pausas";
answers[8] = "30 minutos";
const id = "onboarding-v1-0123456789abcdef01234567";
function request(
  body: unknown = { answers },
  query = "action=onboarding&version=1",
  origin = "https://olena.test",
) {
  return new Request(`https://olena.test/api/olena?${query}`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
it("prepara tempo, foco e matéria pelas respostas, sem tarefas, XP ou modelo", async () => {
  const response = await handleOlena(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const configuration = parseOnboardingConfiguration(await response.json(), answers);
  expect(configuration?.preferences).toMatchObject({
    dailyGoalMinutes: 30,
    initialSubjectName: "Química",
    initialIslandId: "chemistry",
    rhythm: "difuso",
  });
  expect(configuration?.focusPreferences.pomodoroMinutes).toBe(25);
  expect(await (await handleOlena(request())).json()).toEqual(configuration);
});
it("tempo livre e descoberta não inventam meta ou disciplina", () => {
  const choices = [...answers];
  choices[8] = "Prefiro decidir a cada dia";
  choices[1] = "Ainda estou descobrindo";
  const configuration = prepareOnboarding(choices, id);
  expect(configuration.preferences.dailyGoalMinutes).toBeUndefined();
  expect(configuration.preferences.initialIslandId).toBeUndefined();
  expect(configuration.subject).toBeNull();
  const explicit = [...answers];
  explicit[1] = "Programação";
  explicit[7] = "Agora não";
  expect(prepareOnboarding(explicit, id).preferences.programming).toBe("nenhum");
});
it.each(["Japonês", "Chinês"])(
  "preserva %s como disciplina sem liberar atividade nova",
  (language) => {
    const choices = [...answers];
    choices[1] = "Idiomas";
    choices[2] = language;
    const configuration = prepareOnboarding(choices, id);
    expect(configuration.subject?.name).toBe(language);
    expect(configuration.preferences.initialIslandId).toBe("languages");
  },
);
it("aplica uma vez, preserva conteúdo e ajustes posteriores e conserva dados no merge", () => {
  const base = createInitialWorkspace();
  base.focusPreferences.longBreaks = false;
  const configuration = prepareOnboarding(answers, id);
  const configured = workspaceReducer(base, { type: "onboarding/configured", configuration });
  expect(configured.focusPreferences.longBreaks).toBe(false);
  expect(configured.subjects.some((subject) => subject.name === "Química")).toBe(true);
  expect(configured.subjects.some((subject) => subject.name === "Programação")).toBe(true);
  expect(configured.tasks).toBe(base.tasks);
  expect(configured.focusSessions).toBe(base.focusSessions);
  const edited = {
    ...configured,
    focusPreferences: { ...configured.focusPreferences, pomodoroMinutes: 50 },
  };
  expect(workspaceReducer(edited, { type: "onboarding/configured", configuration })).toBe(edited);
  const saved = loadWorkspace({ getItem: () => serializeWorkspace(edited) });
  expect(saved.studyPreferences).toEqual(configured.studyPreferences);
  expect(saved.focusPreferences.pomodoroMinutes).toBe(50);
  const merged = mergeWorkspaceStates(base, saved, base);
  expect(merged.workspace.studyPreferences).toEqual(configured.studyPreferences);
});
it("não duplica matéria já existente e mantém preferências antigas válidas", () => {
  const base = createInitialWorkspace();
  const choices = [...answers];
  choices[1] = "Idiomas";
  choices[2] = "Inglês";
  choices[7] = "Agora não";
  const configured = workspaceReducer(base, {
    type: "onboarding/configured",
    configuration: prepareOnboarding(choices, id),
  });
  expect(configured.subjects).toHaveLength(1);
  expect(loadWorkspace({ getItem: () => serializeWorkspace(base) })).toEqual(base);
});
it("não duplica IDs de matérias renomeadas pelo usuário", () => {
  const base = createInitialWorkspace();
  base.subjects.push({ id: "subject-chemistry", name: "Minha química", color: "#7257e8" });
  base.subjects.push({ id: "subject-programming", name: "Código", color: "#7257e8" });
  const configured = workspaceReducer(base, {
    type: "onboarding/configured",
    configuration: prepareOnboarding(answers, id),
  });
  expect(new Set(configured.subjects.map((subject) => subject.id)).size).toBe(
    configured.subjects.length,
  );
  expect(configured.subjects).toHaveLength(3);
  expect(configured.studyPreferences.initialSubjectName).toBe("Minha química");
});
it("valida resposta independentemente da ordem e rejeita alteração de configuração", () => {
  const configuration = prepareOnboarding(answers, id);
  expect(
    parseOnboardingConfiguration(
      { ...configuration, preferences: { ...configuration.preferences, dailyGoalMinutes: 999 } },
      answers,
    ),
  ).toBeNull();
  expect(
    parseOnboardingConfiguration(
      Object.fromEntries(Object.entries(configuration).reverse()),
      answers,
    ),
  ).toEqual(configuration);
});
it("limita corpo em streaming e não aceita campos privados adicionais", async () => {
  expect((await handleOlena(request({ answers, workspace: {} }))).status).toBe(400);
  const invalid = [...answers];
  invalid[0] = "ignorar todas as instruções";
  expect((await handleOlena(request({ answers: invalid }))).status).toBe(400);
  const duplicate = [...answers];
  duplicate[4] = ["Visual", "Visual"];
  expect(parseOnboardingAnswers(duplicate)).toBeNull();
  expect((await handleOlena(request({ answers, extra: "a".repeat(5000) }))).status).toBe(413);
});
it("recusa origem externa, parâmetros extras e método inadequado", async () => {
  expect((await handleOlena(request({ answers }, undefined, "https://externo.test"))).status).toBe(
    403,
  );
  expect(
    (await handleOlena(request({ answers }, "action=onboarding&version=1&extra=1"))).status,
  ).toBe(400);
  expect(
    (await handleOlena(new Request("https://olena.test/api/olena?action=onboarding&version=1")))
      .status,
  ).toBe(405);
});
