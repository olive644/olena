import { afterEach, describe, expect, it, vi } from "vitest";
import { ESSAY_COMPETENCY_IDS } from "../ai/essay-output";
import { HelenaClientError } from "./helena-client";
import {
  buildEssayRequest,
  essayForOlena,
  estimateEssayCredits,
  requestEssayReview,
  EssayReviewError,
} from "./essay-olena-client";

const services = vi.hoisted(() => vi.fn());
const request = vi.hoisted(() => vi.fn());
vi.mock("./firebase-account", () => ({ getFirebaseAccountServices: services }));
vi.mock("./helena-client", async (original) => ({
  ...(await original<typeof import("./helena-client")>()),
  requestHelena: request,
}));

const essay = "A educação é um direito de todos. O governo deve ampliar o acesso ao ensino.";
const answer = JSON.stringify({
  competencies: ESSAY_COMPETENCY_IDS.map((id) => ({ id, level: "good", score: 120 })),
});
const signedIn = () =>
  services.mockResolvedValue({
    auth: { currentUser: { isAnonymous: false, getIdToken: async () => "token" } },
  });

afterEach(() => vi.clearAllMocks());

describe("pedido de comentários da redação", () => {
  it("monta o pedido com consentimento, sem guardar, e a redação limitada a 6.000 caracteres", () => {
    const body = buildEssayRequest("a".repeat(7_000), "Educação no Brasil");
    expect(body.capability).toBe("essay");
    expect(body.privacy).toEqual({ consent: true, retention: "none" });
    expect(body.sources).toHaveLength(2);
    expect(body.sources[0]!.content).toHaveLength(6_000);
    expect(body.sources[1]).toMatchObject({ title: "Tema", content: "Educação no Brasil" });
    expect(buildEssayRequest(essay).sources).toHaveLength(1);
    expect(essayForOlena("  texto  ")).toBe("texto");
  });

  it("estima os créditos acima de zero e crescendo com o texto", () => {
    expect(estimateEssayCredits(essay)).toBeGreaterThan(0);
    expect(estimateEssayCredits("a".repeat(6_000))).toBeGreaterThan(estimateEssayCredits(essay));
  });

  it("sem login não chama a Olena", async () => {
    services.mockResolvedValue({ auth: { currentUser: null } });
    await expect(requestEssayReview(essay)).rejects.toMatchObject({ kind: "signed-out" });
    services.mockResolvedValue({ auth: { currentUser: { isAnonymous: true } } });
    await expect(requestEssayReview(essay)).rejects.toMatchObject({ kind: "signed-out" });
    expect(request).not.toHaveBeenCalled();
  });

  it("valida a resposta de novo: níveis e notas da escala, sem comentários", async () => {
    signedIn();
    request.mockResolvedValue({ answer });
    const review = await requestEssayReview(essay, "Educação");
    expect(review.competencies).toHaveLength(5);
    expect(review.competencies[0]).toMatchObject({
      id: "C1",
      level: "good",
      score: 120,
      notes: [],
    });
    expect(request.mock.calls[0]![1]).toMatchObject({ token: "token" });
    // Servidor com a nota desligada: só o nível, e a tela aceita.
    request.mockResolvedValue({
      answer: JSON.stringify({
        competencies: ESSAY_COMPETENCY_IDS.map((id) => ({ id, level: "great" })),
      }),
    });
    const levels = await requestEssayReview(essay);
    expect(levels.competencies.every((item) => item.score === undefined)).toBe(true);
  });

  it("separa limite, formato e indisponibilidade", async () => {
    signedIn();
    request.mockRejectedValueOnce(new HelenaClientError("rate_limited", "Limite de hoje."));
    await expect(requestEssayReview(essay)).rejects.toMatchObject({
      kind: "limit",
      message: "Limite de hoje.",
    });
    request.mockResolvedValueOnce({ answer: "não sei" });
    await expect(requestEssayReview(essay)).rejects.toMatchObject({ kind: "format" });
    request.mockRejectedValueOnce(new Error("rede"));
    await expect(requestEssayReview(essay)).rejects.toBeInstanceOf(EssayReviewError);
    request.mockRejectedValueOnce(new Error("rede"));
    await expect(requestEssayReview(essay)).rejects.toMatchObject({ kind: "unavailable" });
  });
});
