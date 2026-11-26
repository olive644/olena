package olenastudy.app.domain.focus

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FocusModeChangeTest {
    @Test fun `permite modos zerados e subsegundo pausado como a web`() {
        assertTrue(canChangeFocusMode(Pomodoro.initial(), StopwatchState(), 0))
        assertTrue(canChangeFocusMode(Pomodoro.initial(), StopwatchState(accumulatedMs = 999), 0))
    }

    @Test fun `pomodoro pausado com tempo feito bloqueia a troca`() {
        assertFalse(canChangeFocusMode(Pomodoro.initial().copy(remainingMs = 1499_000), StopwatchState(), 0))
    }

    @Test fun `bloqueia ambos os modos correndo e o cronometro pausado`() {
        assertFalse(canChangeFocusMode(Pomodoro.start(Pomodoro.initial(), 0), StopwatchState(), 0))
        assertFalse(canChangeFocusMode(Pomodoro.initial(), Stopwatch.start(StopwatchState(), 0), 0))
        assertFalse(canChangeFocusMode(Pomodoro.initial(), StopwatchState(accumulatedMs = 1000), 0))
    }
}
