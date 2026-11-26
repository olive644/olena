package olenastudy.app.domain.focus

import org.junit.Assert.*
import org.junit.Test

class PomodoroCatchUpTest {
    private val config = PomodoroConfig()

    @Test fun `vence foco e continua pausa no prazo exato sem perder atraso`() {
        val state = Pomodoro.start(Pomodoro.initial(), 0)
        val result = catchUpPomodoro(state, config, 1500_250)
        assertEquals(FocusPhase.ShortBreak, result.state.phase)
        assertTrue(result.state.running)
        assertEquals(299_750, result.state.remainingAt(1500_250))
        assertEquals(listOf(FocusRecord(1500_000, 25, "pomodoro")), result.records)
    }

    @Test fun `atraso de duas fases retorna ao foco e registra uma unica sessao`() {
        val result = catchUpPomodoro(Pomodoro.start(Pomodoro.initial(), 0), config, 1800_500)
        assertEquals(FocusPhase.Focus, result.state.phase)
        assertEquals(1, result.records.size)
        assertEquals(1499_500, result.state.remainingAt(1800_500))
    }

    @Test fun `quarto ciclo inicia pausa longa e estado pausado nao muda`() {
        val state = Pomodoro.start(Pomodoro.initial().copy(completed = 3), 0)
        val result = catchUpPomodoro(state, config, 1500_000)
        assertEquals(FocusPhase.LongBreak, result.state.phase)
        assertEquals(900_000, result.state.remainingAt(1500_000))
        val paused = Pomodoro.initial().copy(remainingMs = 1000)
        assertEquals(PomodoroCatchUp(paused, emptyList()), catchUpPomodoro(paused, config, 9999_000))
    }
}
