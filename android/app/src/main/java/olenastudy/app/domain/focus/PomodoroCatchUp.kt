package olenastudy.app.domain.focus

data class PomodoroCatchUp(val state: PomodoroState, val records: List<FocusRecord>)

/** Com a tela ativa, segue os prazos das fases como o laço de 250 ms da web. */
fun catchUpPomodoro(state: PomodoroState, config: PomodoroConfig, nowMs: Long): PomodoroCatchUp {
    if (!state.running || state.deadlineMs == null || !state.isExpiredAt(nowMs)) return PomodoroCatchUp(state, emptyList())
    var current = state
    val records = mutableListOf<FocusRecord>()
    while (current.isExpiredAt(nowMs)) {
        val boundary = current.deadlineMs ?: break
        if (current.phase == FocusPhase.Focus) records += FocusRecord(boundary, current.durationMinutes, "pomodoro")
        current = Pomodoro.start(Pomodoro.advance(current, config), boundary)
    }
    return PomodoroCatchUp(current, records)
}
