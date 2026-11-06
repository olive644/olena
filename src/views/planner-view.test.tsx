import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PlannerView } from "./planner-view";
import { createInitialWorkspace, type WorkspaceState } from "../domain/workspace";
import { FOCUS_SESSION_KEY } from "../domain/focus-session";
import { SYNCED_STORAGE_EVENT } from "../data/synced-storage";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { zonedDateTime } from "../domain/agenda-calendar";

// A agenda conta o dia no fuso dela (São Paulo por padrão), não no do computador: no CI, em UTC,
// de madrugada, o dia local já é o seguinte.
function todayKey() {
  return zonedDateTime(Date.now(), agendaTimeZone()).date;
}

function workspaceWithStudy(): WorkspaceState {
  const base = createInitialWorkspace();
  return {
    ...base,
    events: [
      {
        id: "study-1",
        title: "Revisar frações",
        subjectId: base.subjects[0]?.id ?? "math",
        date: todayKey(),
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
