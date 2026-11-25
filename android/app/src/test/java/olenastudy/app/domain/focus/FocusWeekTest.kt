package olenastudy.app.domain.focus

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class FocusWeekTest {
    private val zone = ZoneId.of("America/Sao_Paulo")

    @Test
    fun `a semana comeca na segunda-feira e tem sete dias`() {
        // 25/11/2026 e uma quarta-feira.
        val days = FocusWeek.days(LocalDate.of(2026, 11, 25))
        assertEquals(LocalDate.of(2026, 11, 23), days.first())
        assertEquals(LocalDate.of(2026, 11, 29), days.last())
        assertEquals(7, days.size)
    }

    @Test
    fun `domingo ainda pertence a semana que comecou na segunda anterior`() {
        assertEquals(LocalDate.of(2026, 11, 23), FocusWeek.days(LocalDate.of(2026, 11, 29)).first())
    }

    @Test
    fun `as letras sao as do site`() {
        assertEquals("STQQSSD", FocusWeek.LABELS)
    }

    @Test
    fun `so foco de pomodoro acende o tomate, no dia do fuso local`() {
        val records = listOf(
            FocusRecord(Instant.parse("2026-11-24T15:00:00Z").toEpochMilli(), 25, "pomodoro"),
            FocusRecord(Instant.parse("2026-11-25T15:00:00Z").toEpochMilli(), 30, "timer"),
            // 02:30Z ainda e 23:30 do dia 25 em Sao Paulo.
            FocusRecord(Instant.parse("2026-11-26T02:30:00Z").toEpochMilli(), 25, "pomodoro"),
        )
        assertEquals(setOf(LocalDate.of(2026, 11, 24), LocalDate.of(2026, 11, 25)), FocusWeek.activeDays(records, zone))
    }

    @Test
    fun `duracao legivel como no site`() {
        assertEquals("25 min", FocusWeek.formatDuration(25))
        assertEquals("1 h", FocusWeek.formatDuration(60))
        assertEquals("1 h 5 min", FocusWeek.formatDuration(65))
        assertEquals("5 min", FocusWeek.formatDuration(5))
    }
}
