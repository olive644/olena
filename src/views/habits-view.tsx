import { useState, type Dispatch, type FormEvent } from "react";
import { PageHeader } from "../components/app-navigation";
import { PaperCheckIcon } from "../components/paper-check-icon";
import { PaperActionIcon } from "../components/paper-action-icon";
import { toDateKey, type WorkspaceAction, type WorkspaceState } from "../domain/workspace";

type HabitsViewProps = {
  workspace: WorkspaceState;
  dispatch: Dispatch<WorkspaceAction>;
};

export function HabitsView({ workspace, dispatch }: HabitsViewProps) {
  const [title, setTitle] = useState("");
  const today = toDateKey(new Date());
  const completed = workspace.habits.filter((habit) => habit.completedDates.includes(today)).length;

  function addHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    dispatch({ type: "habit/added", title: value });
    setTitle("");
  }

  return (
    <main className="main-content" id="main-content">
      <PageHeader />
      <header className="view-heading">
        <span className="section-label">Hábitos</span>
        <h1>Consistência antes de intensidade.</h1>
        <p>Marque pequenas ações que você deseja repetir todos os dias.</p>
      </header>

      <div className="habits-layout">
        <section className="module-panel habit-form-panel" aria-labelledby="new-habit-title">
          <span className="section-label">Novo hábito</span>
          <h2 id="new-habit-title">O que você quer praticar?</h2>
          <form className="compact-form" onSubmit={addHabit}>
            <label className="field">
              <span>Nome do hábito</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: 10 minutos de vocabulário"
                required
              />
            </label>
            <button className="primary-button" type="submit">
              <PaperActionIcon name="plus" /> <span>Adicionar hábito</span>
            </button>
          </form>
        </section>

        <section className="module-panel" aria-labelledby="habit-list-title">
          <div className="module-heading">
            <div>
              <span className="section-label">Hoje</span>
              <h2 id="habit-list-title">Sua sequência</h2>
            </div>
            <strong className="habit-score">
              {completed}/{workspace.habits.length}
            </strong>
          </div>
          {workspace.habits.length === 0 ? (
            <div className="empty-state">
              <p>Crie seu primeiro hábito para começar a acompanhar a rotina.</p>
            </div>
          ) : (
            <ul className="habit-list">
              {workspace.habits.map((habit) => {
                const isComplete = habit.completedDates.includes(today);
                return (
                  <li className={isComplete ? "is-complete" : undefined} key={habit.id}>
                    <button
                      type="button"
                      aria-pressed={isComplete}
                      onClick={() => dispatch({ type: "habit/toggled", id: habit.id, date: today })}
                    >
                      <span className="habit-check">
                        <PaperCheckIcon />
                      </span>
                      <span>
                        <strong>{habit.title}</strong>
                        <small>Todos os dias</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
