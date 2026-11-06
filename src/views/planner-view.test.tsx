import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PlannerView } from "./planner-view";
import { createInitialWorkspace, type WorkspaceState } from "../domain/workspace";
import { FOCUS_SESSION_KEY } from "../domain/focus-session";
import { SYNCED_STORAGE_EVENT } from "../data/synced-storage";

const today = new Date();
const key = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

function workspaceWithStudy(): WorkspaceState {
  const base = createInitialWorkspace();
  return {
    ...base,
    events: [
      {
        id: "study-1",
        title: "Revisar frações",
        subjectId: base.subjects[0]?.id ?? "math",
        date: key,
        time: "10:00",
        kind: "study",
        durationMinutes: 30,
      },
    ],
  };
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

it("avisa a sincronização ao iniciar um foco pela agenda, sem depender da tela de Foco", async () => {
  const published = vi.fn();
  window.addEventListener(SYNCED_STORAGE_EVENT, published);
  const navigate = vi.fn();
  render(
    <PlannerView workspace={workspaceWithStudy()} dispatch={() => {}} onNavigate={navigate} />,
  );
  const start = await screen.findByRole("button", { name: "Começar estudo Revisar frações" });
  // A gravação do fuso horário ao montar também avisa; só o clique interessa aqui.
  published.mockClear();
  fireEvent.click(start);
  expect(navigate).toHaveBeenCalledWith("focus");
  const saved = JSON.parse(localStorage.getItem(FOCUS_SESSION_KEY) ?? "null") as {
    agendaEventId?: string;
  } | null;
  expect(saved?.agendaEventId).toBe("study-1");
  // Sem o evento, a sessão ficava só no aparelho até a tela de Foco montar e gravar de novo.
  expect(published).toHaveBeenCalledTimes(1);
  window.removeEventListener(SYNCED_STORAGE_EVENT, published);
});
