import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MathArcade } from "./math-arcade";
import { handleOlena } from "../backend/olena-handler";
import { mathLearning } from "../data/math-learning";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.removeItem("helena.mathLearning.v1");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) =>
      handleOlena(new Request("http://localhost/api/olena?action=math&version=1", init)),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
function correctAnswer() {
  const expression = screen.getByRole("heading").getAttribute("aria-label")!;
  const values = expression.match(/\d+/g)!.map(Number);
  return expression.includes("−")
    ? values[0]! - values[1]!
    : expression.includes("×")
      ? values[0]! * values[1]!
      : values[0]! + values[1]!;
}

it("uses the API, advances topics, scores once and retains mastery on retry", async () => {
  render(<MathArcade onBack={() => {}} />);
  await begin();
  for (let index = 0; index < 4; index++) {
    await click("Resposta " + correctAnswer());
    await tick(650);
  }
  expect(mathLearning("foundations").level).toBe(2);
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
  await click("Tentar de novo");
  await tick(1000);
  await tick(1000);
  await tick(1000);
  expect(screen.getByText("Multiplicação")).toBeTruthy();
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

it("shows a recoverable API error instead of inventing questions", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  render(<MathArcade onBack={() => {}} />);
  await click("Vamos calcular!");
  expect(screen.getByRole("alert").textContent).toContain("offline");
  expect(screen.queryAllByRole("button", { name: /^Resposta/ })).toHaveLength(0);
});
