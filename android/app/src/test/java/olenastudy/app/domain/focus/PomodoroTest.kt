package olenastudy.app.domain.focus

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PomodoroTest {
    private val config = PomodoroConfig()

    @Test
    fun `foco termina em pausa curta e conta um foco`() {
        val step = Pomodoro.nextStep(FocusPhase.Focus, 0, config)
        assertEquals(PomodoroStep(FocusPhase.ShortBreak, 5, 1), step)
    }

    @Test
    fun `o quarto foco leva a pausa longa`() {
        assertEquals(FocusPhase.ShortBreak, Pomodoro.nextStep(FocusPhase.Focus, 1, config).phase)
        assertEquals(FocusPhase.ShortBreak, Pomodoro.nextStep(FocusPhase.Focus, 2, config).phase)
        val fourth = Pomodoro.nextStep(FocusPhase.Focus, 3, config)
        assertEquals(PomodoroStep(FocusPhase.LongBreak, 15, 4), fourth)
    }

    @Test
    fun `sem pausas longas toda pausa e curta`() {
        val noLong = config.copy(longBreaks = false)
        assertEquals(FocusPhase.ShortBreak, Pomodoro.nextStep(FocusPhase.Focus, 3, noLong).phase)
    }

    @Test
    fun `depois de qualquer pausa volta ao foco sem mudar a contagem`() {
        assertEquals(PomodoroStep(FocusPhase.Focus, 25, 4), Pomodoro.nextStep(FocusPhase.LongBreak, 4, config))
        assertEquals(PomodoroStep(FocusPhase.Focus, 50, 2), Pomodoro.nextStep(FocusPhase.ShortBreak, 2, config.copy(focusMinutes = 50)))
    }

    @Test
    fun `iniciar fixa o prazo e o tempo restante cai com o relogio`() {
        val started = Pomodoro.start(Pomodoro.initial(), nowMs = 1_000)
        assertTrue(started.running)
        assertEquals(1_000 + 25 * 60_000L, started.deadlineMs)
        assertEquals(25 * 60_000L - 10_000, started.remainingAt(11_000))
    }

    @Test
    fun `pausar guarda o que sobrou e retomar refaz o prazo`() {
        val started = Pomodoro.start(Pomodoro.initial(), nowMs = 0)
        val paused = Pomodoro.pause(started, nowMs = 60_000)
        assertFalse(paused.running)
        assertEquals(24 * 60_000L, paused.remainingMs)
        // O tempo parado não conta: ao retomar, o prazo parte de agora.
        val resumed = Pomodoro.start(paused, nowMs = 600_000)
        assertEquals(600_000 + 24 * 60_000L, resumed.deadlineMs)
    }

    @Test
    fun `prazo vencido e detectado e o restante nunca fica negativo`() {
        val started = Pomodoro.start(Pomodoro.initial(), nowMs = 0)
        val end = 25 * 60_000L
        assertFalse(started.isExpiredAt(end - 1))
        assertTrue(started.isExpiredAt(end))
        assertEquals(0L, started.remainingAt(end + 99_000))
    }

    @Test
    fun `avancar entra na proxima fase pausada com a duracao certa`() {
        val running = Pomodoro.start(Pomodoro.initial(), nowMs = 0)
        val next = Pomodoro.advance(running, config)
        assertEquals(FocusPhase.ShortBreak, next.phase)
        assertEquals(1, next.completed)
        assertFalse(next.running)
        assertEquals(5 * 60_000L, next.remainingMs)
    }

    @Test
    fun `reiniciar a fase mantem os focos concluidos`() {
        val state = Pomodoro.start(Pomodoro.initial().copy(completed = 2), nowMs = 0)
        val restarted = Pomodoro.restartPhase(Pomodoro.pause(state, 5_000))
        assertEquals(2, restarted.completed)
        assertEquals(25 * 60_000L, restarted.remainingMs)
    }

    @Test
    fun `duracao valida vai de 1 a 5999 minutos`() {
        assertFalse(Pomodoro.isValidMinutes(0))
        assertTrue(Pomodoro.isValidMinutes(1))
        assertTrue(Pomodoro.isValidMinutes(5999))
        assertFalse(Pomodoro.isValidMinutes(6000))
    }
}
