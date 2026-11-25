package olenastudy.app.domain.agenda

import olenastudy.app.domain.agenda.Recurrence.daily
import olenastudy.app.domain.agenda.Recurrence.monthly
import olenastudy.app.domain.agenda.Recurrence.weekly
import olenastudy.app.domain.agenda.Recurrence.yearly
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Paridade com o site: os resultados esperados saíram de rodar `startsOn`, `occurrenceOn` e
 * `eventSpan` de src/domain/agenda-calendar.ts em 25/11/2026. Se o site mudar a regra, estes
 * números mudam junto, e o app precisa acompanhar.
 */
class AgendaParityTest {
    private fun event(
        date: String,
        time: String = "09:00",
        recurrence: Recurrence = Recurrence.none,
        interval: Int = 1,
        days: List<Int> = emptyList(),
        until: String? = null,
        excluded: List<String> = emptyList(),
        duration: Int = 30,
        endDate: String? = null,
    ) = StudyEvent("e", "t", "s", date, time, duration, recurrence, interval, days, until, excluded, endDate)

    private fun assertStarts(event: StudyEvent, vararg expected: Pair<String, Boolean>) =
        expected.forEach { (date, value) -> assertEquals("startsOn $date", value, Agenda.startsOn(event, date)) }

    private fun assertOccurrence(event: StudyEvent, vararg expected: Pair<String, String?>) =
        expected.forEach { (date, value) -> assertEquals("occurrenceOn $date", value, Agenda.occurrenceOn(event, date)) }

    @Test
    fun `sem repeticao so cai no proprio dia`() {
        val e = event("2026-11-02")
        assertStarts(e, "2026-11-02" to true, "2026-11-03" to false, "2026-11-01" to false)
        assertEquals(0, Agenda.span(e))
    }

    @Test
    fun `diario cai todo dia a partir do primeiro`() {
        assertStarts(event("2026-11-02", recurrence = daily), "2026-11-02" to true, "2026-11-03" to true, "2026-11-30" to true, "2026-11-01" to false)
    }

    @Test
    fun `diario a cada 3 dias`() {
        assertStarts(event("2026-11-02", recurrence = daily, interval = 3), "2026-11-05" to true, "2026-11-06" to false, "2026-11-08" to true)
    }

    @Test
    fun `semanal repete no mesmo dia da semana`() {
        assertStarts(event("2026-11-02", recurrence = weekly), "2026-11-09" to true, "2026-11-10" to false, "2026-11-16" to true)
    }

    @Test
    fun `semanal a cada 2 semanas em segunda e quarta`() {
        val e = event("2026-11-02", recurrence = weekly, interval = 2, days = listOf(1, 3))
        assertStarts(e, "2026-11-04" to true, "2026-11-09" to false, "2026-11-16" to true, "2026-11-18" to true, "2026-11-11" to false)
    }

    @Test
    fun `mensal do dia 31 so cai nos meses com 31 dias, como no site`() {
        assertStarts(event("2026-01-31", recurrence = monthly), "2026-02-28" to false, "2026-03-31" to true, "2026-04-30" to false)
    }

    @Test
    fun `mensal repete no mesmo dia do mes`() {
        assertStarts(event("2026-11-02", recurrence = monthly), "2026-12-02" to true, "2027-01-02" to true, "2026-12-03" to false)
    }

    @Test
    fun `anual de 29 de fevereiro so cai em ano bissexto`() {
        assertStarts(event("2024-02-29", recurrence = yearly), "2025-02-28" to false, "2028-02-29" to true, "2025-03-01" to false)
    }

    @Test
    fun `fim da repeticao e datas excluidas valem`() {
        val e = event("2026-11-02", recurrence = daily, until = "2026-11-04", excluded = listOf("2026-11-03"))
        assertStarts(e, "2026-11-03" to false, "2026-11-04" to true, "2026-11-05" to false)
    }

    @Test
    fun `compromisso que passa da meia-noite ocupa o dia seguinte`() {
        val e = event("2026-11-02", time = "23:30", duration = 90)
        assertEquals(1, Agenda.span(e))
        assertStarts(e, "2026-11-02" to true, "2026-11-03" to false, "2026-11-04" to false)
        assertOccurrence(e, "2026-11-02" to "2026-11-02", "2026-11-03" to "2026-11-02", "2026-11-04" to null)
    }

    @Test
    fun `data final faz o compromisso cobrir varios dias`() {
        val e = event("2026-11-02", endDate = "2026-11-04")
        assertEquals(2, Agenda.span(e))
        assertOccurrence(e, "2026-11-03" to "2026-11-02", "2026-11-04" to "2026-11-02", "2026-11-05" to null)
    }

    @Test
    fun `data invalida nunca quebra e nunca cai`() {
        val e = event("2026-11-02")
        assertEquals(false, Agenda.startsOn(e, "2026-02-30"))
        assertEquals(false, Agenda.startsOn(e, "ontem"))
        assertEquals(false, Agenda.startsOn(event("2026-13-01"), "2026-11-02"))
    }

    @Test
    fun `os compromissos do dia saem em ordem de horario`() {
        val a = event("2026-11-02", time = "14:00").copy(id = "a", title = "Tarde")
        val b = event("2026-11-02", time = "08:30").copy(id = "b", title = "Manha")
        val c = event("2026-11-03", time = "07:00").copy(id = "c", title = "Outro dia")
        assertEquals(listOf("b", "a"), Agenda.eventsOn(listOf(a, b, c), "2026-11-02").map { it.id })
    }
}
