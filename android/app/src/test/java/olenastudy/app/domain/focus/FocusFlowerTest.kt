package olenastudy.app.domain.focus

import java.time.ZoneId
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Paridade com src/domain/focus-flower.ts e pomodoro-tomato.ts (execução em 25/11/2026). */
class FocusFlowerTest {
    private val zone = ZoneId.of("America/Sao_Paulo")
    private val now = Instant.parse("2026-11-25T15:00:00Z").toEpochMilli()

    private fun record(iso: String, minutes: Int, mode: String = "timer") =
        FocusRecord(Instant.parse(iso).toEpochMilli(), minutes, mode)

    private fun state(records: List<FocusRecord>, live: Double = 0.0) = FocusFlower.state(records, now, zone, live)

    @Test
    fun `sem historico a flor esta adormecida`() {
        assertEquals(FlowerState(0, false, true, 0.0), state(emptyList()))
    }

    @Test
    fun `30 minutos hoje deixam a flor na metade`() {
        assertEquals(FlowerState(30, true, false, 0.5), state(listOf(record("2026-11-25T13:00:00Z", 30))))
    }

    @Test
    fun `mais de 60 minutos limitam o progresso em 1`() {
        val s = state(listOf(record("2026-11-25T13:00:00Z", 40), record("2026-11-25T14:00:00Z", 30)))
        assertEquals(FlowerState(70, true, false, 1.0), s)
    }

    @Test
    fun `pomodoro nao cuida da flor`() {
        assertEquals(FlowerState(0, false, true, 0.0), state(listOf(record("2026-11-25T13:00:00Z", 25, "pomodoro"))))
    }

    @Test
    fun `sessao de ontem ha mais de um dia murcha a flor`() {
        assertEquals(FlowerState(0, true, true, 0.0), state(listOf(record("2026-11-23T13:00:00Z", 30))))
    }

    @Test
    fun `cronometro correndo evita murchar e soma ao progresso`() {
        assertEquals(FlowerState(0, true, false, 0.2), state(listOf(record("2026-11-23T13:00:00Z", 30)), live = 12.0))
    }

    @Test
    fun `sessao de ontem recente nao murcha mas nao conta hoje`() {
        assertEquals(FlowerState(0, true, true, 0.0), state(listOf(record("2026-11-24T14:59:00Z", 20))))
    }

    @Test
    fun `sessao no futuro e ignorada`() {
        assertEquals(FlowerState(0, false, true, 0.0), state(listOf(record("2026-11-26T13:00:00Z", 20))))
    }

    @Test
    fun `o dia vale no fuso de Sao Paulo, nao em UTC`() {
        // 02:30Z ainda e 23:30 do dia 24 em Sao Paulo: nao conta como hoje.
        assertEquals(FlowerState(0, true, false, 0.0), state(listOf(record("2026-11-25T02:30:00Z", 20))))
    }

    @Test
    fun `etapas do tomate batem com o site`() {
        val expected = listOf(1.0 to 0, 0.95 to 0, 0.9 to 0, 0.8 to 1, 0.7 to 2, 0.55 to 3, 0.5 to 4, 0.3 to 5, 0.2 to 6, 0.1 to 7, 0.05 to 7, 0.001 to 7, 0.0 to 8)
        expected.forEach { (fraction, stage) -> assertEquals("fracao $fraction", stage, Pomodoro.tomatoStage(fraction)) }
    }

    @Test
    fun `cronometro soma o tempo corrido e pausa guarda`() {
        val running = Stopwatch.start(StopwatchState(), 1_000)
        assertEquals(5_000L, running.elapsedAt(6_000))
        val paused = Stopwatch.pause(running, 11_000)
        assertFalse(paused.running)
        assertEquals(10_000L, paused.elapsedAt(999_999))
        assertEquals(10_000L, Stopwatch.start(paused, 50_000).elapsedAt(50_000))
    }

    @Test
    fun `concluir grava minutos arredondados e pelo menos 1`() {
        assertEquals(1, Stopwatch.recordedMinutes(1_000))
        assertEquals(1, Stopwatch.recordedMinutes(29_000))
        assertEquals(1, Stopwatch.recordedMinutes(30_000))
        assertEquals(2, Stopwatch.recordedMinutes(90_000))
        assertEquals(25, Stopwatch.recordedMinutes(25 * 60_000L))
        assertTrue(Stopwatch.canFinish(1_000))
        assertFalse(Stopwatch.canFinish(999))
    }
}
