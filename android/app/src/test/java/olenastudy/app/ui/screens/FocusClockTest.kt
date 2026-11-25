package olenastudy.app.ui.screens

import org.junit.Assert.assertEquals
import org.junit.Test

class FocusClockTest {
    @Test
    fun `formata minutos e segundos`() {
        assertEquals("25:00", formatClock(25 * 60_000L))
        assertEquals("00:59", formatClock(59_000))
        assertEquals("00:00", formatClock(0))
    }

    @Test
    fun `arredonda para cima e nunca mostra negativo`() {
        assertEquals("00:01", formatClock(400))
        assertEquals("00:00", formatClock(-5_000))
    }

    @Test
    fun `passa de uma hora com horas`() {
        assertEquals("1:05:00", formatClock(65 * 60_000L))
        assertEquals("99:59:59", formatClock((99 * 3600 + 59 * 60 + 59) * 1000L))
    }
}
