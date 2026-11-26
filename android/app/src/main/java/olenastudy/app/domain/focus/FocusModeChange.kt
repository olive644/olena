package olenastudy.app.domain.focus

/** A web bloqueia as setas com o relógio correndo ou pelo menos um segundo já feito. */
fun canChangeFocusMode(pomodoro: PomodoroState, stopwatch: StopwatchState, nowMs: Long): Boolean =
    !pomodoro.running && !stopwatch.running &&
        stopwatch.elapsedAt(nowMs) < 1000 &&
        pomodoro.durationMinutes * 60_000L - pomodoro.remainingAt(nowMs) < 1000
