import { expect, it, vi } from "vitest";
import { createProgressiveProvider, createOlenaStudent } from "./olena-student";
import type { HelenaRequest } from "../ai/helena-contract";
const request: HelenaRequest = {
  version: 1,
  capability: "tutor",
  prompt: "Explique 2 + 2",
  sources: [],
  privacy: { consent: true, retention: "none" },
};
it("modelo aprovado assume sem chamar professor externo", async () => {
  const teacher = { generate: vi.fn() };
  const student = { generate: vi.fn().mockResolvedValue({ answer: "2 + 2 = 4", suggestions: [] }) };
  await expect(
    createProgressiveProvider(teacher, student, ["tutor"]).generate(request),
  ).resolves.toMatchObject({ answer: "2 + 2 = 4" });
  expect(teacher.generate).not.toHaveBeenCalled();
});
it("modelo sem avaliação não assume e candidato inválido volta ao professor", async () => {
  const teacher = {
    generate: vi.fn().mockResolvedValue({ answer: "Resposta do professor", suggestions: [] }),
  };
  const student = { generate: vi.fn().mockResolvedValue({ answer: "", suggestions: [] }) };
  await createProgressiveProvider(teacher, student, []).generate(request);
  expect(student.generate).not.toHaveBeenCalled();
  await createProgressiveProvider(teacher, student, ["tutor"]).generate(request);
  expect(teacher.generate).toHaveBeenCalledTimes(2);
});
it("falha no candidato usa professor uma única vez", async () => {
  const teacher = { generate: vi.fn().mockResolvedValue({ answer: "Professor", suggestions: [] }) };
  const student = { generate: vi.fn().mockRejectedValue(new Error("offline")) };
  await createProgressiveProvider(teacher, student, ["tutor"]).generate(request);
  expect(teacher.generate).toHaveBeenCalledTimes(1);
});
it("endpoint do modelo próprio é privado, usa limite e proíbe redirecionamento", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "4" } }] })));
  const student = createOlenaStudent(
    "https://student.example/v1/chat/completions",
    "olena-v1",
    "private",
    fetcher,
  );
  expect((await student.generate(request)).answer).toBe("4");
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    redirect: "error",
    headers: { Authorization: "Bearer private" },
  });
});
