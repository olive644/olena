import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MathArcade } from "./math-arcade";
import { handleOlena } from "../backend/olena-handler";
import { mathLearning } from "../data/math-learning";
import { updateAccessibility } from "../data/accessibility-preferences";
import { ACCOUNT_OWNER_KEY, claimDeviceForAccount } from "../data/personal-data";

beforeEach(() => {
  localStorage.removeItem(ACCOUNT_OWNER_KEY);
  vi.useFakeTimers();
  localStorage.removeItem("helena.mathLearning.v1");
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
  const expression = screen.getByRole("heading").getAttribute("aria-label")!;
  const values = expression.match(/\d+/g)!.map(Number);
  return expression.includes("−")
    ? values[0]! - values[1]!
    : expression.includes("×")
      ? values[0]! * values[1]!
      : values[0]! + values[1]!;
}

it("uses the API, advances topics, scores once and retains mastery on retry", async () => {
  updateAccessibility({ reduceMotion: true });
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
  expect(screen.getByText("Subtração")).toBeTruthy();
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
it("overlaps feedback with API latency and does not flash a loading overlay between questions", async () => {
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  render(<MathArcade onBack={() => {}} />);
  await begin();
  const initial = screen.getByRole("heading").getAttribute("aria-label");
  let release: (() => void) | undefined;
  vi.mocked(fetch).mockImplementationOnce(async (_url, init) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return handleOlena(new Request("http://localhost/api/olena?action=math&version=1", init));
  });
  await click("Resposta " + correctAnswer());
  expect(document.querySelector(".math-api-loading")).toBeNull();
  expect(document.querySelector("main")?.getAttribute("aria-busy")).toBe("true");
  await tick(800);
  await act(async () => {
    release!();
  });
  await tick(1);
  expect(screen.getByRole("heading").getAttribute("aria-label")).not.toBe(initial);
  expect(mathLearning("foundations").correct).toBe(1);
  expect(document.querySelector("main")?.getAttribute("aria-busy")).toBe("false");
});
it("treats an unanswered deadline separately, deducts four extra seconds and does not mark a fake choice", async () => {
  vi.spyOn(performance, "now").mockImplementation(() => Date.now());
  localStorage.setItem("helena.profile.v1", JSON.stringify({ photoUrl: "/my-photo.png" }));
  render(<MathArcade onBack={() => {}} />);
  await begin();
  await tick(14100);
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
