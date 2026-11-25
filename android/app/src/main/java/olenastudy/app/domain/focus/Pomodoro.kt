package olenastudy.app.domain.focus

/** Fases do Pomodoro, as mesmas do site (src/views/focus-view.tsx). */
enum class FocusPhase { Focus, ShortBreak, LongBreak }

/** Preferências do aluno. Padrões do site: 25 min de foco, pausa curta 5, pausa longa 15 a cada 4. */
data class PomodoroConfig(
    val focusMinutes: Int = 25,
    val shortBreakMinutes: Int = 5,
    val longBreakMinutes: Int = 15,
    val longBreaks: Boolean = true,
)

/** Próxima etapa depois de uma fase terminar. `completed` conta só focos concluídos. */
data class PomodoroStep(val phase: FocusPhase, val durationMinutes: Int, val completed: Int)

/**
 * Estado do relógio. Guarda o PRAZO (`deadlineMs`, hora do relógio) em vez de um contador: assim
 * o tempo certo sobrevive a o app ser fechado ou o processo morrer. Pausado guarda `remainingMs`.
 */
data class PomodoroState(
    val phase: FocusPhase = FocusPhase.Focus,
    val completed: Int = 0,
    val durationMinutes: Int = 25,
    val running: Boolean = false,
    val deadlineMs: Long? = null,
    val remainingMs: Long = 25 * 60_000L,
) {
    fun remainingAt(nowMs: Long): Long =
        if (running && deadlineMs != null) (deadlineMs - nowMs).coerceIn(0, durationMinutes * 60_000L) else remainingMs

    fun isExpiredAt(nowMs: Long): Boolean = running && deadlineMs != null && nowMs >= deadlineMs
}

object Pomodoro {
    const val MAX_MINUTES = 5999

    /** Mesma regra de `nextPomodoroStep` do site: a cada 4 focos concluídos, a pausa é longa. */
    fun nextStep(phase: FocusPhase, completed: Int, config: PomodoroConfig): PomodoroStep =
        if (phase == FocusPhase.Focus) {
            val next = completed + 1
            val long = config.longBreaks && next % 4 == 0
            PomodoroStep(
                phase = if (long) FocusPhase.LongBreak else FocusPhase.ShortBreak,
                durationMinutes = if (long) config.longBreakMinutes else config.shortBreakMinutes,
                completed = next,
            )
        } else {
            PomodoroStep(FocusPhase.Focus, config.focusMinutes, completed)
        }

    fun initial(config: PomodoroConfig = PomodoroConfig()) =
        PomodoroState(durationMinutes = config.focusMinutes, remainingMs = config.focusMinutes * 60_000L)

    fun start(state: PomodoroState, nowMs: Long): PomodoroState =
        if (state.running) state else state.copy(running = true, deadlineMs = nowMs + state.remainingMs)

    fun pause(state: PomodoroState, nowMs: Long): PomodoroState =
        if (!state.running) state else state.copy(running = false, deadlineMs = null, remainingMs = state.remainingAt(nowMs))

    /** Termina a fase atual (por prazo vencido ou por "pular") e entra na próxima, pausada. */
    fun advance(state: PomodoroState, config: PomodoroConfig): PomodoroState {
        val step = nextStep(state.phase, state.completed, config)
        return PomodoroState(
            phase = step.phase,
            completed = step.completed,
            durationMinutes = step.durationMinutes,
            running = false,
            deadlineMs = null,
            remainingMs = step.durationMinutes * 60_000L,
        )
    }

    /** Volta a fase atual ao começo, mantendo quantos focos já foram concluídos. */
    fun restartPhase(state: PomodoroState): PomodoroState =
        state.copy(running = false, deadlineMs = null, remainingMs = state.durationMinutes * 60_000L)

    /** Aceita só durações inteiras de 1 a 5999 minutos, como `isPomodoroDuration` do site. */
    fun isValidMinutes(value: Int): Boolean = value in 1..MAX_MINUTES
}
