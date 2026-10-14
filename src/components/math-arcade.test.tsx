import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MathArcade } from "./math-arcade";
import { handleOlena } from "../backend/olena-handler";
import { mathGameLearning as mathLearning } from "../data/math-game-learning";
import { challengeQuestion as bankQuestion } from "../data/math-challenge-bank";
import { emptyMathGame } from "../domain/math-game-progress";
import { updateAccessibility } from "../data/accessibility-preferences";
import { ACCOUNT_OWNER_KEY, claimDeviceForAccount } from "../data/personal-data";
import * as mathSound from "../data/math-sound";
import { MASTERY_KEY, upgradeMasteryProgress } from "../domain/math-mastery-progress";
import { upgradeChallengeProgress } from "../domain/math-challenge-progress";

beforeEach(() => {
  localStorage.removeItem(ACCOUNT_OWNER_KEY);
  vi.useFakeTimers();
  localStorage.removeItem("helena.mathLearning.v1");
  localStorage.removeItem("helena.mathLearning.v2");
  localStorage.removeItem("helena.mathGame.v3");
  localStorage.removeItem("helena.mathGame.v4");
  localStorage.removeItem("helena.room-xp.v1");
  localStorage.removeItem("helena.mathPlaceRewards.v1");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) =>
      handleOlena(new Request("http://localhost/api/olena?action=math&version=1", init)),
    ),
  );
});
afterEach(() => {
  localStorage.removeItem(ACCOUNT_OWNER_KEY);
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  updateAccessibility({ reduceMotion: false });
});
it("exits an active game when another account claims the device", async () => {
  claimDeviceForAccount(localStorage, "first-account");
  const back = vi.fn();
  render(<MathArcade onBack={back} />);
  await begin();
  act(() => {
    claimDeviceForAccount(localStorage, "second-account");
  });
  expect(back).toHaveBeenCalledOnce();
  expect(localStorage.getItem("helena.mathPlaceRewards.v1")).toBeNull();
});
it("cannot start a later place even when the arcade is opened directly", async () => {
  render(<MathArcade courseId="school" onBack={() => {}} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Vamos calcular!" }));
  });
  expect(screen.getByRole("alert").textContent).toContain("Complete o lugar anterior");
  expect(screen.queryAllByRole("button", { name: /^Resposta/ })).toHaveLength(0);
});
async function click(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}
async function tick(time: number) {
  await act(async () => {
    vi.advanceTimersByTime(time);
  });
}
async function begin() {
  await click("Vamos calcular!");
  await tick(1000);
  await tick(1000);
  await tick(1000);
}
function seedFinal(level: number) {
  const old = emptyMathGame();
  for (let i = 0; i <= level; i++) old.solved[i] = old.seen[i] = 1048575;
  old.mastered = (1 << (level + 1)) - 1;
  old.level = Math.min(5, level + 1);
  old.mastery = old.level === level ? 5 : 0;
  const p = upgradeMasteryProgress(upgradeChallengeProgress(old));
  p.confirmed = (1 << level) - 1;
  p.attempts = 4;
  p.finalSeen[level] = 266305;
  p.final = { level, slots: [0, 6, 12, 18, 1], answered: 15, correct: 15 };
  localStorage.setItem(MASTERY_KEY, JSON.stringify({ foundations: p }));
}
it("starts the reservation full only after all three countdown beats", async () => {
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  render(<MathArcade onBack={() => {}} />);
  await click("Vamos calcular!");
  await tick(1000);
  await tick(1000);
  expect(screen.queryByRole("progressbar")).toBeNull();
  await tick(1000);
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("60");
  expect(screen.getByRole("progressbar").getAttribute("aria-valuemax")).toBe("60");
  expect((document.querySelector(".math-reserve > span") as HTMLElement).style.width).toBe("100%");
  await tick(1000);
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("59");
});
it("records dated island activity once after an assessed answer", async () => {
  const onPractice = vi.fn();
  render(<MathArcade onBack={() => {}} onPractice={onPractice} />);
  await begin();
  await click("Resposta " + correctAnswer());
  expect(onPractice).toHaveBeenCalledOnce();
  expect(onPractice.mock.calls[0]?.[0]).toMatchObject({
    islandId: "mathematics:foundations",
    answers: 1,
    correct: 1,
    completedAt: new Date().toISOString(),
  });
  await tick(650);
  expect(onPractice).toHaveBeenCalledOnce();
});
it("shows the actual deadline when the round reserve is shorter than the question allowance", async () => {
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  render(<MathArcade onBack={() => {}} />);
  await begin();
  // Duas respostas corretas lentas deixam a reserva abaixo do próximo prazo.
  for (let i = 0; i < 2; i++) {
    await tick(20000);
    await click("Resposta " + correctAnswer());
    await tick(650);
  }
  const reserve = Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"));
  expect(reserve).toBeLessThan(28);
  const clock = screen.getByLabelText(/segundos restantes na rodada/);
  expect(Number(clock.getAttribute("aria-label")!.split(" ")[0])).toBeLessThanOrEqual(reserve + 1);
  const correct = mathLearning("foundations").correct;
  await tick((reserve + 1) * 1000);
  await tick(1);
  expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeTruthy();
  expect(screen.queryByText("Putz! Perdeu a vez!")).toBeNull();
  expect(mathLearning("foundations").correct).toBe(correct);
});
it("celebrates a mastered topic once, pauses the clock and continues with keyboard focus", async () => {
  seedFinal(0);
  const play = vi.fn();
  vi.spyOn(mathSound, "createMathSound").mockReturnValue({
    play,
    unlock: vi.fn(),
    dispose: vi.fn(),
  });
  const onPractice = vi.fn();
  render(<MathArcade onBack={() => {}} onPractice={onPractice} />);
  await begin();
  await click("Resposta " + correctAnswer());
  await tick(650);
  expect(screen.getByRole("heading", { name: "Parabéns, você se superou!" })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Continuar explorando" }));
  expect(play.mock.calls.filter(([cue]) => cue === "mastery")).toHaveLength(1);
  await tick(10000);
  expect(mathLearning("foundations")).toMatchObject({ level: 1, mastered: 1, correct: 1 });
  expect(onPractice).toHaveBeenCalledOnce();
  await click("Continuar explorando");
  expect(document.activeElement).toBe(screen.getAllByRole("button", { name: /^Resposta/ })[0]);
  expect(screen.getByText("Subtração")).toBeTruthy();
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("60");
});
it("settles the completed place once and recommends the real next place", async () => {
  seedFinal(5);
  const next = vi.fn();
  render(<MathArcade onBack={() => {}} onNextCourse={next} />);
  await begin();
  await click("Resposta " + correctAnswer());
  await tick(650);
  await tick(1);
  expect(screen.getByText(/Próxima parada: Oficina das Equações/)).toBeTruthy();
  await click("Ver minha conquista");
  await click("Explorar Oficina das Equações");
  expect(next).toHaveBeenCalledExactlyOnceWith("school");
  expect(mathLearning("foundations").mastered).toBe(63);
});
it("does not show or record XP for a zero-point round", async () => {
  render(<MathArcade onBack={() => {}} />);
  await begin();
  for (let index = 0; index < 3; index++) {
    const wrong = screen
      .getAllByRole("button", { name: /^Resposta/ })
      .find((item) => item.getAttribute("aria-label") !== "Resposta " + correctAnswer())!;
    await click(wrong.getAttribute("aria-label")!);
    await tick(1300);
  }
  await tick(2000);
  expect(screen.queryByText(/XP pela prática/)).toBeNull();
  expect(localStorage.getItem("helena.room-xp.v1")).toBeNull();
});
function correctAnswer() {
  const seed = Number(
    document.querySelector(".math-arcade-stage")?.getAttribute("data-question-seed"),
  );
  return seed > 288
    ? bankQuestion("foundations", Math.floor((seed - 289) / 24), 48 + ((seed - 289) % 24)).answer
    : bankQuestion("foundations", Math.floor((seed - 1) / 48), (seed - 1) % 48).answer;
}

it("uses the shared engine, scores once and retains progress on retry", async () => {
  updateAccessibility({ reduceMotion: true });
  render(<MathArcade onBack={() => {}} />);
  await begin();
  for (let index = 0; index < 4; index++) {
    await click("Resposta " + correctAnswer());
    await tick(650);
  }
  expect(mathLearning("foundations").level).toBe(0);
  expect(mathLearning("foundations").correct).toBe(4);
  expect(screen.getByText(/VOCÊ ESTÁ INSANO/)).toBeTruthy();
  for (let index = 0; index < 3; index++) {
    const wrong = screen
      .getAllByRole("button", { name: /^Resposta/ })
      .find((item) => item.getAttribute("aria-label") !== "Resposta " + correctAnswer())!;
    await click(wrong.getAttribute("aria-label")!);
    await tick(1300);
  }
  expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeTruthy();
  await tick(32);
  await tick(1);
  expect(screen.getByText(/XP pela prática de Matemática/)).toBeTruthy();
  const savedXp = JSON.parse(localStorage.getItem("helena.room-xp.v1")!).total;
  expect(savedXp).toBeGreaterThan(0);
  await tick(1);
  expect(JSON.parse(localStorage.getItem("helena.room-xp.v1")!).total).toBe(savedXp);
  await click("Tentar de novo");
  await tick(1000);
  await tick(1000);
  await tick(1000);
  expect(screen.getByText("Adição")).toBeTruthy();
  expect(screen.getByLabelText("3 chances restantes")).toBeTruthy();
});

it("rejects double answers and animates leaving before releasing scroll", async () => {
  const back = vi.fn();
  const view = render(<MathArcade onBack={back} />);
  await begin();
  const answer = screen.getByRole("button", { name: "Resposta " + correctAnswer() });
  await act(async () => {
    fireEvent.click(answer);
    fireEvent.click(answer);
  });
  expect(mathLearning("foundations").correct).toBe(1);
  await tick(650);
  await click("Voltar às ilhas");
  expect(back).not.toHaveBeenCalled();
  await tick(650);
  expect(back).toHaveBeenCalledOnce();
  view.unmount();
  expect(document.body.style.overflow).not.toBe("hidden");
});

it("starts and scores even when the server is unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<MathArcade onBack={() => {}} />);
  await begin();
  await click("Resposta " + correctAnswer());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(document.querySelector('.math-answer-button[data-feedback="correct"]')).not.toBeNull();
  expect(mathLearning("foundations").correct).toBe(1);
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  { correct: true, duration: 650 },
  { correct: false, duration: 1300 },
])(
  "immediately shows feedback for $duration ms when the server never responds ($correct)",
  async ({ correct, duration }) => {
    vi.spyOn(performance, "now").mockImplementation(() => Date.now());
    const play = vi.fn();
    vi.spyOn(mathSound, "createMathSound").mockReturnValue({
      play,
      unlock: vi.fn(),
      dispose: vi.fn(),
    });
    render(<MathArcade onBack={() => {}} />);
    await begin();
    play.mockClear();
    const answer = correctAnswer();
    const choice = correct
      ? answer
      : Number(
          screen
            .getAllByRole("button", { name: /^Resposta/ })
            .find((item) => item.getAttribute("aria-label") !== "Resposta " + answer)!
            .getAttribute("aria-label")!
            .replace("Resposta ", ""),
        );
    const button = screen.getByRole("button", { name: "Resposta " + choice });
    vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>(() => {}));
    await click("Resposta " + choice);
    expect(document.querySelector(".math-api-loading")).toBeNull();
    expect(document.querySelector("main")?.getAttribute("aria-busy")).toBe("false");
    expect(button.getAttribute("data-feedback")).toBe(correct ? "correct" : "wrong");
    expect(play).toHaveBeenCalledExactlyOnceWith(correct ? "correct" : "wrong");
    const reserve = screen.getByRole("progressbar").getAttribute("aria-valuenow");
    await act(async () => {
      fireEvent.click(button);
    });
    await tick(duration - 1);
    expect(document.querySelector(".math-answer-reaction")).not.toBeNull();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(reserve);
    expect(mathLearning("foundations").correct).toBe(Number(correct));
    expect(fetch).not.toHaveBeenCalled();
    await tick(1);
    expect(document.querySelector(".math-answer-reaction")).toBeNull();
    expect(document.querySelector("main")?.getAttribute("aria-busy")).toBe("false");
  },
);

it("does not let a server error interrupt or duplicate a correctly assessed answer", async () => {
  const play = vi.fn();
  vi.spyOn(mathSound, "createMathSound").mockReturnValue({
    play,
    unlock: vi.fn(),
    dispose: vi.fn(),
  });
  render(<MathArcade onBack={() => {}} />);
  await begin();
  play.mockClear();
  vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
  await click("Resposta " + correctAnswer());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(document.querySelector('.math-answer-button[data-feedback="correct"]')).not.toBeNull();
  expect(mathLearning("foundations").correct).toBe(1);
  expect(play).toHaveBeenCalledExactlyOnceWith("correct");
});
it("shows a timeout immediately without waiting for the server", async () => {
  const play = vi.fn();
  vi.spyOn(mathSound, "createMathSound").mockReturnValue({
    play,
    unlock: vi.fn(),
    dispose: vi.fn(),
  });
  render(<MathArcade onBack={() => {}} />);
  await begin();
  play.mockClear();
  vi.mocked(fetch).mockImplementationOnce(() => new Promise<Response>(() => {}));
  await tick(29100);
  await tick(1);
  expect(play).toHaveBeenCalledExactlyOnceWith("timeout");
  const reserve = screen.getByRole("progressbar").getAttribute("aria-valuenow");
  await tick(1299);
  expect(screen.getByText("Putz! Perdeu a vez!")).toBeTruthy();
  expect(document.querySelector(".math-hearts .is-breaking")).not.toBeNull();
  expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(reserve);
  expect(fetch).not.toHaveBeenCalled();
  await tick(1);
  expect(screen.queryByText("Putz! Perdeu a vez!")).toBeNull();
  expect(document.querySelector(".math-hearts .is-breaking")).toBeNull();
  expect(screen.getByLabelText("2 chances restantes")).toBeTruthy();
});
it("treats an unanswered deadline separately, deducts four extra seconds and does not mark a fake choice", async () => {
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  localStorage.setItem("helena.profile.v1", JSON.stringify({ photoUrl: "/my-photo.png" }));
  render(<MathArcade onBack={() => {}} />);
  await begin();
  await tick(29100);
  await tick(1);
  expect(screen.getByText("Putz! Perdeu a vez!")).toBeTruthy();
  expect(screen.getByLabelText("2 chances restantes")).toBeTruthy();
  expect(Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"))).toBeLessThanOrEqual(
    42,
  );
  expect(document.querySelector('.math-answer-button[data-feedback="wrong"]')).toBeNull();
  expect(document.querySelector(".math-user-avatar img")?.getAttribute("src")).toBe(
    "/my-photo.png",
  );
  expect(document.querySelector(".math-user-avatar svg")).toBeNull();
  localStorage.removeItem("helena.profile.v1");
});
