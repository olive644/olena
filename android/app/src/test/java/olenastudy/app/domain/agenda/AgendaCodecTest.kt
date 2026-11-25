package olenastudy.app.domain.agenda

import olenastudy.app.data.agenda.AgendaCodec
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AgendaCodecTest {
    private val event = StudyEvent(
        id = "a1", title = "Revisar Enem", subjectId = "mat", date = "2026-11-02", time = "09:30",
        durationMinutes = 45, recurrenceFrequency = Recurrence.weekly, recurrenceDays = listOf(1, 3),
    )

    @Test
    fun `ida e volta mantem tudo igual`() {
        assertEquals(listOf(event), AgendaCodec.decode(AgendaCodec.encode(listOf(event))))
    }

    @Test
    fun `texto ausente, vazio ou quebrado vira lista vazia`() {
        assertTrue(AgendaCodec.decode(null).isEmpty())
        assertTrue(AgendaCodec.decode("").isEmpty())
        assertTrue(AgendaCodec.decode("{ nao e json").isEmpty())
        assertTrue(AgendaCodec.decode("""[{"id":1}]""").isEmpty())
    }

    @Test
    fun `campos que o app ainda nao conhece sao ignorados`() {
        val json = """[{"id":"x","title":"t","date":"2026-11-02","guests":["a@b.c"],"timeZone":"America/Sao_Paulo","reminders":[10]}]"""
        val decoded = AgendaCodec.decode(json)
        assertEquals(1, decoded.size)
        assertEquals("x", decoded[0].id)
        assertEquals("09:00", decoded[0].time)
    }
}
