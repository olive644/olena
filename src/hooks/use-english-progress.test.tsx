import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { useEnglishProgress } from "./use-english-progress";
import {
  ENGLISH_PROGRESS_KEY,
  parseEnglishLedger,
  serializeEnglishLedger,
} from "../domain/english-progress-ledger";
import { SYNCED_STORAGE_APPLIED_EVENT } from "../data/synced-storage";
import type { PracticeActivity } from "../domain/workspace";

beforeEach(() => localStorage.clear());

function activity(question: number): PracticeActivity {
  return {
    id: `english:arcade:run:${question}`,
    islandId: "english",
    islandName: "Inglês",
    completedAt: new Date(Date.UTC(2026, 10, 6, 12, 0, question)).toISOString(),
    answers: 1,
    correct: 1,
    englishAttempt: {
      curriculum: 4,
      area: "english",
      part: 0,
      mode: "practice",
      questions: [question],
      correctQuestions: [question],
    },
  };
}

const stored = () => parseEnglishLedger(localStorage.getItem(ENGLISH_PROGRESS_KEY));

it("grava o livro quando as atividades mostram avanço, para sincronizar com a conta", async () => {
  const { result } = renderHook(() => useEnglishProgress([activity(3), activity(5)]));
  expect(result.current.parts[0]!.solved.size).toBe(2);
  await waitFor(() => expect(stored().english?.[0]?.solved).toEqual([3, 5]));
});

it("sem atividades, o avanço guardado continua aparecendo nas ilhas", () => {
  localStorage.setItem(
    ENGLISH_PROGRESS_KEY,
    serializeEnglishLedger({
      english: [{ solved: [1, 2, 3], confirmed: false }],
    }),
  );
  const { result } = renderHook(() => useEnglishProgress([]));
  expect(result.current.parts[0]!.solved.size).toBe(3);
  expect(result.current.percent).toBeGreaterThanOrEqual(0);
});

it("o livro nunca encolhe: atividades que somem não apagam o que já foi gravado", async () => {
  const { rerender } = renderHook(({ list }) => useEnglishProgress(list), {
    initialProps: { list: [activity(3), activity(5)] },
  });
  await waitFor(() => expect(stored().english?.[0]?.solved).toEqual([3, 5]));
  rerender({ list: [] });
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(stored().english?.[0]?.solved).toEqual([3, 5]);
});

it("recebe o livro que a nuvem aplicou depois da abertura", async () => {
  const { result } = renderHook(() => useEnglishProgress([]));
  expect(result.current.parts[0]!.solved.size).toBe(0);
  act(() => {
    localStorage.setItem(
      ENGLISH_PROGRESS_KEY,
      serializeEnglishLedger({ english: [{ solved: [8, 9], confirmed: false }] }),
    );
    window.dispatchEvent(new Event(SYNCED_STORAGE_APPLIED_EVENT));
  });
  await waitFor(() => expect(result.current.parts[0]!.solved.size).toBe(2));
});
